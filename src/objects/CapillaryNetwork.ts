import * as THREE from 'three';
import { capillaryPathDefinitions } from '../biology/vascularPolarity';

interface SampledCapillaryPoint {
  readonly point: THREE.Vector3;
  readonly pathIndex: number;
  readonly t: number;
}

export interface NearestCapillaryPointData {
  readonly point: THREE.Vector3;
  readonly distance: number;
  readonly pathIndex: number;
  readonly t: number;
}

export class CapillaryNetwork extends THREE.Group {
  private readonly curves: THREE.CatmullRomCurve3[] = [];
  private readonly geometries: THREE.TubeGeometry[] = [];
  private readonly material: THREE.MeshStandardMaterial;
  private readonly sampledPoints: SampledCapillaryPoint[] = [];
  private readonly sampledPointPositions: THREE.Vector3[] = [];
  private readonly labelTexture: THREE.CanvasTexture;
  private readonly labelMaterial: THREE.SpriteMaterial;
  private readonly label: THREE.Sprite;

  public constructor() {
    super();
    this.name = 'Schematic capillary network';

    this.material = new THREE.MeshStandardMaterial({
      color: 0xef7777,
      transparent: true,
      opacity: 0.46,
      roughness: 0.62,
      metalness: 0.02
    });

    capillaryPathDefinitions.forEach((definition, pathIndex) => {
      const curve = new THREE.CatmullRomCurve3(definition.controlPoints.map((point) => point.clone()));
      const geometry = new THREE.TubeGeometry(curve, 72, pathIndex === 0 ? 0.3 : 0.18, 16, false);
      const mesh = new THREE.Mesh(geometry, this.material);

      mesh.name = `Capillary path ${pathIndex + 1}`;
      this.curves.push(curve);
      this.geometries.push(geometry);
      this.add(mesh);
      this.samplePath(curve, pathIndex);
    });

    this.labelTexture = createLabelTexture('schematic capillary network');
    this.labelMaterial = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    this.label = new THREE.Sprite(this.labelMaterial);
    this.label.position.set(0, -5.0, 2.5);
    this.label.scale.set(7.8, 1.1, 1);
    this.label.renderOrder = 20;
    this.add(this.label);
  }

  public getSampledPoints(): readonly THREE.Vector3[] {
    return this.sampledPointPositions;
  }

  public getNearestPointTo(position: THREE.Vector3): THREE.Vector3 {
    return this.getNearestPointData(position).point;
  }

  public getNearestPointData(position: THREE.Vector3): NearestCapillaryPointData {
    let nearestSample = this.sampledPoints[0];
    let nearestDistanceSquared = Infinity;

    for (const sample of this.sampledPoints) {
      const distanceSquared = sample.point.distanceToSquared(position);

      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestSample = sample;
      }
    }

    return {
      point: nearestSample.point.clone(),
      distance: Math.sqrt(nearestDistanceSquared),
      pathIndex: nearestSample.pathIndex,
      t: nearestSample.t
    };
  }

  public setLabelsVisible(value: boolean): void {
    this.label.visible = value;
  }

  public dispose(): void {
    for (const geometry of this.geometries) {
      geometry.dispose();
    }

    this.material.dispose();
    this.labelTexture.dispose();
    this.labelMaterial.dispose();
  }

  private samplePath(curve: THREE.CatmullRomCurve3, pathIndex: number): void {
    const sampleCount = 80;

    for (let index = 0; index <= sampleCount; index += 1) {
      const t = index / sampleCount;
      const point = curve.getPoint(t);
      this.sampledPoints.push({
        point,
        pathIndex,
        t
      });
      this.sampledPointPositions.push(point);
    }
  }
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create capillary label texture.');
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
