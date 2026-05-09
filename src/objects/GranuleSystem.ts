import * as THREE from 'three';
import { cellRadii, granuleCount, nucleusPosition, nucleusRadius } from '../biology/betaCellModel';

const GRANULE_STRIDE = 3;
const NUCLEUS_CLEARANCE = 1.0;
const MAX_INITIAL_PLACEMENT_ATTEMPTS = 10_000;

export class GranuleSystem extends THREE.Group {
  private readonly shellMesh: THREE.InstancedMesh;
  private readonly haloMesh: THREE.InstancedMesh;
  private readonly coreMesh: THREE.InstancedMesh;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly scales: Float32Array;
  private readonly dummy = new THREE.Object3D();
  private readonly granuleTotal: number;

  public constructor(total = granuleCount) {
    super();

    this.granuleTotal = total;
    this.positions = new Float32Array(total * GRANULE_STRIDE);
    this.velocities = new Float32Array(total * GRANULE_STRIDE);
    this.scales = new Float32Array(total);

    const shellGeometry = new THREE.SphereGeometry(0.26, 16, 8);
    const haloGeometry = new THREE.SphereGeometry(0.20, 16, 8);
    const coreGeometry = new THREE.SphereGeometry(0.12, 16, 8);

    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdca3,
      transparent: true,
      opacity: 0.28,
      roughness: 0.6,
      depthWrite: false
    });

    const haloMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      transparent: true,
      opacity: 0.42,
      roughness: 0.6,
      depthWrite: false
    });

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb000,
      roughness: 0.45
    });

    this.shellMesh = new THREE.InstancedMesh(shellGeometry, shellMaterial, total);
    this.haloMesh = new THREE.InstancedMesh(haloGeometry, haloMaterial, total);
    this.coreMesh = new THREE.InstancedMesh(coreGeometry, coreMaterial, total);

    this.name = 'Insulin granule system';
    this.shellMesh.name = 'Insulin granule vesicle shells';
    this.haloMesh.name = 'Insulin granule halos';
    this.coreMesh.name = 'Dense insulin cores';

    this.shellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.haloMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.add(this.shellMesh, this.haloMesh, this.coreMesh);
    this.initializeGranules();
  }

  public update(deltaTime: number): void {
    const speed = deltaTime * 60.0;
    const driftJitter = deltaTime * 0.012;
    const maxVelocity = 0.028;

    for (let index = 0; index < this.granuleTotal; index += 1) {
      const offset = index * GRANULE_STRIDE;

      let velocityX = this.velocities[offset] + (Math.random() - 0.5) * driftJitter;
      let velocityY = this.velocities[offset + 1] + (Math.random() - 0.5) * driftJitter;
      let velocityZ = this.velocities[offset + 2] + (Math.random() - 0.5) * driftJitter;

      velocityX = THREE.MathUtils.clamp(velocityX, -maxVelocity, maxVelocity);
      velocityY = THREE.MathUtils.clamp(velocityY, -maxVelocity, maxVelocity);
      velocityZ = THREE.MathUtils.clamp(velocityZ, -maxVelocity, maxVelocity);

      let x = this.positions[offset] + velocityX * speed;
      let y = this.positions[offset + 1] + velocityY * speed;
      let z = this.positions[offset + 2] + velocityZ * speed;

      if (!this.isInsideAllowedVolume(x, y, z)) {
        velocityX *= -1;
        velocityY *= -1;
        velocityZ *= -1;
        x += velocityX * speed * 2.0;
        y += velocityY * speed * 2.0;
        z += velocityZ * speed * 2.0;
      }

      this.velocities[offset] = velocityX;
      this.velocities[offset + 1] = velocityY;
      this.velocities[offset + 2] = velocityZ;
      this.positions[offset] = x;
      this.positions[offset + 1] = y;
      this.positions[offset + 2] = z;

      this.updateInstance(index, x, y, z);
    }

    this.shellMesh.instanceMatrix.needsUpdate = true;
    this.haloMesh.instanceMatrix.needsUpdate = true;
    this.coreMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.shellMesh.geometry.dispose();
    this.haloMesh.geometry.dispose();
    this.coreMesh.geometry.dispose();
    this.disposeMaterial(this.shellMesh.material);
    this.disposeMaterial(this.haloMesh.material);
    this.disposeMaterial(this.coreMesh.material);
  }

  private initializeGranules(): void {
    for (let index = 0; index < this.granuleTotal; index += 1) {
      this.randomizePosition(index);

      const offset = index * GRANULE_STRIDE;
      this.velocities[offset] = (Math.random() - 0.5) * 0.025;
      this.velocities[offset + 1] = (Math.random() - 0.5) * 0.025;
      this.velocities[offset + 2] = (Math.random() - 0.5) * 0.025;
      this.scales[index] = 0.75 + Math.random() * 0.55;

      this.updateInstance(
        index,
        this.positions[offset],
        this.positions[offset + 1],
        this.positions[offset + 2]
      );
    }

    this.shellMesh.instanceMatrix.needsUpdate = true;
    this.haloMesh.instanceMatrix.needsUpdate = true;
    this.coreMesh.instanceMatrix.needsUpdate = true;
  }

  private randomizePosition(index: number): void {
    const offset = index * GRANULE_STRIDE;

    for (let attempt = 0; attempt < MAX_INITIAL_PLACEMENT_ATTEMPTS; attempt += 1) {
      const x = (Math.random() * 2 - 1) * cellRadii.x;
      const y = (Math.random() * 2 - 1) * cellRadii.y;
      const z = (Math.random() * 2 - 1) * cellRadii.z;

      if (this.isInsideAllowedVolume(x, y, z)) {
        this.positions[offset] = x;
        this.positions[offset + 1] = y;
        this.positions[offset + 2] = z;
        return;
      }
    }

    this.positions[offset] = cellRadii.x * 0.5;
    this.positions[offset + 1] = 0;
    this.positions[offset + 2] = 0;
  }

  private updateInstance(index: number, x: number, y: number, z: number): void {
    this.dummy.position.set(x, y, z);
    this.dummy.scale.setScalar(this.scales[index]);
    this.dummy.updateMatrix();

    this.shellMesh.setMatrixAt(index, this.dummy.matrix);
    this.haloMesh.setMatrixAt(index, this.dummy.matrix);
    this.coreMesh.setMatrixAt(index, this.dummy.matrix);
  }

  private isInsideAllowedVolume(x: number, y: number, z: number): boolean {
    const cellNormalized =
      (x * x) / (cellRadii.x * cellRadii.x) +
      (y * y) / (cellRadii.y * cellRadii.y) +
      (z * z) / (cellRadii.z * cellRadii.z);

    if (cellNormalized > 1.0) {
      return false;
    }

    const nucleusDistanceX = x - nucleusPosition.x;
    const nucleusDistanceY = y - nucleusPosition.y;
    const nucleusDistanceZ = z - nucleusPosition.z;
    const minNucleusDistance = nucleusRadius + NUCLEUS_CLEARANCE;

    return (
      nucleusDistanceX * nucleusDistanceX +
        nucleusDistanceY * nucleusDistanceY +
        nucleusDistanceZ * nucleusDistanceZ >
      minNucleusDistance * minNucleusDistance
    );
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }

    material.dispose();
  }
}
