import * as THREE from 'three';
import {
  isInsideEllipsoid,
  isOutsideNucleus as isPointOutsideNucleus,
  randomPointInsideEllipsoid
} from './betaCellGeometry';

export const cellRadii = {
  x: 17.5,
  y: 11.0,
  z: 14.0
} as const;

export const nucleusPosition = new THREE.Vector3(-4.0, 0.0, 0.0);
export const nucleusRadius = 4.2;
export const granuleCount = 800;
export const nucleusExclusionMargin = 1.0;

export function isInsideCell(point: THREE.Vector3): boolean {
  return isInsideEllipsoid(point, cellRadii);
}

export function isOutsideNucleus(point: THREE.Vector3): boolean {
  return isPointOutsideNucleus(point, nucleusPosition, nucleusRadius, nucleusExclusionMargin);
}

export function randomPointInCell(): THREE.Vector3 {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const point = randomPointInsideEllipsoid(cellRadii);

    if (isOutsideNucleus(point)) {
      return point;
    }
  }

  return new THREE.Vector3(0, 0, 0);
}
