import * as THREE from 'three';

export class MulticellVascularPlaceholder extends THREE.Group {
  private readonly cellGeometry: THREE.SphereGeometry;
  private readonly cellMaterial: THREE.MeshStandardMaterial;
  private readonly vesselGeometry: THREE.TubeGeometry;
  private readonly vesselMaterial: THREE.MeshStandardMaterial;
  private readonly labelTexture: THREE.CanvasTexture;
  private readonly labelMaterial: THREE.SpriteMaterial;

  public constructor() {
    super();
    this.name = 'Multicell vascular polarity demo placeholder';

    this.cellGeometry = new THREE.SphereGeometry(1, 32, 20);
    this.cellMaterial = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.22,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    const cellPositions = [
      new THREE.Vector3(-7.0, 0.3, 0.2),
      new THREE.Vector3(-3.5, -1.1, 1.2),
      new THREE.Vector3(0.0, 0.8, -0.4),
      new THREE.Vector3(3.6, -0.8, 0.8),
      new THREE.Vector3(7.0, 0.4, -0.2)
    ];

    for (const position of cellPositions) {
      const cell = new THREE.Mesh(this.cellGeometry, this.cellMaterial);
      cell.position.copy(position);
      cell.scale.set(2.25, 1.45, 1.75);
      this.add(cell);
    }

    const vesselCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-9, -3.2, -1.2),
      new THREE.Vector3(-4, -3.8, 0.4),
      new THREE.Vector3(0, -3.1, 1.2),
      new THREE.Vector3(4, -3.5, 0.2),
      new THREE.Vector3(9, -2.9, -1.0)
    ]);
    this.vesselGeometry = new THREE.TubeGeometry(vesselCurve, 64, 0.28, 16, false);
    this.vesselMaterial = new THREE.MeshStandardMaterial({
      color: 0xfca5a5,
      transparent: true,
      opacity: 0.5,
      roughness: 0.6
    });

    const vessel = new THREE.Mesh(this.vesselGeometry, this.vesselMaterial);
    this.add(vessel);

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
    this.cellGeometry.dispose();
    this.cellMaterial.dispose();
    this.vesselGeometry.dispose();
    this.vesselMaterial.dispose();
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
