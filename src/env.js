// Piece 3 — light, glazing, loggia, exterior. Owns renderer look (tone mapping, post).
import * as THREE from 'three';

export function build(ctx) {
  const { scene } = ctx;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cbb8, 1.2));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.0);
  sun.position.set(14, 18, 22);
  sun.target.position.set(6, 0, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
  scene.add(sun, sun.target);
}
