import * as THREE from 'three';

export class MulticellVascularPlaceholder extends THREE.Group {
  private readonly labelTexture: THREE.CanvasTexture;
  private readonly labelMaterial: THREE.SpriteMaterial;

  public constructor() {
    super();
    this.name = 'Multicell vascular polarity demo placeholder';

    this.labelTexture = createLabelTexture('Multicell vascular polarity demo');
    this.labelMaterial = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthWrite: false
    });

    const label = new THREE.Sprite(this.labelMaterial);
    label.position.set(0, 4.2, 0);
    label.scale.set(10, 1.5, 1);
    this.add(label);
  }

  public dispose(): void {
    this.labelTexture.dispose();
    this.labelMaterial.dispose();
  }
}

function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create placeholder label texture.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(5, 8, 18, 0.68)';
  context.strokeStyle = 'rgba(180, 210, 255, 0.45)';
  context.lineWidth = 4;
  roundRect(context, 20, 20, canvas.width - 40, canvas.height - 40, 18);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(230, 240, 255, 0.96)';
  context.font = '600 48px Inter, system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

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
