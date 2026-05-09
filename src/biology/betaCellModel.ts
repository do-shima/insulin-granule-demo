import * as THREE from 'three';

export const cellRadii = {
  x: 17.5,
  y: 11.0,
  z: 14.0
} as const;

export const nucleusPosition = new THREE.Vector3(-4.0, 0.0, 0.0);
export const nucleusRadius = 4.2;
export const granuleCount = 500;

export function isInsideCell(point: THREE.Vector3): boolean {
  const normalized =
    (point.x * point.x) / (cellRadii.x * cellRadii.x) +
    (point.y * point.y) / (cellRadii.y * cellRadii.y) +
    (point.z * point.z) / (cellRadii.z * cellRadii.z);

  return normalized <= 1.0;
}

export function isOutsideNucleus(point: THREE.Vector3): boolean {
  return point.distanceTo(nucleusPosition) > nucleusRadius + 1.0;
}

export function randomPointInCell(): THREE.Vector3 {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const point = new THREE.Vector3(
      (Math.random() * 2 - 1) * cellRadii.x,
      (Math.random() * 2 - 1) * cellRadii.y,
      (Math.random() * 2 - 1) * cellRadii.z
    );

    if (isInsideCell(point) && isOutsideNucleus(point)) {
      return point;
    }
  }

  return new THREE.Vector3(0, 0, 0);
}
