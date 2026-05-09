import * as THREE from 'three';
import {
  isOutsideNucleus,
  randomPointInsideEllipsoid
} from '../biology/betaCellGeometry';
import {
  cellRadii,
  nucleusExclusionMargin,
  nucleusPosition,
  nucleusRadius
} from '../biology/betaCellModel';

const MITOCHONDRIA_COUNT = 10;
const MAX_PLACEMENT_ATTEMPTS = 10_000;

export class Mitochondria extends THREE.Group {
  private readonly mesh: THREE.InstancedMesh;
  private readonly geometry: THREE.SphereGeometry;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly dummy = new THREE.Object3D();

  public constructor(count = MITOCHONDRIA_COUNT) {
    super();

    this.name = 'Schematic mitochondria';
    this.geometry = new THREE.SphereGeometry(1, 24, 12);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.24,
      roughness: 0.75,
      metalness: 0.0,
      depthWrite: false
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    this.mesh.name = 'Mitochondrial ellipsoids';
    this.add(this.mesh);

    for (let index = 0; index < count; index += 1) {
      this.placeMitochondrion(index);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private placeMitochondrion(index: number): void {
    const position = this.randomAllowedPosition();

    this.dummy.position.copy(position);
    this.dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    this.dummy.scale.set(0.42 + Math.random() * 0.22, 0.18 + Math.random() * 0.08, 1.05 + Math.random() * 0.45);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
  }

  private randomAllowedPosition(): THREE.Vector3 {
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const point = randomPointInsideEllipsoid(cellRadii);

      if (isOutsideNucleus(point, nucleusPosition, nucleusRadius, nucleusExclusionMargin + 0.8)) {
        return point;
      }
    }

    return new THREE.Vector3(cellRadii.x * 0.35, 0, 0);
  }
}
