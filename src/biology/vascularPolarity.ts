import * as THREE from 'three';

export interface CapillaryPathDefinition {
  readonly controlPoints: readonly THREE.Vector3[];
}

export const capillaryPathDefinitions: readonly CapillaryPathDefinition[] = [
  {
    controlPoints: [
      new THREE.Vector3(-9.5, -3.2, -1.2),
      new THREE.Vector3(-5.2, -3.9, 0.3),
      new THREE.Vector3(-0.8, -3.2, 1.4),
      new THREE.Vector3(4.2, -3.6, 0.2),
      new THREE.Vector3(9.5, -2.9, -1.0)
    ]
  },
  {
    controlPoints: [
      new THREE.Vector3(-3.0, -3.5, 0.9),
      new THREE.Vector3(-2.2, -1.4, 2.4),
      new THREE.Vector3(-0.8, 0.5, 2.7),
      new THREE.Vector3(1.2, 1.8, 1.9),
      new THREE.Vector3(3.2, 2.9, 0.8)
    ]
  },
  {
    controlPoints: [
      new THREE.Vector3(2.6, -3.4, 0.5),
      new THREE.Vector3(3.2, -1.8, -1.5),
      new THREE.Vector3(4.9, -0.2, -2.3),
      new THREE.Vector3(6.8, 1.1, -1.2)
    ]
  }
];
