import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetBackdrops extends THREE.Group {
  private readonly loader = new GLTFLoader();
  private readonly loadedScenes: THREE.Object3D[] = [];
  private readonly assetPath: string;
  private opacity = 0.16;

  public constructor(assetPath: string, name: string) {
    super();
    this.assetPath = assetPath;
    this.name = name;
    this.loadOptionalBackdrop();
  }

  public dispose(): void {
    for (const scene of this.loadedScenes) {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          disposeMaterial(object.material);
        }
      });
    }
  }

  public setBackdropVisible(value: boolean): void {
    this.visible = value;
  }

  public setBackdropOpacity(value: number): void {
    this.opacity = Math.min(Math.max(value, 0), 1);

    for (const scene of this.loadedScenes) {
      this.applyOpacity(scene);
    }
  }

  private loadOptionalBackdrop(): void {
    this.loader.load(
      withBasePath(this.assetPath),
      (gltf) => {
        gltf.scene.name = `${this.name} loaded asset`;
        this.applyOpacity(gltf.scene);
        this.loadedScenes.push(gltf.scene);
        this.add(gltf.scene);
      },
      undefined,
      () => {
        console.info(`Optional backdrop not loaded: ${this.assetPath}. Using procedural scene fallback.`);
      }
    );
  }

  private applyOpacity(scene: THREE.Object3D): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        applyMaterialOpacity(object.material, this.opacity * getObjectOpacityMultiplier(object.name));
        object.renderOrder = -10;
      }
    });
  }
}

function getObjectOpacityMultiplier(objectName: string): number {
  const normalizedName = objectName.toLowerCase();

  if (normalizedName.includes('soft_tissue_boundary')) {
    return 0.35;
  }

  if (normalizedName.includes('beta_cell_backdrop')) {
    return 0.55;
  }

  if (normalizedName.includes('capillary_backdrop')) {
    return 0.75;
  }

  return 0.65;
}

function withBasePath(assetPath: string): string {
  const basePath = import.meta.env.BASE_URL;

  return `${basePath}${assetPath.replace(/^\//, '')}`;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose();
    }
    return;
  }

  material.dispose();
}

function applyMaterialOpacity(material: THREE.Material | THREE.Material[], opacity: number): void {
  if (Array.isArray(material)) {
    for (const entry of material) {
      applySingleMaterialOpacity(entry, opacity);
    }
    return;
  }

  applySingleMaterialOpacity(material, opacity);
}

function applySingleMaterialOpacity(material: THREE.Material, opacity: number): void {
  material.transparent = opacity < 1;
  material.opacity = opacity;
  material.needsUpdate = true;
}
