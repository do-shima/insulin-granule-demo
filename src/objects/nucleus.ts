import * as THREE from 'three';
import { nucleusPosition, nucleusRadius } from '../biology/betaCellModel';

export function createNucleus(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(nucleusRadius, 48, 24);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x8b5cf6,
    transparent: true,
    opacity: 0.32,
    roughness: 0.8,
    depthWrite: false
  });

  const nucleus = new THREE.Mesh(geometry, material);
  nucleus.position.copy(nucleusPosition);

  return nucleus;
}
