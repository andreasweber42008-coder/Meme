import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as plan from './plan.js';

// Each piece of the flat lives in its own module with build(ctx). A piece
// that throws is logged and skipped so the rest of the flat still loads.
const PIECES = ['shell', 'env', 'living', 'kitchen', 'bedrooms', 'wetrooms'];

const params = new URLSearchParams(location.search);
const SHOT = params.has('shot');
if (SHOT) document.body.classList.add('shot');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: SHOT });
renderer.setPixelRatio(SHOT ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe7ee);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 400);
camera.rotation.order = 'YXZ';

// Ceilings go in their own group so the top-down plan view can hide them.
const groups = { ceiling: new THREE.Group(), exterior: new THREE.Group() };
groups.ceiling.name = 'ceiling';
groups.exterior.name = 'exterior';
scene.add(groups.ceiling, groups.exterior);

const colliders = []; // plan-px rects the walker cannot enter
const pending = [];
const ctx = {
  THREE, scene, camera, renderer, plan, groups, params, shot: SHOT,
  addCollider: (rect) => colliders.push(rect),
  waitFor: (p) => { pending.push(p); return p; },
  // A piece may replace the render function (e.g. post-processing).
  render: () => renderer.render(scene, camera),
  onResize: [],
  onFrame: [],
};
window.__ctx = ctx;

const pieceStatus = {};
for (const name of PIECES) {
  try {
    const mod = await import(`./${name}.js`);
    await mod.build(ctx);
    pieceStatus[name] = 'ok';
  } catch (e) {
    console.error(`piece ${name} failed`, e);
    pieceStatus[name] = String(e && e.message || e);
  }
}
window.__pieces = pieceStatus;

for (const w of plan.WALLS) colliders.push(w);

// ---------- views ----------
const toWorld = (px, py) => new THREE.Vector3(plan.X(px), 0, plan.Z(py));
function setView(name) {
  const v = plan.VIEWS[name];
  if (!v) return;
  const p = toWorld(...v.pos);
  camera.position.set(p.x, v.eye, p.z);
  camera.rotation.set(THREE.MathUtils.degToRad(v.pitch || 0), THREE.MathUtils.degToRad(-v.dir), 0);
  camera.fov = v.fov || 60;
  camera.updateProjectionMatrix();
}

let activeCamera = camera;
const viewName = params.get('view') || 'wohnen';
if (viewName === 'top') {
  // Orthographic top-down view framed exactly like ref/plan.png, so a
  // screenshot at 1381x1284 overlays the plan pixel for pixel.
  const W = 1381, H = 1284;
  const ortho = new THREE.OrthographicCamera(
    plan.X(0), plan.X(W), -plan.Z(0), -plan.Z(H), 0.1, 100);
  ortho.position.set(0, 50, 0);
  ortho.up.set(0, 0, -1);
  ortho.lookAt(0, 0, 0);
  // With up = -Z the frustum's top maps to -Z (north) as in the plan.
  ortho.top = -plan.Z(0); ortho.bottom = -plan.Z(H);
  ortho.updateProjectionMatrix();
  groups.ceiling.visible = false;
  activeCamera = ortho;
  ctx.render = () => renderer.render(scene, ortho);
} else {
  setView(viewName);
}
if (params.get('hide')) for (const g of params.get('hide').split(',')) if (groups[g]) groups[g].visible = false;
ctx.activeCamera = activeCamera;

// ---------- HUD ----------
const hud = document.getElementById('hud');
for (const [key, v] of Object.entries(plan.VIEWS)) {
  const b = document.createElement('button');
  b.textContent = v.label;
  b.onclick = (e) => { e.stopPropagation(); setView(key); };
  hud.appendChild(b);
}
const roomEl = document.getElementById('room');
function currentRoom() {
  // nearest labelled room centre is good enough for a HUD hint
  const px = camera.position.x / plan.S + plan.ORIGIN.x;
  const py = camera.position.z / plan.S + plan.ORIGIN.y;
  let best = null, bd = Infinity;
  for (const r of Object.values(plan.ROOMS)) {
    const d = (r.center[0] - px) ** 2 + (r.center[1] - py) ** 2;
    if (d < bd) { bd = d; best = r; }
  }
  return best ? `${best.name} · ca. ${best.area} m²` : '';
}

// ---------- walking ----------
const controls = new PointerLockControls(camera, renderer.domElement);
const help = document.getElementById('help');
help.addEventListener('click', () => controls.lock());
renderer.domElement.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => (help.style.display = 'none'));
controls.addEventListener('unlock', () => (help.style.display = ''));

const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));
for (const b of document.querySelectorAll('#pad button')) {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(b.dataset.k); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => keys.delete(b.dataset.k));
}
// touch look: drag on the canvas
let lastTouch = null;
renderer.domElement.addEventListener('touchstart', (e) => { lastTouch = e.touches[0]; }, { passive: true });
renderer.domElement.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  if (lastTouch) {
    camera.rotation.y += (t.clientX - lastTouch.clientX) * 0.005;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + (t.clientY - lastTouch.clientY) * 0.005, -1.4, 1.4);
  }
  lastTouch = t;
}, { passive: true });

const RADIUS = 0.22; // m
function blocked(x, z) {
  const px = x / plan.S + plan.ORIGIN.x, py = z / plan.S + plan.ORIGIN.y, r = RADIUS / plan.S;
  for (const [x0, y0, x1, y1] of colliders) {
    if (px + r > x0 && px - r < x1 && py + r > y0 && py - r < y1) return true;
  }
  return false;
}
const clock = new THREE.Clock();
function step(dt) {
  const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.6 : 1.4) * dt;
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const turn = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  if (turn) camera.rotation.y -= turn * dt * 1.6;
  if (!f && !s) return;
  const yaw = camera.rotation.y;
  const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * s) * speed;
  const dz = (-Math.cos(yaw) * f - Math.sin(yaw) * s) * speed;
  const p = camera.position;
  if (!blocked(p.x + dx, p.z)) p.x += dx;
  if (!blocked(p.x, p.z + dz)) p.z += dz;
  if (camera.position.y > 2) camera.position.y = 1.6; // leave preset heights when walking
}

function resize() {
  const w = SHOT ? +(params.get('w') || innerWidth) : innerWidth;
  const h = SHOT ? +(params.get('h') || innerHeight) : innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  for (const f of ctx.onResize) f(w, h);
}
addEventListener('resize', resize);
resize();

await Promise.allSettled(pending);
await new Promise((res) => {
  const m = THREE.DefaultLoadingManager;
  if (!m.isLoading) return res();
  const prev = m.onLoad;
  m.onLoad = () => { prev && prev(); res(); };
  setTimeout(res, 20000);
});

let frames = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!SHOT) step(dt);
  for (const f of ctx.onFrame) f(dt);
  ctx.render();
  if (!SHOT && frames % 15 === 0) roomEl.textContent = currentRoom();
  frames++;
  if (SHOT && frames === 4) window.__ready = true;
  requestAnimationFrame(loop);
}
loop();
