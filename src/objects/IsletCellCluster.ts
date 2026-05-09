import * as THREE from 'three';
import { createIsletCellModels, type IsletCellModel } from '../biology/multicellModel';
import { CapillaryNetwork } from './CapillaryNetwork';

export class IsletCellCluster extends THREE.Group {
  public readonly cells: readonly IsletCellModel[];

  private readonly geometry: THREE.SphereGeometry;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly mesh: THREE.InstancedMesh;
  private readonly instanceMatrix = new THREE.Matrix4();
  private readonly instanceQuaternion = new THREE.Quaternion();

  public constructor(capillaryNetwork: CapillaryNetwork, count = 48) {
    super();
    this.name = 'Schematic multicell beta-cell cluster';
    this.cells = createIsletCellModels(
      capillaryNetwork.getSampledPoints(),
      (position) => capillaryNetwork.getNearestPointData(position),
      count
    );

    this.geometry = new THREE.SphereGeometry(1, 32, 20);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.2,
      roughness: 0.76,
      metalness: 0.02,
      side: THREE.DoubleSide,
      vertexColors: true
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.cells.length);
    this.mesh.name = 'Instanced beta-cell ellipsoid shells';
    this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    this.populateInstances();
    this.add(this.mesh);
  }

  public getCells(): readonly IsletCellModel[] {
    return this.cells;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private populateInstances(): void {
    for (const cell of this.cells) {
      this.instanceQuaternion.setFromEuler(cell.rotation);
      this.instanceMatrix.compose(cell.center, this.instanceQuaternion, cell.radii);
      this.mesh.setMatrixAt(cell.id, this.instanceMatrix);
      this.mesh.setColorAt(cell.id, cell.color);
    }

    this.mesh.instanceMatrix.needsUpdate = true;

    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
