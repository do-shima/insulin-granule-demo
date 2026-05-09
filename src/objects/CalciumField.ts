import * as THREE from 'three';
import { cellRadii } from '../biology/betaCellModel';

export class CalciumField extends THREE.Group {
  private readonly innerPulse: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly outerPulse: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private stimulationLevel = 0;
  private elapsed = 0;

  public constructor() {
    super();

    this.name = 'Calcium stimulation field';

    const innerGeometry = new THREE.SphereGeometry(1, 48, 24);
    const outerGeometry = new THREE.SphereGeometry(1, 48, 24);
    innerGeometry.scale(cellRadii.x * 0.98, cellRadii.y * 0.98, cellRadii.z * 0.98);
    outerGeometry.scale(cellRadii.x * 1.01, cellRadii.y * 1.01, cellRadii.z * 1.01);

    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.BackSide
    });

    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.innerPulse = new THREE.Mesh(innerGeometry, innerMaterial);
    this.outerPulse = new THREE.Mesh(outerGeometry, outerMaterial);
    this.add(this.innerPulse, this.outerPulse);
  }

  public setStimulationLevel(value: number): void {
    this.stimulationLevel = THREE.MathUtils.clamp(value, 0, 1);
  }

  public update(deltaTime: number): void {
    this.elapsed += deltaTime;

    const pulse = 0.5 + Math.sin(this.elapsed * (2.0 + this.stimulationLevel * 3.0)) * 0.5;
    const fieldOpacity = this.stimulationLevel * (0.025 + pulse * 0.05);
    const rimOpacity = this.stimulationLevel * (0.04 + pulse * 0.08);
    const scale = 1.0 + this.stimulationLevel * pulse * 0.025;

    this.innerPulse.material.opacity = fieldOpacity;
    this.outerPulse.material.opacity = rimOpacity;
    this.outerPulse.scale.setScalar(scale);
  }

  public dispose(): void {
    this.innerPulse.geometry.dispose();
    this.outerPulse.geometry.dispose();
    this.innerPulse.material.dispose();
    this.outerPulse.material.dispose();
  }
}
