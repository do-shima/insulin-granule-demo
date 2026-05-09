import * as THREE from 'three';

export interface NearestCapillaryData {
  readonly point: THREE.Vector3;
  readonly distance: number;
  readonly pathIndex: number;
  readonly t: number;
}

export interface IsletCellModel {
  readonly id: number;
  readonly center: THREE.Vector3;
  readonly radii: THREE.Vector3;
  readonly nearestCapillaryPoint: THREE.Vector3;
  readonly capillaryDistance: number;
  readonly polarityDirection: THREE.Vector3;
  readonly hasSingleCapillaryContact: boolean;
  readonly hasMultipleCapillaryContacts: boolean;
  readonly rotation: THREE.Euler;
  readonly color: THREE.Color;
}

export type NearestCapillaryResolver = (position: THREE.Vector3) => NearestCapillaryData;

export function createIsletCellModels(
  sampledCapillaryPoints: readonly THREE.Vector3[],
  getNearestCapillaryPointData: NearestCapillaryResolver,
  count = 48,
  rng: () => number = createSeededRng(3817)
): IsletCellModel[] {
  const cells: IsletCellModel[] = [];
  const clampedCount = Math.min(Math.max(Math.floor(count), 30), 60);

  for (let id = 0; id < clampedCount; id += 1) {
    const anchor = sampledCapillaryPoints[(id * 11 + Math.floor(rng() * 17)) % sampledCapillaryPoints.length];
    const center = anchor.clone().add(createOffsetFromCapillary(id, rng));
    const nearest = getNearestCapillaryPointData(center);
    const polarityDirection = nearest.point.clone().sub(center).normalize();
    const nearbyContactCount = countNearbyCapillarySamples(center, sampledCapillaryPoints, 2.9);
    const contactCount = Math.max(nearbyContactCount, nearest.distance < 2.9 ? 1 : 0);

    cells.push({
      id,
      center,
      radii: new THREE.Vector3(
        1.15 + rng() * 0.45,
        0.82 + rng() * 0.32,
        0.95 + rng() * 0.4
      ),
      nearestCapillaryPoint: nearest.point,
      capillaryDistance: nearest.distance,
      polarityDirection,
      hasSingleCapillaryContact: contactCount === 1,
      hasMultipleCapillaryContacts: contactCount > 1,
      rotation: new THREE.Euler(
        (rng() - 0.5) * 0.75,
        rng() * Math.PI * 2,
        (rng() - 0.5) * 0.75
      ),
      color: createCellColor(rng)
    });
  }

  return cells;
}

function createOffsetFromCapillary(index: number, rng: () => number): THREE.Vector3 {
  const angle = index * 2.399963 + rng() * 0.75;
  const radius = 2.25 + rng() * 3.8;
  const verticalBias = -0.4 + rng() * 2.8;

  return new THREE.Vector3(
    Math.cos(angle) * radius,
    verticalBias,
    Math.sin(angle) * radius * 0.82
  );
}

function countNearbyCapillarySamples(
  center: THREE.Vector3,
  sampledCapillaryPoints: readonly THREE.Vector3[],
  contactDistance: number
): number {
  const contactDistanceSquared = contactDistance * contactDistance;
  const stride = 12;
  let count = 0;

  for (let index = 0; index < sampledCapillaryPoints.length; index += stride) {
    if (center.distanceToSquared(sampledCapillaryPoints[index]) <= contactDistanceSquared) {
      count += 1;

      if (count > 1) {
        return count;
      }
    }
  }

  return count;
}

function createCellColor(rng: () => number): THREE.Color {
  const color = new THREE.Color(0x7dd3fc);
  color.offsetHSL((rng() - 0.5) * 0.05, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.08);

  return color;
}

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;

    return state / 0x100000000;
  };
}
