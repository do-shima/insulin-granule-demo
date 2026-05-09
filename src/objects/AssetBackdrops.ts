import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetBackdrops extends THREE.Group {
  private readonly loader = new GLTFLoader();
  private readonly loadedScenes: THREE.Object3D[] = [];
  private readonly assetPath: string;

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

  private loadOptionalBackdrop(): void {
    this.loader.load(
      withBasePath(this.assetPath),
      (gltf) => {
        gltf.scene.name = `${this.name} loaded asset`;
        this.loadedScenes.push(gltf.scene);
        this.add(gltf.scene);
      },
      undefined,
      () => {
        console.info(`Optional backdrop not loaded: ${this.assetPath}. Using procedural scene fallback.`);
      }
    );
  }
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
