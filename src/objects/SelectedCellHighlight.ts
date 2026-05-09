import * as THREE from 'three';
import type { IsletCellModel } from '../biology/multicellModel';
import { getCellSurfacePoint } from './VascularContactPatches';

const yAxis = new THREE.Vector3(0, 1, 0);
const zAxis = new THREE.Vector3(0, 0, 1);

export class SelectedCellHighlight extends THREE.Group {
  private readonly shellGeometry = new THREE.SphereGeometry(1, 32, 20);
  private readonly shellMaterial = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.28,
    wireframe: true,
    depthWrite: false
  });
  private readonly shell = new THREE.Mesh(this.shellGeometry, this.shellMaterial);
  private readonly patchGeometry = new THREE.CircleGeometry(1, 36);
  private readonly patchMaterial = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  private readonly patch = new THREE.Mesh(this.patchGeometry, this.patchMaterial);
  private readonly lineGeometry = new THREE.BufferGeometry();
  private readonly lineMaterial = new THREE.LineBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  private readonly line: THREE.Line;
  private readonly coneGeometry = new THREE.ConeGeometry(1, 1, 16);
  private readonly coneMaterial = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  private readonly cone = new THREE.Mesh(this.coneGeometry, this.coneMaterial);
  private readonly haloGeometry = new THREE.TorusGeometry(1, 0.025, 8, 48);
  private readonly haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  private readonly halo = new THREE.Mesh(this.haloGeometry, this.haloMaterial);
  private readonly labelTexture = createLabelTexture('selected beta cell');
  private readonly labelMaterial = new THREE.SpriteMaterial({
    map: this.labelTexture,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });
  private readonly label = new THREE.Sprite(this.labelMaterial);
  private readonly rotationQuaternion = new THREE.Quaternion();
  private readonly linePositions = new Float32Array(6);

  public constructor(initialCell: IsletCellModel) {
    super();
    this.name = 'Selected beta cell highlight';

    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
    this.label.renderOrder = 24;

    this.add(this.shell, this.halo, this.patch, this.line, this.cone, this.label);
    this.setSelectedCell(initialCell);
  }

  public setSelectedCell(cell: IsletCellModel): void {
    const surfacePoint = getCellSurfacePoint(cell, cell.polarityDirection);
    const arrowEnd = cell.center.clone().lerp(surfacePoint, 0.88);

    this.rotationQuaternion.setFromEuler(cell.rotation);
    this.shell.position.copy(cell.center);
    this.shell.quaternion.copy(this.rotationQuaternion);
    this.shell.scale.copy(cell.radii).multiplyScalar(1.08);

    this.patch.position.copy(surfacePoint).addScaledVector(cell.polarityDirection, 0.035);
    this.patch.quaternion.setFromUnitVectors(zAxis, cell.polarityDirection);
    this.patch.scale.set(0.72, 0.48, 1);

    this.halo.position.copy(surfacePoint).addScaledVector(cell.polarityDirection, 0.06);
    this.halo.quaternion.setFromUnitVectors(zAxis, cell.polarityDirection);
    this.halo.scale.set(0.92, 0.92, 0.92);

    this.linePositions[0] = cell.center.x;
    this.linePositions[1] = cell.center.y;
    this.linePositions[2] = cell.center.z;
    this.linePositions[3] = arrowEnd.x;
    this.linePositions[4] = arrowEnd.y;
    this.linePositions[5] = arrowEnd.z;
    this.lineGeometry.attributes.position.needsUpdate = true;

    this.cone.position.copy(arrowEnd);
    this.cone.quaternion.setFromUnitVectors(yAxis, cell.polarityDirection);
    this.cone.scale.set(0.18, 0.44, 0.18);

    this.label.position.copy(cell.center).add(new THREE.Vector3(0, cell.radii.y + 1.1, 0));
    this.label.scale.set(4.6, 0.86, 1);
  }

  public setLabelsVisible(value: boolean): void {
    this.label.visible = value;
  }

  public setPatchVisible(value: boolean): void {
    this.patch.visible = value;
    this.halo.visible = value;
  }

  public setVectorVisible(value: boolean): void {
    this.line.visible = value;
    this.cone.visible = value;
  }

  public dispose(): void {
    this.shellGeometry.dispose();
    this.shellMaterial.dispose();
    this.patchGeometry.dispose();
    this.patchMaterial.dispose();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.coneGeometry.dispose();
    this.coneMaterial.dispose();
    this.haloGeometry.dispose();
    this.haloMaterial.dispose();
    this.labelTexture.dispose();
    this.labelMaterial.dispose();
  }
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create selected cell label texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(5, 8, 18, 0.74)';
  roundRect(context, 14, 24, canvas.width - 28, canvas.height - 48, 18);
  context.fill();
  context.strokeStyle = 'rgba(254, 240, 138, 0.76)';
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = 'rgba(254, 252, 232, 0.98)';
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
