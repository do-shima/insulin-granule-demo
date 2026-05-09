import './style.css';
import * as THREE from 'three';
import {
  getEllipsoidNormal,
  projectToEllipsoidSurface
} from './biology/betaCellGeometry';
import { cellRadii, secretionPoleDirection } from './biology/betaCellModel';
import { CalciumField } from './objects/CalciumField';
import { EndoplasmicReticulum } from './objects/EndoplasmicReticulum';
import { ExocytosisSystem } from './objects/ExocytosisSystem';
import { GranuleSystem } from './objects/GranuleSystem';
import { Mitochondria } from './objects/Mitochondria';
import { MicrotubuleNetwork } from './objects/MicrotubuleNetwork';
import { SchematicLabels } from './objects/SchematicLabels';
import { createBetaCellShell } from './objects/betaCellShell';
import { createGolgiRegion } from './objects/golgiRegion';
import { createMembraneRing } from './objects/membraneRing';
import { createNucleus } from './objects/nucleus';
import { createSecretionPoleMarker } from './objects/SecretionPoleMarker';
import { createSceneContext } from './scene/createSceneContext';
import { createSceneStateController, defaultSceneState, type SceneState } from './state/sceneState';
import {
  type CameraPresetId,
  createSceneControls,
  createSceneInfo,
  createSceneNote,
  getAppMount
} from './utils/dom';
import { FusionEventCounter } from './utils/fusionEventCounter';
import { createStoryModePanel, storySteps, type StoryStep } from './utils/storyMode';

const { scene, camera, renderer, controls } = createSceneContext(getAppMount());

scene.add(createBetaCellShell());
scene.add(createNucleus());
scene.add(createGolgiRegion());
scene.add(createMembraneRing());
scene.add(createSecretionPoleMarker());

const endoplasmicReticulum = new EndoplasmicReticulum();
scene.add(endoplasmicReticulum);

const mitochondria = new Mitochondria();
scene.add(mitochondria);

const calciumField = new CalciumField();
scene.add(calciumField);

const microtubules = new MicrotubuleNetwork();
scene.add(microtubules);

const exocytosis = new ExocytosisSystem();
scene.add(exocytosis);

const fusionEventCounter = new FusionEventCounter();

const labels = new SchematicLabels();
scene.add(labels);

const granules = new GranuleSystem(undefined, microtubules);
granules.setExocytosisEventHandler((event) => {
  fusionEventCounter.recordEvent();
  exocytosis.trigger(event);
});
scene.add(granules);

createSceneNote();
const sceneInfo = createSceneInfo(granules.getCount());
sceneInfo.updateCounts(granules.getStateCounts(), fusionEventCounter.getCounts());

const sceneState = createSceneStateController(defaultSceneState);
let animationSpeed = sceneState.getState().animationSpeed;

function applySceneState(state: Readonly<SceneState>): void {
  granules.setStimulationLevel(state.calciumStimulation);
  calciumField.setStimulationLevel(state.calciumStimulation);
  endoplasmicReticulum.visible = state.showEr;
  mitochondria.visible = state.showMitochondria;
  microtubules.visible = state.showMicrotubules;
  microtubules.setOpacity(state.microtubuleOpacity);
  calciumField.visible = state.showCalciumField;
  exocytosis.setParticlesVisible(state.showExocytosisParticles);
  labels.setLabelsVisible(state.showLabels);
  animationSpeed = state.animationSpeed;
}

const sceneControls = createSceneControls(sceneState.getState(), {
  onCalciumStimulationChange: (value) => sceneState.setState({ calciumStimulation: value }),
  onShowErChange: (value) => sceneState.setState({ showEr: value }),
  onShowMitochondriaChange: (value) => sceneState.setState({ showMitochondria: value }),
  onShowMicrotubulesChange: (value) => sceneState.setState({ showMicrotubules: value }),
  onMicrotubuleOpacityChange: (value) => sceneState.setState({ microtubuleOpacity: value }),
  onShowCalciumFieldChange: (value) => sceneState.setState({ showCalciumField: value }),
  onShowExocytosisParticlesChange: (value) => sceneState.setState({ showExocytosisParticles: value }),
  onShowLabelsChange: (value) => sceneState.setState({ showLabels: value }),
  onAnimationSpeedChange: (value) => sceneState.setState({ animationSpeed: value }),
  onCameraPreset: (preset) => {
    applyCameraPreset(preset);
  },
  onResetGranules: () => {
    granules.reset();
    fusionEventCounter.reset();
    exocytosis.resetEffects();
    sceneInfo.updateCounts(granules.getStateCounts(), fusionEventCounter.getCounts());
  }
});

sceneState.subscribe((state) => {
  applySceneState(state);
  sceneControls.updateValues(state);
});

createStoryModePanel(storySteps, applyStoryStep);

const clock = new THREE.Clock();
let statusElapsed = 0;

function applyStoryStep(step: StoryStep): void {
  sceneState.setState(step.settings);
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
  fusionEventCounter.update(sceneDeltaTime);
  exocytosis.update(sceneDeltaTime);
  if (statusElapsed >= 0.5) {
    sceneInfo.updateCounts(granules.getStateCounts(), fusionEventCounter.getCounts());
    statusElapsed = 0;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
