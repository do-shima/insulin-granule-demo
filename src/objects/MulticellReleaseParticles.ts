import * as THREE from 'three';
import type { IsletCellModel } from '../biology/multicellModel';
import { getCellSurfacePoint } from './VascularContactPatches';

const PARTICLE_POOL_SIZE = 900;
const PARTICLES_PER_EVENT = 8;
const PARTICLE_LIFETIME = 1.45;

export interface MulticellReleaseEvent {
  readonly cellId: number;
  readonly vascularFacing: boolean;
  readonly position: THREE.Vector3;
}

export class MulticellReleaseParticles extends THREE.Group {
  private readonly particleGeometry = new THREE.SphereGeometry(0.055, 8, 4);
  private readonly particleMaterial = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.76,
    depthWrite: false
  });
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly active = new Uint8Array(PARTICLE_POOL_SIZE);
  private readonly ages = new Float32Array(PARTICLE_POOL_SIZE);
  private readonly positions = new Float32Array(PARTICLE_POOL_SIZE * 3);
  private readonly velocities = new Float32Array(PARTICLE_POOL_SIZE * 3);
  private readonly scales = new Float32Array(PARTICLE_POOL_SIZE);
  private readonly dummy = new THREE.Object3D();
  private readonly tangentA = new THREE.Vector3();
  private readonly tangentB = new THREE.Vector3();
  private readonly upReference = new THREE.Vector3(0, 1, 0);
  private readonly rightReference = new THREE.Vector3(1, 0, 0);
  private readonly cells: readonly IsletCellModel[];
  private stimulationLevel = 0.15;
  private particleCursor = 0;
  private eventHandler: ((event: MulticellReleaseEvent) => void) | undefined;

  public constructor(cells: readonly IsletCellModel[]) {
    super();
    this.name = 'Schematic multicell vascular-facing release particles';
    this.cells = cells;

    this.particleMesh = new THREE.InstancedMesh(
      this.particleGeometry,
      this.particleMaterial,
      PARTICLE_POOL_SIZE
    );
    this.particleMesh.name = 'schematic multicell release event particles';
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.particleMesh);
    this.hideAllParticles();
  }

  public setStimulationLevel(value: number): void {
    this.stimulationLevel = Math.min(Math.max(value, 0), 1);
  }

  public setEventHandler(handler: (event: MulticellReleaseEvent) => void): void {
    this.eventHandler = handler;
  }

  public setParticlesVisible(value: boolean): void {
    this.particleMesh.visible = value;
  }

  public update(deltaTime: number): void {
    this.maybeEmitReleaseEvent(deltaTime);
    this.updateParticles(deltaTime);
  }

  public resetEffects(): void {
    this.active.fill(0);
    this.hideAllParticles();
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }

  private maybeEmitReleaseEvent(deltaTime: number): void {
    const eventRatePerSecond = 0.18 + this.stimulationLevel * this.stimulationLevel * 3.8;

    if (Math.random() >= eventRatePerSecond * deltaTime) {
      return;
    }

    const vascularFacing = Math.random() < 0.86;
    const cell = this.cells[Math.floor(Math.random() * this.cells.length)];
    this.emitFromCell(cell, vascularFacing);
  }

  private emitFromCell(cell: IsletCellModel, vascularFacing: boolean): void {
    const direction = vascularFacing
      ? cell.polarityDirection.clone()
      : createNonvascularDirection(cell.polarityDirection);
    const surfacePoint = getCellSurfacePoint(cell, direction);
    const targetDirection = vascularFacing
      ? cell.nearestCapillaryPoint.clone().sub(surfacePoint).normalize()
      : direction;

    this.writeTangents(targetDirection);
    this.activateParticles(surfacePoint, targetDirection);

    if (this.eventHandler) {
      this.eventHandler({
        cellId: cell.id,
        vascularFacing,
        position: surfacePoint.clone()
      });
    }
  }

  private activateParticles(position: THREE.Vector3, direction: THREE.Vector3): void {
    for (let particle = 0; particle < PARTICLES_PER_EVENT; particle += 1) {
      const index = this.particleCursor;
      const offset = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.18;
      const speed = 1.1 + Math.random() * 0.85;
      const tangentX =
        (Math.cos(angle) * this.tangentA.x + Math.sin(angle) * this.tangentB.x) * spread;
      const tangentY =
        (Math.cos(angle) * this.tangentA.y + Math.sin(angle) * this.tangentB.y) * spread;
      const tangentZ =
        (Math.cos(angle) * this.tangentA.z + Math.sin(angle) * this.tangentB.z) * spread;

      this.active[index] = 1;
      this.ages[index] = 0;
      this.positions[offset] = position.x + direction.x * 0.12;
      this.positions[offset + 1] = position.y + direction.y * 0.12;
      this.positions[offset + 2] = position.z + direction.z * 0.12;
      this.velocities[offset] = direction.x * speed + tangentX;
      this.velocities[offset + 1] = direction.y * speed + tangentY;
      this.velocities[offset + 2] = direction.z * speed + tangentZ;
      this.scales[index] = 0.75 + Math.random() * 0.55;
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let index = 0; index < PARTICLE_POOL_SIZE; index += 1) {
      const offset = index * 3;

      if (this.active[index] === 0) {
        this.writeParticleMatrix(index, 0);
        continue;
      }

      this.ages[index] += deltaTime;
      const progress = this.ages[index] / PARTICLE_LIFETIME;

      if (progress >= 1) {
        this.active[index] = 0;
        this.writeParticleMatrix(index, 0);
        continue;
      }

      this.positions[offset] += this.velocities[offset] * deltaTime;
      this.positions[offset + 1] += this.velocities[offset + 1] * deltaTime;
      this.positions[offset + 2] += this.velocities[offset + 2] * deltaTime;
      this.writeParticleMatrix(index, this.scales[index] * (1 - progress));
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private writeTangents(direction: THREE.Vector3): void {
    const reference =
      Math.abs(direction.dot(this.upReference)) > 0.92 ? this.rightReference : this.upReference;

    this.tangentA.crossVectors(direction, reference).normalize();
    this.tangentB.crossVectors(direction, this.tangentA).normalize();
  }

  private hideAllParticles(): void {
    for (let index = 0; index < PARTICLE_POOL_SIZE; index += 1) {
      this.writeParticleMatrix(index, 0);
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private writeParticleMatrix(index: number, scale: number): void {
    const offset = index * 3;

    this.dummy.position.set(
      this.positions[offset],
      this.positions[offset + 1],
      this.positions[offset + 2]
    );
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    this.particleMesh.setMatrixAt(index, this.dummy.matrix);
  }
}

function createNonvascularDirection(polarityDirection: THREE.Vector3): THREE.Vector3 {
  const tangent = new THREE.Vector3(-polarityDirection.z, 0.35, polarityDirection.x);

  if (tangent.lengthSq() < 0.0001) {
    tangent.set(1, 0.35, 0);
  }

  return tangent.normalize();
}
