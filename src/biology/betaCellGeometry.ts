import * as THREE from 'three';

export interface EllipsoidRadii {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type RandomSource = () => number;

const DEFAULT_RNG: RandomSource = Math.random;
const MAX_RANDOM_ATTEMPTS = 10_000;

export function ellipsoidLevel(point: THREE.Vector3, radii: EllipsoidRadii): number {
  // Ellipsoid implicit equation: x^2/a^2 + y^2/b^2 + z^2/c^2.
  // Values below 1 are inside, 1 is on the surface, above 1 is outside.
  return (
    (point.x * point.x) / (radii.x * radii.x) +
    (point.y * point.y) / (radii.y * radii.y) +
    (point.z * point.z) / (radii.z * radii.z)
  );
}

export function isInsideEllipsoid(point: THREE.Vector3, radii: EllipsoidRadii): boolean {
  return ellipsoidLevel(point, radii) <= 1.0;
}

export function projectToEllipsoidSurface(
  point: THREE.Vector3,
  radii: EllipsoidRadii
): THREE.Vector3 {
  const level = ellipsoidLevel(point, radii);

  if (level <= Number.EPSILON) {
    return new THREE.Vector3(radii.x, 0, 0);
  }

  return new THREE.Vector3(
    point.x / Math.sqrt(level),
    point.y / Math.sqrt(level),
    point.z / Math.sqrt(level)
  );
}

export function getEllipsoidNormal(
  pointOnSurface: THREE.Vector3,
  radii: EllipsoidRadii
): THREE.Vector3 {
  // The surface normal follows the gradient of the implicit ellipsoid equation.
  return new THREE.Vector3(
    pointOnSurface.x / (radii.x * radii.x),
    pointOnSurface.y / (radii.y * radii.y),
    pointOnSurface.z / (radii.z * radii.z)
  ).normalize();
}

export function randomPointInsideEllipsoid(
  radii: EllipsoidRadii,
  rng: RandomSource = DEFAULT_RNG
): THREE.Vector3 {
  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt += 1) {
    const x = (rng() * 2 - 1) * radii.x;
    const y = (rng() * 2 - 1) * radii.y;
    const z = (rng() * 2 - 1) * radii.z;
    const level =
      (x * x) / (radii.x * radii.x) +
      (y * y) / (radii.y * radii.y) +
      (z * z) / (radii.z * radii.z);

    if (level <= 1.0) {
      return new THREE.Vector3(x, y, z);
    }
  }

  return new THREE.Vector3(0, 0, 0);
}

export function randomPointNearMembrane(
  radii: EllipsoidRadii,
  distanceFromMembrane: number,
  rng: RandomSource = DEFAULT_RNG
): THREE.Vector3 {
  let directionX = 1;
  let directionY = 0;
  let directionZ = 0;

  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt += 1) {
    const x = rng() * 2 - 1;
    const y = rng() * 2 - 1;
    const z = rng() * 2 - 1;
    const lengthSquared = x * x + y * y + z * z;

    if (lengthSquared > Number.EPSILON && lengthSquared <= 1.0) {
      directionX = x;
      directionY = y;
      directionZ = z;
      break;
    }
  }

  const level =
    (directionX * directionX) / (radii.x * radii.x) +
    (directionY * directionY) / (radii.y * radii.y) +
    (directionZ * directionZ) / (radii.z * radii.z);
  const surfaceScale = 1 / Math.sqrt(level);
  const surfaceX = directionX * surfaceScale;
  const surfaceY = directionY * surfaceScale;
  const surfaceZ = directionZ * surfaceScale;
  const normalX = surfaceX / (radii.x * radii.x);
  const normalY = surfaceY / (radii.y * radii.y);
  const normalZ = surfaceZ / (radii.z * radii.z);
  const normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);

  return new THREE.Vector3(
    surfaceX - (normalX / normalLength) * distanceFromMembrane,
    surfaceY - (normalY / normalLength) * distanceFromMembrane,
    surfaceZ - (normalZ / normalLength) * distanceFromMembrane
  );
}

export function randomPointNearSecretionPole(
  radii: EllipsoidRadii,
  poleDirection: THREE.Vector3,
  spread: number,
  distanceFromMembrane: number,
  rng: RandomSource = DEFAULT_RNG
): THREE.Vector3 {
  const clampedSpread = Math.max(spread, 0.001);
  const direction = poleDirection.clone().normalize();

  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt += 1) {
    const candidate = new THREE.Vector3(
      direction.x + (rng() * 2 - 1) * clampedSpread,
      direction.y + (rng() * 2 - 1) * clampedSpread,
      direction.z + (rng() * 2 - 1) * clampedSpread
    );

    if (candidate.lengthSq() <= Number.EPSILON) {
      continue;
    }

    candidate.normalize();
    const surfacePoint = projectToEllipsoidSurface(candidate, radii);
    const normal = getEllipsoidNormal(surfacePoint, radii);

    return surfacePoint.addScaledVector(normal, -distanceFromMembrane);
  }

  return randomPointNearMembrane(radii, distanceFromMembrane, rng);
}

export function isOutsideNucleus(
  point: THREE.Vector3,
  nucleusPosition: THREE.Vector3,
  nucleusRadius: number,
  margin: number
): boolean {
  const x = point.x - nucleusPosition.x;
  const y = point.y - nucleusPosition.y;
  const z = point.z - nucleusPosition.z;
  const minDistance = nucleusRadius + margin;

  return x * x + y * y + z * z > minDistance * minDistance;
}
