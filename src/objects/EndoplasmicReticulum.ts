import * as THREE from 'three';
import { nucleusPosition } from '../biology/betaCellModel';

const RIBBON_COUNT = 9;

export class EndoplasmicReticulum extends THREE.Group {
  private readonly material: THREE.MeshStandardMaterial;

  public constructor() {
    super();

    this.name = 'Schematic endoplasmic reticulum';
    this.material = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.18,
      roughness: 0.85,
      metalness: 0.0,
      depthWrite: false
    });

    for (let index = 0; index < RIBBON_COUNT; index += 1) {
      const curve = this.createRibbonCurve(index);
      const geometry = new THREE.TubeGeometry(curve, 56, 0.045, 8, false);
      const tube = new THREE.Mesh(geometry, this.material);
      tube.name = `ER tubule ${index + 1}`;
      this.add(tube);
    }
  }

  public dispose(): void {
    for (const child of this.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }

    this.material.dispose();
  }

  private createRibbonCurve(index: number): THREE.CatmullRomCurve3 {
    const angle = (index / RIBBON_COUNT) * Math.PI * 2;
    const phase = index * 0.73;
    const points: THREE.Vector3[] = [];

    for (let pointIndex = 0; pointIndex < 6; pointIndex += 1) {
      const progress = pointIndex / 5;
      const radius = 4.7 + progress * 3.8 + Math.sin(progress * Math.PI + phase) * 0.45;
      const theta = angle + progress * 1.35 + Math.sin(phase) * 0.22;
      const y = nucleusPosition.y + Math.sin(progress * Math.PI * 2 + phase) * 1.15;

      points.push(
        new THREE.Vector3(
          nucleusPosition.x + Math.cos(theta) * radius,
          y,
          nucleusPosition.z + Math.sin(theta) * radius * 0.72
        )
      );
    }

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.45);
  }
}
