import * as THREE from 'three';
import { projectToEllipsoidSurface } from '../biology/betaCellGeometry';
import { cellRadii } from '../biology/betaCellModel';

const DEFAULT_PATH_COUNT = 24;
const GOLGI_CENTER = new THREE.Vector3(-0.5, 1.7, 0.0);
const tempDirection = new THREE.Vector3();

export class MicrotubuleNetwork extends THREE.Group {
  private readonly paths: THREE.CatmullRomCurve3[] = [];
  private readonly material: THREE.MeshStandardMaterial;

  public constructor(pathCount = DEFAULT_PATH_COUNT) {
    super();

    this.name = 'Microtubule network';
    this.material = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.34,
      roughness: 0.65,
      metalness: 0.0
    });

    for (let index = 0; index < pathCount; index += 1) {
      const path = this.createPath(index, pathCount);
      const geometry = new THREE.TubeGeometry(path, 64, 0.035, 8, false);
      const tube = new THREE.Mesh(geometry, this.material);
      tube.name = `Microtubule ${index + 1}`;

      this.paths.push(path);
      this.add(tube);
    }
  }

  public getPathCount(): number {
    return this.paths.length;
  }

  public getPointOnPath(pathIndex: number, t: number): THREE.Vector3 {
    return this.paths[this.normalizePathIndex(pathIndex)].getPoint(THREE.MathUtils.clamp(t, 0, 1));
  }

  public writePointOnPath(pathIndex: number, t: number, target: THREE.Vector3): void {
    this.paths[this.normalizePathIndex(pathIndex)].getPoint(THREE.MathUtils.clamp(t, 0, 1), target);
  }

  public setOpacity(value: number): void {
    this.material.opacity = THREE.MathUtils.clamp(value, 0, 1);
  }

  public dispose(): void {
    for (const child of this.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }

    this.material.dispose();
  }

  private createPath(index: number, pathCount: number): THREE.CatmullRomCurve3 {
    const angle = (index / pathCount) * Math.PI * 2;
    const verticalBias = Math.sin(index * 1.73) * 0.52;
    const radialJitter = 0.82 + Math.random() * 0.28;

    tempDirection
      .set(Math.cos(angle) * radialJitter, verticalBias, Math.sin(angle) * radialJitter)
      .normalize();

    const surfacePoint = projectToEllipsoidSurface(tempDirection, cellRadii);
    const endPoint = surfacePoint.multiplyScalar(0.94);
    const startPoint = GOLGI_CENTER.clone().addScaledVector(tempDirection, 1.5 + Math.random() * 0.6);
    const bendA = GOLGI_CENTER.clone().addScaledVector(tempDirection, 5.2 + Math.random() * 1.2);
    const bendB = endPoint.clone().lerp(startPoint, 0.32);
    const twist = new THREE.Vector3(-tempDirection.z, 0.25 + Math.random() * 0.5, tempDirection.x)
      .normalize()
      .multiplyScalar(1.2 + Math.random() * 1.5);

    bendA.add(twist);
    bendB.addScaledVector(twist, -0.5);

    return new THREE.CatmullRomCurve3([startPoint, bendA, bendB, endPoint], false, 'catmullrom', 0.45);
  }

  private normalizePathIndex(pathIndex: number): number {
    if (this.paths.length === 0) {
      throw new Error('Microtubule network has no paths.');
    }

    return Math.abs(Math.floor(pathIndex)) % this.paths.length;
  }
}
