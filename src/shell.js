// Piece 0 — shell: walls, floor, ceiling, door openings, door leaves, skirting.
import * as THREE from 'three';
import { WALLS, LOW_WALLS, COLUMNS, DOORS, WINDOWS, CEILING, DOOR_H, X, Z, len } from './plan.js';
import { boxFromRect } from './util.js';

export const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.92 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.95 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xcfb08a, roughness: 0.6 }),
  door: new THREE.MeshStandardMaterial({ color: 0xf4f3f0, roughness: 0.5 }),
};

export function build(ctx) {
  const { scene, groups } = ctx;
  const g = new THREE.Group();
  g.name = 'shell';
  scene.add(g);

  for (const r of WALLS) g.add(boxFromRect(r, 0, CEILING, materials.wall));
  for (const { rect, h } of LOW_WALLS) {
    g.add(boxFromRect(rect, 0, h, materials.wall));
    ctx.addCollider(rect);
  }
  for (const c of COLUMNS) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(len(c.r), len(c.r), CEILING, 24), materials.wall);
    m.position.set(X(c.x), CEILING / 2, Z(c.y));
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    ctx.addCollider([c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r]);
  }

  // lintels above doors and windows
  for (const d of DOORS) g.add(boxFromRect(d.rect, DOOR_H, CEILING, materials.wall));
  for (const w of WINDOWS) {
    if (w.head < CEILING) g.add(boxFromRect(w.rect, w.head, CEILING, materials.wall));
    if (w.sill > 0) g.add(boxFromRect(w.rect, 0, w.sill, materials.wall));
  }

  // door leaves, open as drawn in the plan
  for (const d of DOORS) {
    const [hx, hy] = d.hinge, [ox, oy] = d.open;
    const w = Math.hypot(ox - hx, oy - hy) * (1 / 93.4);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, DOOR_H - 0.01, 0.04), materials.door);
    leaf.geometry.translate(w / 2, (DOOR_H - 0.01) / 2, 0);
    leaf.position.set(X(hx), 0, Z(hy));
    leaf.rotation.y = -Math.atan2(Z(oy) - Z(hy), X(ox) - X(hx));
    leaf.castShadow = leaf.receiveShadow = true;
    g.add(leaf);
  }

  // floor across the whole footprint (rooms may lay their own finish on top)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(len(1300), len(1200)), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(X(49 + 650), 0, Z(56 + 600));
  floor.receiveShadow = true;
  floor.name = 'floor';
  g.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(len(1300), len(1200)), materials.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(X(49 + 650), CEILING, Z(56 + 600));
  ceil.receiveShadow = true;
  groups.ceiling.add(ceil);
}
