import * as THREE from 'three';
import type { IsletCellModel } from '../biology/multicellModel';
import { getCellSurfacePoint } from './VascularContactPatches';

const yAxis = new THREE.Vector3(0, 1, 0);

export class PolarityVectorField extends THREE.Group {
  private readonly lineGeometry: THREE.BufferGeometry;
  private readonly lineMaterial: THREE.LineBasicMaterial;
  private readonly lines: THREE.LineSegments;
  private readonly coneGeometry: THREE.ConeGeometry;
  private readonly coneMaterial: THREE.MeshBasicMaterial;
  private readonly coneMesh: THREE.InstancedMesh;
  private readonly labelTexture: THREE.CanvasTexture;
  private readonly labelMaterial: THREE.SpriteMaterial;
  private readonly label: THREE.Sprite;
  private readonly instanceMatrix = new THREE.Matrix4();
  private readonly instanceQuaternion = new THREE.Quaternion();
  private readonly instanceScale = new THREE.Vector3();

  public constructor(cells: readonly IsletCellModel[]) {
    super();
    this.name = 'Schematic polarity vector field';

    this.lineGeometry = createLineGeometry(cells);
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lines.name = 'polarity direction line segments';

    this.coneGeometry = new THREE.ConeGeometry(1, 1, 12);
    this.coneMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    });
    this.coneMesh = new THREE.InstancedMesh(this.coneGeometry, this.coneMaterial, cells.length);
    this.coneMesh.name = 'polarity direction arrowheads';
    this.populateArrowheads(cells);

    this.labelTexture = createLabelTexture('vascular-facing polarity');
    this.labelMaterial = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    this.label = new THREE.Sprite(this.labelMaterial);
    this.label.position.set(-7.6, 4.1, 2.4);
    this.label.scale.set(5.5, 1.0, 1);
    this.label.renderOrder = 20;

    this.add(this.lines, this.coneMesh, this.label);
  }

  public setVectorsVisible(value: boolean): void {
    this.lines.visible = value;
    this.coneMesh.visible = value;
  }

  public setLabelsVisible(value: boolean): void {
    this.label.visible = value;
  }

  public dispose(): void {
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.coneGeometry.dispose();
    this.coneMaterial.dispose();
    this.labelTexture.dispose();
    this.labelMaterial.dispose();
  }

  private populateArrowheads(cells: readonly IsletCellModel[]): void {
    for (const cell of cells) {
      const surfacePoint = getCellSurfacePoint(cell, cell.polarityDirection);
      const arrowTip = cell.center.clone().lerp(surfacePoint, 0.86);
      this.instanceQuaternion.setFromUnitVectors(yAxis, cell.polarityDirection);
      this.instanceScale.set(0.12, 0.34, 0.12);
      this.instanceMatrix.compose(arrowTip, this.instanceQuaternion, this.instanceScale);
      this.coneMesh.setMatrixAt(cell.id, this.instanceMatrix);
    }

    this.coneMesh.instanceMatrix.needsUpdate = true;
  }
}

function createLineGeometry(cells: readonly IsletCellModel[]): THREE.BufferGeometry {
  const positions = new Float32Array(cells.length * 2 * 3);
  let offset = 0;

  for (const cell of cells) {
    const surfacePoint = getCellSurfacePoint(cell, cell.polarityDirection);
    const start = cell.center.clone().addScaledVector(cell.polarityDirection, 0.12);
    const end = cell.center.clone().lerp(surfacePoint, 0.78);

    positions[offset] = start.x;
    positions[offset + 1] = start.y;
    positions[offset + 2] = start.z;
    positions[offset + 3] = end.x;
    positions[offset + 4] = end.y;
    positions[offset + 5] = end.z;
    offset += 6;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return geometry;
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create polarity label texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(5, 8, 18, 0.72)';
  roundRect(context, 14, 24, canvas.width - 28, canvas.height - 48, 18);
  context.fill();
  context.strokeStyle = 'rgba(180, 210, 255, 0.44)';
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = 'rgba(230, 240, 255, 0.96)';
  context.font = '600 34px Inter, Segoe UI, sans-serif';
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
