import * as THREE from 'three';
import type { IsletCellModel } from '../biology/multicellModel';

const zAxis = new THREE.Vector3(0, 0, 1);

export class VascularContactPatches extends THREE.Group {
  private readonly patchGeometry: THREE.CircleGeometry;
  private readonly patchMaterial: THREE.MeshBasicMaterial;
  private readonly patchMesh: THREE.InstancedMesh;
  private readonly particleGeometry: THREE.SphereGeometry;
  private readonly particleMaterial: THREE.MeshBasicMaterial;
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly labelTexture: THREE.CanvasTexture;
  private readonly labelMaterial: THREE.SpriteMaterial;
  private readonly labels = new THREE.Group();
  private readonly instanceMatrix = new THREE.Matrix4();
  private readonly instanceQuaternion = new THREE.Quaternion();
  private readonly instanceScale = new THREE.Vector3();

  public constructor(cells: readonly IsletCellModel[]) {
    super();
    this.name = 'Schematic vascular contact patches';

    this.patchGeometry = new THREE.CircleGeometry(1, 28);
    this.patchMaterial = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.patchMesh = new THREE.InstancedMesh(this.patchGeometry, this.patchMaterial, cells.length);
    this.patchMesh.name = 'vascular-facing basal contact patches';
    this.patchMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    this.particleGeometry = new THREE.SphereGeometry(1, 10, 8);
    this.particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    });
    this.particleMesh = new THREE.InstancedMesh(this.particleGeometry, this.particleMaterial, cells.length * 3);
    this.particleMesh.name = 'schematic multicell release hotspot particles';
    this.particleMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    this.populatePatches(cells);
    this.populateParticles(cells);
    this.add(this.patchMesh, this.particleMesh);

    this.labelTexture = createLabelTexture('vascular-facing/basal domain   |   schematic secretion hotspot');
    this.labelMaterial = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    const label = new THREE.Sprite(this.labelMaterial);
    label.position.set(0, 4.9, 2.2);
    label.scale.set(12.5, 1.25, 1);
    label.renderOrder = 20;
    this.labels.add(label);
    this.add(this.labels);
  }

  public setPatchesVisible(value: boolean): void {
    this.patchMesh.visible = value;
  }

  public setReleaseParticlesVisible(value: boolean): void {
    this.particleMesh.visible = value;
  }

  public setLabelsVisible(value: boolean): void {
    this.labels.visible = value;
  }

  public dispose(): void {
    this.patchGeometry.dispose();
    this.patchMaterial.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.labelTexture.dispose();
    this.labelMaterial.dispose();
  }

  private populatePatches(cells: readonly IsletCellModel[]): void {
    for (const cell of cells) {
      const surfacePoint = getCellSurfacePoint(cell, cell.polarityDirection);
      this.instanceQuaternion.setFromUnitVectors(zAxis, cell.polarityDirection);
      this.instanceScale.set(
        cell.hasMultipleCapillaryContacts ? 0.52 : 0.38,
        cell.hasMultipleCapillaryContacts ? 0.34 : 0.26,
        1
      );
      this.instanceMatrix.compose(surfacePoint, this.instanceQuaternion, this.instanceScale);
      this.patchMesh.setMatrixAt(cell.id, this.instanceMatrix);
    }

    this.patchMesh.instanceMatrix.needsUpdate = true;
  }

  private populateParticles(cells: readonly IsletCellModel[]): void {
    let instanceIndex = 0;

    for (const cell of cells) {
      const surfacePoint = getCellSurfacePoint(cell, cell.polarityDirection);

      for (let offsetIndex = 0; offsetIndex < 3; offsetIndex += 1) {
        const lateralOffset = getDeterministicLateralOffset(cell, offsetIndex);
        const particlePosition = surfacePoint
          .clone()
          .addScaledVector(cell.polarityDirection, 0.22 + offsetIndex * 0.12)
          .add(lateralOffset);
        this.instanceScale.setScalar(0.08 + offsetIndex * 0.015);
        this.instanceMatrix.compose(particlePosition, this.instanceQuaternion.identity(), this.instanceScale);
        this.particleMesh.setMatrixAt(instanceIndex, this.instanceMatrix);
        instanceIndex += 1;
      }
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
  }
}

export function getCellSurfacePoint(cell: IsletCellModel, worldDirection: THREE.Vector3): THREE.Vector3 {
  const rotation = new THREE.Quaternion().setFromEuler(cell.rotation);
  const inverseRotation = rotation.clone().invert();
  const localDirection = worldDirection.clone().applyQuaternion(inverseRotation).normalize();
  const denominator = Math.sqrt(
    (localDirection.x * localDirection.x) / (cell.radii.x * cell.radii.x) +
      (localDirection.y * localDirection.y) / (cell.radii.y * cell.radii.y) +
      (localDirection.z * localDirection.z) / (cell.radii.z * cell.radii.z)
  );
  const localSurfacePoint = localDirection.multiplyScalar(1 / denominator);

  return localSurfacePoint.applyQuaternion(rotation).add(cell.center);
}

function getDeterministicLateralOffset(cell: IsletCellModel, offsetIndex: number): THREE.Vector3 {
  const tangent = new THREE.Vector3(-cell.polarityDirection.z, 0, cell.polarityDirection.x);

  if (tangent.lengthSq() < 0.0001) {
    tangent.set(1, 0, 0);
  }

  tangent.normalize();
  const bitangent = new THREE.Vector3().crossVectors(cell.polarityDirection, tangent).normalize();
  const phase = cell.id * 1.713 + offsetIndex * 2.117;

  return tangent
    .multiplyScalar(Math.cos(phase) * 0.16)
    .addScaledVector(bitangent, Math.sin(phase) * 0.12);
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create vascular contact label texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(5, 8, 18, 0.72)';
  roundRect(context, 14, 24, canvas.width - 28, canvas.height - 48, 18);
  context.fill();
  context.strokeStyle = 'rgba(180, 210, 255, 0.44)';
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = 'rgba(230, 240, 255, 0.96)';
  context.font = '600 32px Inter, Segoe UI, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
