import * as THREE from 'three';
import { cellRadii } from '../biology/betaCellModel';

export function createBetaCellShell(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(1, 64, 32);
  geometry.scale(cellRadii.x, cellRadii.y, cellRadii.z);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x5aa7ff,
    transparent: true,
    opacity: 0.18,
    roughness: 0.65,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  return new THREE.Mesh(geometry, material);
}
