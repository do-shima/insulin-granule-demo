import * as THREE from 'three';

export interface ExocytosisEvent {
  readonly position: THREE.Vector3;
  readonly normal: THREE.Vector3;
  readonly granuleIndex: number;
}

const RING_POOL_SIZE = 48;
const PARTICLE_POOL_SIZE = 640;
const PARTICLES_PER_EVENT = 12;
const RING_LIFETIME = 0.85;
const PARTICLE_LIFETIME = 1.35;

export class ExocytosisSystem extends THREE.Group {
  private readonly ringGeometry = new THREE.TorusGeometry(0.28, 0.018, 8, 40);
  private readonly particleGeometry = new THREE.SphereGeometry(0.045, 8, 4);
  private readonly rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly ringAges = new Float32Array(RING_POOL_SIZE);
  private readonly ringLifetimes = new Float32Array(RING_POOL_SIZE);
  private readonly ringBaseScales = new Float32Array(RING_POOL_SIZE);
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly particleActive = new Uint8Array(PARTICLE_POOL_SIZE);
  private readonly particleAges = new Float32Array(PARTICLE_POOL_SIZE);
  private readonly particlePositions = new Float32Array(PARTICLE_POOL_SIZE * 3);
  private readonly particleVelocities = new Float32Array(PARTICLE_POOL_SIZE * 3);
  private readonly particleScales = new Float32Array(PARTICLE_POOL_SIZE);
  private readonly dummy = new THREE.Object3D();
  private readonly tangentA = new THREE.Vector3();
  private readonly tangentB = new THREE.Vector3();
  private readonly upReference = new THREE.Vector3(0, 1, 0);
  private readonly rightReference = new THREE.Vector3(1, 0, 0);
  private readonly forwardReference = new THREE.Vector3(0, 0, 1);
  private ringCursor = 0;
  private particleCursor = 0;

  public constructor() {
    super();

    this.name = 'Exocytosis effects';

    for (let index = 0; index < RING_POOL_SIZE; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xfef3c7,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(this.ringGeometry, material);
      ring.name = `Fusion pore ${index + 1}`;
      ring.visible = false;
      this.rings.push(ring);
      this.add(ring);
    }

    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    });

    this.particleMesh = new THREE.InstancedMesh(
      this.particleGeometry,
      particleMaterial,
      PARTICLE_POOL_SIZE
    );
    this.particleMesh.name = 'Released insulin signal particles';
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.particleMesh);
    this.hideAllParticles();
  }

  public trigger(event: ExocytosisEvent): void {
    this.activateRing(event.position, event.normal);
    this.activateParticles(event.position, event.normal);
  }

  public update(deltaTime: number): void {
    this.updateRings(deltaTime);
    this.updateParticles(deltaTime);
  }

  public setParticlesVisible(value: boolean): void {
    this.particleMesh.visible = value;
  }

  public resetEffects(): void {
    for (const ring of this.rings) {
      ring.visible = false;
      ring.material.opacity = 0;
    }

    this.particleActive.fill(0);
    this.hideAllParticles();
  }

  public dispose(): void {
    this.ringGeometry.dispose();
    this.particleGeometry.dispose();

    for (const ring of this.rings) {
      ring.material.dispose();
    }

    this.disposeMaterial(this.particleMesh.material);
  }

  private activateRing(position: THREE.Vector3, normal: THREE.Vector3): void {
    const ring = this.rings[this.ringCursor];
    const index = this.ringCursor;

    ring.visible = true;
    ring.position.copy(position).addScaledVector(normal, 0.08);
    ring.quaternion.setFromUnitVectors(this.forwardReference, normal);
    ring.scale.setScalar(0.65);
    ring.material.opacity = 0.95;

    this.ringAges[index] = 0;
    this.ringLifetimes[index] = RING_LIFETIME;
    this.ringBaseScales[index] = 0.75 + Math.random() * 0.35;
    this.ringCursor = (this.ringCursor + 1) % RING_POOL_SIZE;
  }

  private activateParticles(position: THREE.Vector3, normal: THREE.Vector3): void {
    this.writeTangents(normal);

    for (let particle = 0; particle < PARTICLES_PER_EVENT; particle += 1) {
      const index = this.particleCursor;
      const offset = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 0.2;
      const tangentX =
        (Math.cos(angle) * this.tangentA.x + Math.sin(angle) * this.tangentB.x) * spread;
      const tangentY =
        (Math.cos(angle) * this.tangentA.y + Math.sin(angle) * this.tangentB.y) * spread;
      const tangentZ =
        (Math.cos(angle) * this.tangentA.z + Math.sin(angle) * this.tangentB.z) * spread;
      const speed = 1.4 + Math.random() * 1.2;

      this.particleActive[index] = 1;
      this.particleAges[index] = 0;
      this.particlePositions[offset] = position.x + normal.x * 0.18;
      this.particlePositions[offset + 1] = position.y + normal.y * 0.18;
      this.particlePositions[offset + 2] = position.z + normal.z * 0.18;
      this.particleVelocities[offset] = normal.x * speed + tangentX;
      this.particleVelocities[offset + 1] = normal.y * speed + tangentY;
      this.particleVelocities[offset + 2] = normal.z * speed + tangentZ;
      this.particleScales[index] = 0.7 + Math.random() * 0.6;

      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
    }
  }

  private updateRings(deltaTime: number): void {
    for (let index = 0; index < RING_POOL_SIZE; index += 1) {
      const ring = this.rings[index];

      if (!ring.visible) {
        continue;
      }

      this.ringAges[index] += deltaTime;
      const progress = this.ringAges[index] / this.ringLifetimes[index];

      if (progress >= 1) {
        ring.visible = false;
        ring.material.opacity = 0;
        continue;
      }

      const scale = this.ringBaseScales[index] * (0.75 + progress * 1.8);
      ring.scale.setScalar(scale);
      ring.material.opacity = (1 - progress) * 0.85;
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let index = 0; index < PARTICLE_POOL_SIZE; index += 1) {
      const offset = index * 3;

      if (this.particleActive[index] === 0) {
        this.writeParticleMatrix(index, 0);
        continue;
      }

      this.particleAges[index] += deltaTime;
      const progress = this.particleAges[index] / PARTICLE_LIFETIME;

      if (progress >= 1) {
        this.particleActive[index] = 0;
        this.writeParticleMatrix(index, 0);
        continue;
      }

      this.particlePositions[offset] += this.particleVelocities[offset] * deltaTime;
      this.particlePositions[offset + 1] += this.particleVelocities[offset + 1] * deltaTime;
      this.particlePositions[offset + 2] += this.particleVelocities[offset + 2] * deltaTime;
      this.writeParticleMatrix(index, this.particleScales[index] * (1 - progress));
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private writeTangents(normal: THREE.Vector3): void {
    const reference =
      Math.abs(normal.dot(this.upReference)) > 0.92 ? this.rightReference : this.upReference;

    this.tangentA.crossVectors(normal, reference).normalize();
    this.tangentB.crossVectors(normal, this.tangentA).normalize();
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
      this.particlePositions[offset],
      this.particlePositions[offset + 1],
      this.particlePositions[offset + 2]
    );
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    this.particleMesh.setMatrixAt(index, this.dummy.matrix);
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
      return;
    }

    material.dispose();
  }
}
