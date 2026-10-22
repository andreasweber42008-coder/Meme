import * as THREE from 'three';
import { X, Z, len } from './plan.js';

// Axis-aligned box from a plan rect (px) between heights y0..y1 (m).
export function boxFromRect([x0, z0, x1, z1], y0, y1, material) {
  const w = len(x1 - x0), d = len(z1 - z0), h = y1 - y0;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set((X(x0) + X(x1)) / 2, (y0 + y1) / 2, (Z(z0) + Z(z1)) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Centre / size in metres of a plan rect, handy for placing furniture.
export function rectInfo([x0, z0, x1, z1]) {
  return {
    cx: (X(x0) + X(x1)) / 2,
    cz: (Z(z0) + Z(z1)) / 2,
    w: len(x1 - x0), // along X (east-west)
    d: len(z1 - z0), // along Z (north-south)
    x0: X(x0), x1: X(x1), z0: Z(z0), z1: Z(z1),
  };
}

// Canvas-backed texture. draw(ctx, w, h) paints it.
export function canvasTexture(w, h, draw, { srgb = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

// Small deterministic PRNG so procedural textures look the same every run
// (screenshots must be reproducible for the critic loop).
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shadowAll(obj, cast = true, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; }
  });
  return obj;
}
