import * as THREE from 'three';

export function createGolgiRegion(): THREE.Group {
  const golgiGroup = new THREE.Group();
  golgiGroup.name = 'Golgi region';

  const material = new THREE.MeshStandardMaterial({
    color: 0xff8fb3,
    roughness: 0.45,
    metalness: 0.0
  });

  for (let i = 0; i < 6; i += 1) {
    const geometry = new THREE.TorusGeometry(1.2 + i * 0.15, 0.045, 8, 64, Math.PI * 1.35);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-0.5, 1.2 + i * 0.18, 0.25 - i * 0.08);
    mesh.rotation.set(0.4, 0.1, -0.7);
    golgiGroup.add(mesh);
  }

  return golgiGroup;
}
