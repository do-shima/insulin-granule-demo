import * as THREE from 'three';
import {
  getEllipsoidNormal,
  projectToEllipsoidSurface
} from '../biology/betaCellGeometry';
import {
  cellRadii,
  nucleusPosition,
  secretionPoleDirection
} from '../biology/betaCellModel';

interface LabelDefinition {
  readonly text: string;
  readonly position: THREE.Vector3;
  readonly scale: number;
}

const labelDefinitions: LabelDefinition[] = [
  {
    text: 'beta-cell membrane',
    position: new THREE.Vector3(0, -cellRadii.y - 1.2, 0),
    scale: 3.4
  },
  {
    text: 'nucleus',
    position: nucleusPosition.clone().add(new THREE.Vector3(-2.6, 4.8, 0)),
    scale: 2.2
  },
  {
    text: 'Golgi region',
    position: new THREE.Vector3(-0.5, 4.1, 0.8),
    scale: 2.4
  },
  {
    text: 'insulin granules',
    position: new THREE.Vector3(4.2, 5.8, 6.0),
    scale: 2.8
  },
  {
    text: 'microtubules',
    position: new THREE.Vector3(8.6, 2.9, -4.0),
    scale: 2.6
  },
  {
    text: 'secretion pole',
    position: getPoleLabelPosition(1.5),
    scale: 2.6
  },
  {
    text: 'exocytosis site',
    position: getPoleLabelPosition(3.0),
    scale: 2.7
  }
];

export class SchematicLabels extends THREE.Group {
  private readonly materials: THREE.SpriteMaterial[] = [];
  private readonly textures: THREE.CanvasTexture[] = [];

  public constructor() {
    super();

    this.name = 'Schematic labels';

    for (const definition of labelDefinitions) {
      const label = this.createLabel(definition);
      this.add(label);
    }
  }

  public setLabelsVisible(value: boolean): void {
    this.visible = value;
  }

  public dispose(): void {
    for (const material of this.materials) {
      material.dispose();
    }

    for (const texture of this.textures) {
      texture.dispose();
    }
  }

  private createLabel(definition: LabelDefinition): THREE.Sprite {
    const texture = createLabelTexture(definition.text);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);

    sprite.name = `Label: ${definition.text}`;
    sprite.position.copy(definition.position);
    sprite.scale.set(definition.scale * 2.8, definition.scale, 1);
    sprite.renderOrder = 20;

    this.textures.push(texture);
    this.materials.push(material);

    return sprite;
  }
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create label canvas context.');
  }

  const width = 512;
  const height = 128;
  canvas.width = width;
  canvas.height = height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = 'rgba(5, 8, 18, 0.72)';
  roundRect(context, 14, 24, width - 28, height - 48, 18);
  context.fill();
  context.strokeStyle = 'rgba(180, 210, 255, 0.44)';
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = 'rgba(230, 240, 255, 0.96)';
  context.font = '600 34px Inter, Segoe UI, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2 + 1);

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

function getPoleLabelPosition(outwardOffset: number): THREE.Vector3 {
  const surfacePoint = projectToEllipsoidSurface(secretionPoleDirection, cellRadii);
  const normal = getEllipsoidNormal(surfacePoint, cellRadii);

  return surfacePoint.addScaledVector(normal, outwardOffset);
}
