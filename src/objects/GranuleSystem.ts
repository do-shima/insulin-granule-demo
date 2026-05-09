import * as THREE from 'three';
import {
  getEllipsoidNormal,
  isInsideEllipsoid,
  isOutsideNucleus,
  projectToEllipsoidSurface,
  randomPointInsideEllipsoid,
  randomPointNearMembrane
} from '../biology/betaCellGeometry';
import {
  cellRadii,
  granuleCount,
  nucleusExclusionMargin,
  nucleusPosition,
  nucleusRadius
} from '../biology/betaCellModel';
import {
  GranuleState,
  createEmptyGranuleStateCounts,
  getGranuleStateName
} from '../biology/granuleStates';
import type { ExocytosisEvent } from './ExocytosisSystem';
import { MicrotubuleNetwork } from './MicrotubuleNetwork';

const GRANULE_STRIDE = 3;
const MAX_INITIAL_PLACEMENT_ATTEMPTS = 10_000;
const GOLGI_CENTER = new THREE.Vector3(-0.5, 1.7, 0.0);
const DOCKED_DISTANCE_FROM_MEMBRANE = 0.7;
const PRIMED_DISTANCE_FROM_MEMBRANE = 0.42;
const IMMATURE_FRACTION = 0.08;
const DOCKED_FRACTION = 0.08;
const PRIMED_FRACTION = 0.04;
const TRANSPORTING_FRACTION = 0.12;
const TRANSPORT_RECRUIT_INTERVAL = 1.4;
const TRANSPORT_RECRUIT_COUNT = 3;
const RELEASE_RECYCLE_TIME = 3.0;
const FUSING_DURATION = 0.8;
const BASAL_PRIMING_RATE = 0.004;
const STIMULATED_PRIMING_RATE = 0.22;
const BASAL_FUSION_RATE = 0.002;
const STIMULATED_FUSION_RATE = 0.18;

export class GranuleSystem extends THREE.Group {
  private readonly shellMesh: THREE.InstancedMesh;
  private readonly haloMesh: THREE.InstancedMesh;
  private readonly coreMesh: THREE.InstancedMesh;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly scales: Float32Array;
  private readonly states: Uint8Array;
  private readonly stateTimes: Float32Array;
  private readonly transportPathIndices: Uint8Array;
  private readonly transportProgress: Float32Array;
  private readonly transportSpeeds: Float32Array;
  private readonly transportOffsets: Float32Array;
  private readonly dummy = new THREE.Object3D();
  private readonly testPoint = new THREE.Vector3();
  private readonly pathPoint = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private readonly granuleTotal: number;
  private readonly microtubules?: MicrotubuleNetwork;
  private exocytosisEventHandler?: (event: ExocytosisEvent) => void;
  private stimulationLevel = 0;
  private transportRecruitElapsed = 0;

  public constructor(total = granuleCount, microtubules?: MicrotubuleNetwork) {
    super();

    this.granuleTotal = total;
    this.microtubules = microtubules;
    this.positions = new Float32Array(total * GRANULE_STRIDE);
    this.velocities = new Float32Array(total * GRANULE_STRIDE);
    this.scales = new Float32Array(total);
    this.states = new Uint8Array(total);
    this.stateTimes = new Float32Array(total);
    this.transportPathIndices = new Uint8Array(total);
    this.transportProgress = new Float32Array(total);
    this.transportSpeeds = new Float32Array(total);
    this.transportOffsets = new Float32Array(total * GRANULE_STRIDE);

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
    const driftJitter = deltaTime * (0.012 + this.stimulationLevel * 0.008);
    const maxVelocity = 0.028;

    this.transportRecruitElapsed += deltaTime;
    if (this.transportRecruitElapsed >= TRANSPORT_RECRUIT_INTERVAL) {
      this.recruitTransportingGranules(TRANSPORT_RECRUIT_COUNT);
      this.transportRecruitElapsed = 0;
    }

    for (let index = 0; index < this.granuleTotal; index += 1) {
      const offset = index * GRANULE_STRIDE;
      let state = this.states[index] as GranuleState;

      this.stateTimes[index] += deltaTime;

      if (state === GranuleState.Released) {
        if (this.stateTimes[index] > RELEASE_RECYCLE_TIME) {
          this.randomizePosition(index);
          this.setState(index, GranuleState.Mature);
        }

        this.updateInstance(index, this.positions[offset], this.positions[offset + 1], this.positions[offset + 2]);
        continue;
      }

      if (state === GranuleState.Fusing && this.stateTimes[index] > FUSING_DURATION) {
        this.setState(index, GranuleState.Released);
        this.updateInstance(index, this.positions[offset], this.positions[offset + 1], this.positions[offset + 2]);
        continue;
      }

      if (state === GranuleState.Immature && this.stateTimes[index] > 24.0) {
        this.setState(index, GranuleState.Mature);
        state = GranuleState.Mature;
      }

      if (state === GranuleState.Docked && this.shouldPrimeDockedGranule(deltaTime)) {
        this.setState(index, GranuleState.Primed);
        state = GranuleState.Primed;
      }

      if (state === GranuleState.Primed && this.shouldFusePrimedGranule(deltaTime)) {
        this.beginFusion(index);
        state = GranuleState.Fusing;
      }

      if (state === GranuleState.Transporting && this.microtubules) {
        this.updateTransportingGranule(index, deltaTime);
        continue;
      }

      let velocityX = this.velocities[offset] + (Math.random() - 0.5) * driftJitter;
      let velocityY = this.velocities[offset + 1] + (Math.random() - 0.5) * driftJitter;
      let velocityZ = this.velocities[offset + 2] + (Math.random() - 0.5) * driftJitter;

      velocityX = THREE.MathUtils.clamp(velocityX, -maxVelocity, maxVelocity);
      velocityY = THREE.MathUtils.clamp(velocityY, -maxVelocity, maxVelocity);
      velocityZ = THREE.MathUtils.clamp(velocityZ, -maxVelocity, maxVelocity);

      const stateSpeed = this.getStateSpeedMultiplier(state);
      const adjustedSpeed = speed * stateSpeed;
      let x = this.positions[offset] + velocityX * adjustedSpeed;
      let y = this.positions[offset + 1] + velocityY * adjustedSpeed;
      let z = this.positions[offset + 2] + velocityZ * adjustedSpeed;

      if (!this.isInsideAllowedVolume(x, y, z)) {
        velocityX *= -1;
        velocityY *= -1;
        velocityZ *= -1;
        x += velocityX * adjustedSpeed * 2.0;
        y += velocityY * adjustedSpeed * 2.0;
        z += velocityZ * adjustedSpeed * 2.0;
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

  public getCount(): number {
    return this.granuleTotal;
  }

  public getStateCounts(): Record<string, number> {
    const counts = createEmptyGranuleStateCounts();

    for (let index = 0; index < this.granuleTotal; index += 1) {
      counts[getGranuleStateName(this.states[index] as GranuleState)] += 1;
    }

    return counts;
  }

  public setStimulationLevel(value: number): void {
    this.stimulationLevel = THREE.MathUtils.clamp(value, 0, 1);
  }

  public setExocytosisEventHandler(handler: ((event: ExocytosisEvent) => void) | undefined): void {
    this.exocytosisEventHandler = handler;
  }

  public triggerDockingPulse(count: number): void {
    let remaining = Math.max(0, Math.floor(count));

    for (let index = 0; index < this.granuleTotal && remaining > 0; index += 1) {
      if (
        this.states[index] === GranuleState.Mature ||
        this.states[index] === GranuleState.Transporting
      ) {
        this.placeNearMembrane(index, DOCKED_DISTANCE_FROM_MEMBRANE);
        this.setState(index, GranuleState.Docked);
        remaining -= 1;
      }
    }
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
    const immatureCount = Math.floor(this.granuleTotal * IMMATURE_FRACTION);
    const transportingCount = this.microtubules
      ? Math.floor(this.granuleTotal * TRANSPORTING_FRACTION)
      : 0;
    const dockedCount = Math.floor(this.granuleTotal * DOCKED_FRACTION);
    const primedCount = Math.floor(this.granuleTotal * PRIMED_FRACTION);
    const dockedStart = this.granuleTotal - dockedCount - primedCount;
    const primedStart = this.granuleTotal - primedCount;
    const transportingEnd = immatureCount + transportingCount;

    for (let index = 0; index < this.granuleTotal; index += 1) {
      if (index < immatureCount) {
        this.randomizeNearGolgi(index);
        this.setState(index, GranuleState.Immature);
      } else if (index < transportingEnd) {
        this.randomizePosition(index);
        this.assignTransport(index);
      } else if (index >= primedStart) {
        this.placeNearMembrane(index, PRIMED_DISTANCE_FROM_MEMBRANE);
        this.setState(index, GranuleState.Primed);
      } else if (index >= dockedStart) {
        this.placeNearMembrane(index, DOCKED_DISTANCE_FROM_MEMBRANE);
        this.setState(index, GranuleState.Docked);
      } else {
        this.randomizePosition(index);
        this.setState(index, GranuleState.Mature);
      }

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
      const point = randomPointInsideEllipsoid(cellRadii);

      if (isOutsideNucleus(point, nucleusPosition, nucleusRadius, nucleusExclusionMargin)) {
        this.positions[offset] = point.x;
        this.positions[offset + 1] = point.y;
        this.positions[offset + 2] = point.z;
        return;
      }
    }

    this.positions[offset] = cellRadii.x * 0.5;
    this.positions[offset + 1] = 0;
    this.positions[offset + 2] = 0;
  }

  private randomizeNearPathStart(index: number): void {
    const offset = index * GRANULE_STRIDE;

    this.writeTransportPosition(index, this.transportProgress[index]);
    if (this.isInsideAllowedVolume(
      this.positions[offset],
      this.positions[offset + 1],
      this.positions[offset + 2]
    )) {
      return;
    }

    this.randomizePosition(index);
  }

  private randomizeNearGolgi(index: number): void {
    const offset = index * GRANULE_STRIDE;

    for (let attempt = 0; attempt < MAX_INITIAL_PLACEMENT_ATTEMPTS; attempt += 1) {
      const x = GOLGI_CENTER.x + (Math.random() - 0.5) * 5.0;
      const y = GOLGI_CENTER.y + (Math.random() - 0.5) * 3.0;
      const z = GOLGI_CENTER.z + (Math.random() - 0.5) * 4.0;

      if (this.isInsideAllowedVolume(x, y, z)) {
        this.positions[offset] = x;
        this.positions[offset + 1] = y;
        this.positions[offset + 2] = z;
        return;
      }
    }

    this.randomizePosition(index);
  }

  private placeNearMembrane(index: number, distanceFromMembrane: number): void {
    const offset = index * GRANULE_STRIDE;

    for (let attempt = 0; attempt < MAX_INITIAL_PLACEMENT_ATTEMPTS; attempt += 1) {
      const point = randomPointNearMembrane(cellRadii, distanceFromMembrane);

      if (isOutsideNucleus(point, nucleusPosition, nucleusRadius, nucleusExclusionMargin)) {
        this.positions[offset] = point.x;
        this.positions[offset + 1] = point.y;
        this.positions[offset + 2] = point.z;
        return;
      }
    }

    this.randomizePosition(index);
  }

  private updateInstance(index: number, x: number, y: number, z: number): void {
    if (this.states[index] === GranuleState.Released) {
      this.dummy.scale.setScalar(0);
    } else {
      this.dummy.scale.setScalar(this.getVisualScale(index));
    }

    this.dummy.position.set(x, y, z);
    this.dummy.updateMatrix();

    this.shellMesh.setMatrixAt(index, this.dummy.matrix);
    this.haloMesh.setMatrixAt(index, this.dummy.matrix);
    this.coreMesh.setMatrixAt(index, this.dummy.matrix);
  }

  private isInsideAllowedVolume(x: number, y: number, z: number): boolean {
    this.testPoint.set(x, y, z);

    return (
      isInsideEllipsoid(this.testPoint, cellRadii) &&
      isOutsideNucleus(this.testPoint, nucleusPosition, nucleusRadius, nucleusExclusionMargin)
    );
  }

  private setState(index: number, state: GranuleState): void {
    this.states[index] = state;
    this.stateTimes[index] = 0;
    this.applyStateColor(index);
    this.markColorsDirty();
  }

  private beginFusion(index: number): void {
    const offset = index * GRANULE_STRIDE;

    this.testPoint.set(
      this.positions[offset],
      this.positions[offset + 1],
      this.positions[offset + 2]
    );

    const surfacePoint = projectToEllipsoidSurface(this.testPoint, cellRadii);
    const normal = getEllipsoidNormal(surfacePoint, cellRadii);

    this.positions[offset] = surfacePoint.x - normal.x * 0.22;
    this.positions[offset + 1] = surfacePoint.y - normal.y * 0.22;
    this.positions[offset + 2] = surfacePoint.z - normal.z * 0.22;
    this.velocities[offset] = 0;
    this.velocities[offset + 1] = 0;
    this.velocities[offset + 2] = 0;
    this.setState(index, GranuleState.Fusing);

    this.exocytosisEventHandler?.({
      position: surfacePoint,
      normal,
      granuleIndex: index
    });
  }

  private assignTransport(index: number): void {
    if (!this.microtubules || this.microtubules.getPathCount() === 0) {
      this.setState(index, GranuleState.Mature);
      return;
    }

    const offset = index * GRANULE_STRIDE;
    const pathCount = this.microtubules.getPathCount();

    this.transportPathIndices[index] = Math.floor(Math.random() * pathCount);
    this.transportProgress[index] = 0.03 + Math.random() * 0.16;
    this.transportSpeeds[index] = 0.055 + Math.random() * 0.045;
    this.transportOffsets[offset] = (Math.random() - 0.5) * 0.55;
    this.transportOffsets[offset + 1] = (Math.random() - 0.5) * 0.55;
    this.transportOffsets[offset + 2] = (Math.random() - 0.5) * 0.55;
    this.setState(index, GranuleState.Transporting);
    this.randomizeNearPathStart(index);
  }

  private recruitTransportingGranules(count: number): void {
    if (!this.microtubules) {
      return;
    }

    let remaining = count + Math.floor(this.stimulationLevel * count);
    const startIndex = Math.floor(Math.random() * this.granuleTotal);

    for (let step = 0; step < this.granuleTotal && remaining > 0; step += 1) {
      const index = (startIndex + step) % this.granuleTotal;

      if (this.states[index] === GranuleState.Mature && Math.random() < 0.35) {
        this.assignTransport(index);
        remaining -= 1;
      }
    }
  }

  private updateTransportingGranule(index: number, deltaTime: number): void {
    const offset = index * GRANULE_STRIDE;
    const progress =
      this.transportProgress[index] +
      deltaTime * this.transportSpeeds[index] * (1.0 + this.stimulationLevel * 0.7);

    this.transportProgress[index] = progress;

    if (progress >= 0.98) {
      if (Math.random() < 0.78 + this.stimulationLevel * 0.12) {
        this.writeTransportPosition(index, 1.0);
        this.setState(index, GranuleState.Docked);
      } else {
        this.placeNearMembrane(index, DOCKED_DISTANCE_FROM_MEMBRANE);
        this.setState(index, GranuleState.Mature);
      }

      this.updateInstance(
        index,
        this.positions[offset],
        this.positions[offset + 1],
        this.positions[offset + 2]
      );
      return;
    }

    this.writeTransportPosition(index, progress);
    this.updateInstance(
      index,
      this.positions[offset],
      this.positions[offset + 1],
      this.positions[offset + 2]
    );
  }

  private writeTransportPosition(index: number, progress: number): void {
    if (!this.microtubules) {
      return;
    }

    const offset = index * GRANULE_STRIDE;

    this.microtubules.writePointOnPath(this.transportPathIndices[index], progress, this.pathPoint);
    this.positions[offset] = this.pathPoint.x + this.transportOffsets[offset];
    this.positions[offset + 1] = this.pathPoint.y + this.transportOffsets[offset + 1];
    this.positions[offset + 2] = this.pathPoint.z + this.transportOffsets[offset + 2];
  }

  private getVisualScale(index: number): number {
    const scale = this.scales[index];

    switch (this.states[index]) {
      case GranuleState.Immature:
        return scale * 0.76;
      case GranuleState.Docked:
        return scale * 1.06;
      case GranuleState.Transporting:
        return scale * 1.02;
      case GranuleState.Primed:
        return scale * 1.12;
      case GranuleState.Fusing:
        return scale * Math.max(0.18, 1 - this.stateTimes[index] / FUSING_DURATION);
      default:
        return scale;
    }
  }

  private getStateSpeedMultiplier(state: GranuleState): number {
    switch (state) {
      case GranuleState.Docked:
        return 0.04;
      case GranuleState.Primed:
        return 0.02;
      case GranuleState.Fusing:
        return 0;
      case GranuleState.Transporting:
        return 0;
      default:
        return 1.0;
    }
  }

  private shouldPrimeDockedGranule(deltaTime: number): boolean {
    const stimulation = this.stimulationLevel * this.stimulationLevel;
    const rate = BASAL_PRIMING_RATE + STIMULATED_PRIMING_RATE * stimulation;

    return Math.random() < this.rateToProbability(rate, deltaTime);
  }

  private shouldFusePrimedGranule(deltaTime: number): boolean {
    const stimulation = this.stimulationLevel * this.stimulationLevel;
    const rate = BASAL_FUSION_RATE + STIMULATED_FUSION_RATE * stimulation;

    return Math.random() < this.rateToProbability(rate, deltaTime);
  }

  private rateToProbability(ratePerSecond: number, deltaTime: number): number {
    return 1 - Math.exp(-ratePerSecond * deltaTime);
  }

  private applyStateColor(index: number): void {
    switch (this.states[index]) {
      case GranuleState.Immature:
        this.setLayerColors(index, 0xd2b58a, 0xe6d9b4, 0xb98300);
        return;
      case GranuleState.Docked:
        this.setLayerColors(index, 0xffe2ae, 0xffffdc, 0xffc23a);
        return;
      case GranuleState.Transporting:
        this.setLayerColors(index, 0xffdfaa, 0xfff8d8, 0xffbb22);
        return;
      case GranuleState.Primed:
        this.setLayerColors(index, 0xffecbd, 0xffffec, 0xffd166);
        return;
      case GranuleState.Fusing:
        this.setLayerColors(index, 0xfff3cc, 0xffffff, 0xffe08a);
        return;
      case GranuleState.Released:
        this.setLayerColors(index, 0x000000, 0x000000, 0x000000);
        return;
      default:
        this.setLayerColors(index, 0xffdca3, 0xfff3c4, 0xffb000);
    }
  }

  private setLayerColors(
    index: number,
    shellColor: THREE.ColorRepresentation,
    haloColor: THREE.ColorRepresentation,
    coreColor: THREE.ColorRepresentation
  ): void {
    this.shellMesh.setColorAt(index, this.color.set(shellColor));
    this.haloMesh.setColorAt(index, this.color.set(haloColor));
    this.coreMesh.setColorAt(index, this.color.set(coreColor));
  }

  private markColorsDirty(): void {
    if (this.shellMesh.instanceColor) {
      this.shellMesh.instanceColor.needsUpdate = true;
    }

    if (this.haloMesh.instanceColor) {
      this.haloMesh.instanceColor.needsUpdate = true;
    }

    if (this.coreMesh.instanceColor) {
      this.coreMesh.instanceColor.needsUpdate = true;
    }
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }

    material.dispose();
  }
}
