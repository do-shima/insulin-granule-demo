import './style.css';
import * as THREE from 'three';
import {
  getEllipsoidNormal,
  projectToEllipsoidSurface
} from './biology/betaCellGeometry';
import { cellRadii, secretionPoleDirection } from './biology/betaCellModel';
import { CalciumField } from './objects/CalciumField';
import { ExocytosisSystem } from './objects/ExocytosisSystem';
import { GranuleSystem } from './objects/GranuleSystem';
import { MicrotubuleNetwork } from './objects/MicrotubuleNetwork';
import { SchematicLabels } from './objects/SchematicLabels';
import { createBetaCellShell } from './objects/betaCellShell';
import { createGolgiRegion } from './objects/golgiRegion';
import { createMembraneRing } from './objects/membraneRing';
import { createNucleus } from './objects/nucleus';
import { createSecretionPoleMarker } from './objects/SecretionPoleMarker';
import { createSceneContext } from './scene/createSceneContext';
import {
  type CameraPresetId,
  createSceneControls,
  createSceneInfo,
  createSceneNote,
  getAppMount
} from './utils/dom';

const { scene, camera, renderer, controls } = createSceneContext(getAppMount());

scene.add(createBetaCellShell());
scene.add(createNucleus());
scene.add(createGolgiRegion());
scene.add(createMembraneRing());
scene.add(createSecretionPoleMarker());

const calciumField = new CalciumField();
scene.add(calciumField);

const microtubules = new MicrotubuleNetwork();
scene.add(microtubules);

const exocytosis = new ExocytosisSystem();
scene.add(exocytosis);

const labels = new SchematicLabels();
scene.add(labels);

const granules = new GranuleSystem(undefined, microtubules);
granules.setExocytosisEventHandler((event) => {
  exocytosis.trigger(event);
});
scene.add(granules);

createSceneNote();
const sceneInfo = createSceneInfo(granules.getCount());
sceneInfo.updateStateCounts(granules.getStateCounts());
let animationSpeed = 1;

createSceneControls({
  calciumStimulation: 0.15,
  showMicrotubules: true,
  microtubuleOpacity: 0.34,
  showCalciumField: true,
  showExocytosisParticles: true,
  showLabels: true,
  animationSpeed
}, {
  onCalciumStimulationChange: (value) => {
    granules.setStimulationLevel(value);
    calciumField.setStimulationLevel(value);
  },
  onShowMicrotubulesChange: (value) => {
    microtubules.visible = value;
  },
  onMicrotubuleOpacityChange: (value) => {
    microtubules.setOpacity(value);
  },
  onShowCalciumFieldChange: (value) => {
    calciumField.visible = value;
  },
  onShowExocytosisParticlesChange: (value) => {
    exocytosis.setParticlesVisible(value);
  },
  onShowLabelsChange: (value) => {
    labels.setLabelsVisible(value);
  },
  onAnimationSpeedChange: (value) => {
    animationSpeed = value;
  },
  onCameraPreset: (preset) => {
    applyCameraPreset(preset);
  },
  onResetGranules: () => {
    granules.reset();
    exocytosis.resetEffects();
    sceneInfo.updateStateCounts(granules.getStateCounts());
  }
});

const clock = new THREE.Clock();
let statusElapsed = 0;

function applyCameraPreset(preset: CameraPresetId): void {
  switch (preset) {
    case 'secretionPole': {
      const surfacePoint = projectToEllipsoidSurface(secretionPoleDirection, cellRadii);
      const normal = getEllipsoidNormal(surfacePoint, cellRadii);

      controls.target.copy(surfacePoint);
      camera.position.copy(surfacePoint).addScaledVector(normal, 14).add(new THREE.Vector3(0, 2, 0));
      break;
    }
    case 'transport':
      controls.target.set(2.5, 1.0, 1.8);
      camera.position.set(-13, 9, 24);
      break;
    case 'overview':
      controls.target.set(0, 0, 0);
      camera.position.set(0, 10, 42);
      break;
  }

  controls.update();
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const sceneDeltaTime = deltaTime * animationSpeed;
  statusElapsed += deltaTime;

  granules.update(sceneDeltaTime);
  calciumField.update(sceneDeltaTime);
  exocytosis.update(sceneDeltaTime);
  if (statusElapsed >= 0.5) {
    sceneInfo.updateStateCounts(granules.getStateCounts());
    statusElapsed = 0;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
