import * as THREE from 'three';

export function createMembraneRing(): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(12.2, 0.035, 8, 160);
  const material = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.45
  });

  const membraneRing = new THREE.Mesh(geometry, material);
  membraneRing.rotation.x = Math.PI / 2;
  membraneRing.scale.set(1.45, 1.15, 1);

  return membraneRing;
}
