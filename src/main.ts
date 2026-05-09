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
import { createStoryModePanel, storySteps, type StoryStep } from './utils/storyMode';

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

function setCalciumStimulation(value: number): void {
  granules.setStimulationLevel(value);
  calciumField.setStimulationLevel(value);
}

function setMicrotubulesVisible(value: boolean): void {
  microtubules.visible = value;
}

function setMicrotubuleOpacity(value: number): void {
  microtubules.setOpacity(value);
}

function setCalciumFieldVisible(value: boolean): void {
  calciumField.visible = value;
}

function setExocytosisParticlesVisible(value: boolean): void {
  exocytosis.setParticlesVisible(value);
}

function setLabelsVisible(value: boolean): void {
  labels.setLabelsVisible(value);
}

function setAnimationSpeed(value: number): void {
  animationSpeed = value;
}

createSceneControls({
  calciumStimulation: 0.15,
  showMicrotubules: true,
  microtubuleOpacity: 0.34,
  showCalciumField: true,
  showExocytosisParticles: true,
  showLabels: true,
  animationSpeed
}, {
  onCalciumStimulationChange: setCalciumStimulation,
  onShowMicrotubulesChange: setMicrotubulesVisible,
  onMicrotubuleOpacityChange: setMicrotubuleOpacity,
  onShowCalciumFieldChange: setCalciumFieldVisible,
  onShowExocytosisParticlesChange: setExocytosisParticlesVisible,
  onShowLabelsChange: setLabelsVisible,
  onAnimationSpeedChange: setAnimationSpeed,
  onCameraPreset: (preset) => {
    applyCameraPreset(preset);
  },
  onResetGranules: () => {
    granules.reset();
    exocytosis.resetEffects();
    sceneInfo.updateStateCounts(granules.getStateCounts());
  }
});

createStoryModePanel(storySteps, applyStoryStep);

const clock = new THREE.Clock();
let statusElapsed = 0;

function applyStoryStep(step: StoryStep): void {
  if (step.settings.calciumStimulation !== undefined) {
    setCalciumStimulation(step.settings.calciumStimulation);
  }

  if (step.settings.showMicrotubules !== undefined) {
    setMicrotubulesVisible(step.settings.showMicrotubules);
  }

  if (step.settings.microtubuleOpacity !== undefined) {
    setMicrotubuleOpacity(step.settings.microtubuleOpacity);
  }

  if (step.settings.showCalciumField !== undefined) {
    setCalciumFieldVisible(step.settings.showCalciumField);
  }

  if (step.settings.showExocytosisParticles !== undefined) {
    setExocytosisParticlesVisible(step.settings.showExocytosisParticles);
  }

  if (step.settings.showLabels !== undefined) {
    setLabelsVisible(step.settings.showLabels);
  }

  if (step.settings.animationSpeed !== undefined) {
    setAnimationSpeed(step.settings.animationSpeed);
  }

  applyCameraPreset(step.cameraPreset);
}

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
