import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const mount = document.querySelector<HTMLDivElement>('#app');

if (!mount) {
  throw new Error('Missing #app element.');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050812);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 10, 42);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
directionalLight.position.set(20, 20, 20);
scene.add(directionalLight);

const cellRadii = {
  x: 17.5,
  y: 11.0,
  z: 14.0
};

const nucleusPosition = new THREE.Vector3(-4.0, 0.0, 0.0);
const nucleusRadius = 4.2;

const cellGeometry = new THREE.SphereGeometry(1, 64, 32);
cellGeometry.scale(cellRadii.x, cellRadii.y, cellRadii.z);

const cellMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x5aa7ff,
  transparent: true,
  opacity: 0.18,
  roughness: 0.65,
  metalness: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false
});

const cell = new THREE.Mesh(cellGeometry, cellMaterial);
scene.add(cell);

const nucleusGeometry = new THREE.SphereGeometry(nucleusRadius, 48, 24);
const nucleusMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x8b5cf6,
  transparent: true,
  opacity: 0.32,
  roughness: 0.8,
  depthWrite: false
});

const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
nucleus.position.copy(nucleusPosition);
scene.add(nucleus);

const golgiGroup = new THREE.Group();
golgiGroup.name = 'Golgi region';

const golgiMaterial = new THREE.MeshStandardMaterial({
  color: 0xff8fb3,
  roughness: 0.45,
  metalness: 0.0
});

for (let i = 0; i < 6; i += 1) {
  const geometry = new THREE.TorusGeometry(1.2 + i * 0.15, 0.045, 8, 64, Math.PI * 1.35);
  const mesh = new THREE.Mesh(geometry, golgiMaterial);
  mesh.position.set(-0.5, 1.2 + i * 0.18, 0.25 - i * 0.08);
  mesh.rotation.set(0.4, 0.1, -0.7);
  golgiGroup.add(mesh);
}
scene.add(golgiGroup);

const granuleCount = 500;

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

scene.add(shellMesh);
scene.add(haloMesh);
scene.add(coreMesh);

const positions: THREE.Vector3[] = [];
const velocities: THREE.Vector3[] = [];
const scales: number[] = [];
const dummy = new THREE.Object3D();

function isInsideCell(point: THREE.Vector3): boolean {
  const normalized =
    (point.x * point.x) / (cellRadii.x * cellRadii.x) +
    (point.y * point.y) / (cellRadii.y * cellRadii.y) +
    (point.z * point.z) / (cellRadii.z * cellRadii.z);

  return normalized <= 1.0;
}

function isOutsideNucleus(point: THREE.Vector3): boolean {
  return point.distanceTo(nucleusPosition) > nucleusRadius + 1.0;
}

function randomPointInCell(): THREE.Vector3 {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const point = new THREE.Vector3(
      (Math.random() * 2 - 1) * cellRadii.x,
      (Math.random() * 2 - 1) * cellRadii.y,
      (Math.random() * 2 - 1) * cellRadii.z
    );

    if (isInsideCell(point) && isOutsideNucleus(point)) {
      return point;
    }
  }

  return new THREE.Vector3(0, 0, 0);
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
}

function updateGranuleInstance(index: number): void {
  dummy.position.copy(positions[index]);
  dummy.scale.setScalar(scales[index]);
  dummy.updateMatrix();

  shellMesh.setMatrixAt(index, dummy.matrix);
  haloMesh.setMatrixAt(index, dummy.matrix);
  coreMesh.setMatrixAt(index, dummy.matrix);
}

for (let i = 0; i < granuleCount; i += 1) {
  updateGranuleInstance(i);
}

const membraneRingGeometry = new THREE.TorusGeometry(12.2, 0.035, 8, 160);
const membraneRingMaterial = new THREE.MeshBasicMaterial({
  color: 0x93c5fd,
  transparent: true,
  opacity: 0.45
});

const membraneRing = new THREE.Mesh(membraneRingGeometry, membraneRingMaterial);
membraneRing.rotation.x = Math.PI / 2;
membraneRing.scale.set(1.45, 1.15, 1);
scene.add(membraneRing);

const label = document.createElement('div');
label.className = 'scene-note';
label.textContent = 'Schematic visualization; not to scale.';
document.body.appendChild(label);

const info = document.createElement('div');
info.className = 'scene-info';
info.innerHTML = `
  <strong>Insulin secretory granules</strong><br />
  Pancreatic beta-cell schematic<br />
  Granules: ${granuleCount}
`;
document.body.appendChild(info);

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const speed = deltaTime * 60.0;

  for (let i = 0; i < granuleCount; i += 1) {
    const position = positions[i];
    const velocity = velocities[i];

    position.addScaledVector(velocity, speed);

    if (!isInsideCell(position) || !isOutsideNucleus(position)) {
      velocity.multiplyScalar(-1);
      position.addScaledVector(velocity, speed * 2.0);
    }

    updateGranuleInstance(i);
  }

  shellMesh.instanceMatrix.needsUpdate = true;
  haloMesh.instanceMatrix.needsUpdate = true;
  coreMesh.instanceMatrix.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
