import * as THREE from 'three';
import {
  getEllipsoidNormal,
  projectToEllipsoidSurface
} from '../biology/betaCellGeometry';
import { cellRadii, secretionPoleDirection, secretionPoleSpread } from '../biology/betaCellModel';

const FORWARD = new THREE.Vector3(0, 0, 1);

export function createSecretionPoleMarker(): THREE.Mesh {
  const surfacePoint = projectToEllipsoidSurface(secretionPoleDirection, cellRadii);
  const normal = getEllipsoidNormal(surfacePoint, cellRadii);
  const radius = 1.5 + secretionPoleSpread * 3.0;
  const geometry = new THREE.TorusGeometry(radius, 0.025, 8, 96);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const marker = new THREE.Mesh(geometry, material);

  marker.name = 'Schematic secretion pole';
  marker.position.copy(surfacePoint).addScaledVector(normal, 0.12);
  marker.quaternion.setFromUnitVectors(FORWARD, normal);

  return marker;
}
