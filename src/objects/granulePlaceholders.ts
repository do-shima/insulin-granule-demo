import * as THREE from 'three';
import {
  granuleCount,
  isInsideCell,
  isOutsideNucleus,
  randomPointInCell
} from '../biology/betaCellModel';

export interface GranulePlaceholders {
  shellMesh: THREE.InstancedMesh;
  haloMesh: THREE.InstancedMesh;
  coreMesh: THREE.InstancedMesh;
  update: (deltaTime: number) => void;
}

export function createGranulePlaceholders(): GranulePlaceholders {
  const shellGeometry = new THREE.SphereGeometry(0.26, 16, 8);
  const haloGeometry = new THREE.SphereGeometry(0.20, 16, 8);
  const coreGeometry = new THREE.SphereGeometry(0.12, 16, 8);

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdca3,
    transparent: true,
    opacity: 0.28,
    roughness: 0.6,
    depthWrite: false
  });

  const haloMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    transparent: true,
    opacity: 0.42,
    roughness: 0.6,
    depthWrite: false
  });

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb000,
    roughness: 0.45
  });

  const shellMesh = new THREE.InstancedMesh(shellGeometry, shellMaterial, granuleCount);
  const haloMesh = new THREE.InstancedMesh(haloGeometry, haloMaterial, granuleCount);
  const coreMesh = new THREE.InstancedMesh(coreGeometry, coreMaterial, granuleCount);

  shellMesh.name = 'Insulin granule vesicle shells';
  haloMesh.name = 'Insulin granule halos';
  coreMesh.name = 'Dense insulin cores';

  const positions: THREE.Vector3[] = [];
  const velocities: THREE.Vector3[] = [];
  const scales: number[] = [];
  const dummy = new THREE.Object3D();

  function updateInstance(index: number): void {
    dummy.position.copy(positions[index]);
    dummy.scale.setScalar(scales[index]);
    dummy.updateMatrix();

    shellMesh.setMatrixAt(index, dummy.matrix);
    haloMesh.setMatrixAt(index, dummy.matrix);
    coreMesh.setMatrixAt(index, dummy.matrix);
  }

  for (let i = 0; i < granuleCount; i += 1) {
    const position = randomPointInCell();

    positions.push(position);
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.025,
        (Math.random() - 0.5) * 0.025,
        (Math.random() - 0.5) * 0.025
      )
    );
    scales.push(0.75 + Math.random() * 0.55);
    updateInstance(i);
  }

  function update(deltaTime: number): void {
    const speed = deltaTime * 60.0;

    for (let i = 0; i < granuleCount; i += 1) {
      const position = positions[i];
      const velocity = velocities[i];

      position.addScaledVector(velocity, speed);

      if (!isInsideCell(position) || !isOutsideNucleus(position)) {
        velocity.multiplyScalar(-1);
        position.addScaledVector(velocity, speed * 2.0);
      }

      updateInstance(i);
    }

    shellMesh.instanceMatrix.needsUpdate = true;
    haloMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;
  }

  return {
    shellMesh,
    haloMesh,
    coreMesh,
    update
  };
}
