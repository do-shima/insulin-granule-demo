import './style.css';
import * as THREE from 'three';
import {
  getEllipsoidNormal,
  projectToEllipsoidSurface
} from './biology/betaCellGeometry';
import { cellRadii, secretionPoleDirection } from './biology/betaCellModel';
import { CalciumField } from './objects/CalciumField';
import { CapillaryNetwork } from './objects/CapillaryNetwork';
import { EndoplasmicReticulum } from './objects/EndoplasmicReticulum';
import { ExocytosisSystem } from './objects/ExocytosisSystem';
import { GranuleSystem } from './objects/GranuleSystem';
import { IsletCellCluster } from './objects/IsletCellCluster';
import { Mitochondria } from './objects/Mitochondria';
import { MicrotubuleNetwork } from './objects/MicrotubuleNetwork';
import { MulticellVascularPlaceholder } from './objects/MulticellVascularPlaceholder';
import { MulticellReleaseParticles } from './objects/MulticellReleaseParticles';
import { PolarityVectorField } from './objects/PolarityVectorField';
import { SchematicLabels } from './objects/SchematicLabels';
import { VascularContactPatches } from './objects/VascularContactPatches';
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

const singleCellGroup = new THREE.Group();
singleCellGroup.name = 'Single-cell granule demo';
scene.add(singleCellGroup);

singleCellGroup.add(createBetaCellShell());
singleCellGroup.add(createNucleus());
singleCellGroup.add(createGolgiRegion());
singleCellGroup.add(createMembraneRing());
singleCellGroup.add(createSecretionPoleMarker());

const endoplasmicReticulum = new EndoplasmicReticulum();
singleCellGroup.add(endoplasmicReticulum);

const mitochondria = new Mitochondria();
singleCellGroup.add(mitochondria);

const calciumField = new CalciumField();
singleCellGroup.add(calciumField);

const microtubules = new MicrotubuleNetwork();
singleCellGroup.add(microtubules);

const exocytosis = new ExocytosisSystem();
singleCellGroup.add(exocytosis);

const fusionEventCounter = new FusionEventCounter();
const multicellReleaseEventCounter = new FusionEventCounter();

const labels = new SchematicLabels();
singleCellGroup.add(labels);

const granules = new GranuleSystem(undefined, microtubules);
granules.setExocytosisEventHandler((event) => {
  fusionEventCounter.recordEvent();
  exocytosis.trigger(event);
});
singleCellGroup.add(granules);

const multicellPlaceholder = new MulticellVascularPlaceholder();
const capillaryNetwork = new CapillaryNetwork();
const isletCellCluster = new IsletCellCluster(capillaryNetwork);
const vascularContactPatches = new VascularContactPatches(isletCellCluster.getCells());
const polarityVectorField = new PolarityVectorField(isletCellCluster.getCells());
const multicellReleaseParticles = new MulticellReleaseParticles(isletCellCluster.getCells());
multicellReleaseParticles.setEventHandler(() => {
  multicellReleaseEventCounter.recordEvent();
});
multicellPlaceholder.add(isletCellCluster);
multicellPlaceholder.add(vascularContactPatches);
multicellPlaceholder.add(polarityVectorField);
multicellPlaceholder.add(multicellReleaseParticles);
multicellPlaceholder.add(capillaryNetwork);
scene.add(multicellPlaceholder);

createSceneNote();
const sceneInfo = createSceneInfo(granules.getCount());
sceneInfo.updateCounts(
  granules.getStateCounts(),
  fusionEventCounter.getCounts(),
  multicellReleaseEventCounter.getCounts()
);

const sceneState = createSceneStateController(defaultSceneState);
let animationSpeed = sceneState.getState().animationSpeed;
let isMulticellMode = sceneState.getState().demoMode === 'multicellVascular';

function applySceneState(state: Readonly<SceneState>): void {
  const isSingleCellMode = state.demoMode === 'singleCell';

  singleCellGroup.visible = isSingleCellMode;
  multicellPlaceholder.visible = state.demoMode === 'multicellVascular';
  isMulticellMode = state.demoMode === 'multicellVascular';
  granules.setStimulationLevel(state.calciumStimulation);
  calciumField.setStimulationLevel(state.calciumStimulation);
  multicellReleaseParticles.setStimulationLevel(state.calciumStimulation);
  endoplasmicReticulum.visible = state.showEr;
  mitochondria.visible = state.showMitochondria;
  microtubules.visible = state.showMicrotubules;
  microtubules.setOpacity(state.microtubuleOpacity);
  calciumField.visible = state.showCalciumField;
  exocytosis.setParticlesVisible(state.showExocytosisParticles);
  labels.setLabelsVisible(state.showLabels);
  capillaryNetwork.setLabelsVisible(state.showLabels);
  vascularContactPatches.setPatchesVisible(state.showVascularContactPatches);
  vascularContactPatches.setReleaseParticlesVisible(state.showMulticellReleaseParticles);
  vascularContactPatches.setLabelsVisible(state.showLabels);
  polarityVectorField.setVectorsVisible(state.showPolarityVectors);
  polarityVectorField.setLabelsVisible(state.showLabels);
  multicellReleaseParticles.setParticlesVisible(state.showMulticellReleaseParticles);
  animationSpeed = state.animationSpeed;
}

const sceneControls = createSceneControls(sceneState.getState(), {
  onDemoModeChange: (value) => {
    sceneState.setState({ demoMode: value });
    if (value === 'multicellVascular') {
      applyCameraPreset('overview');
    }
  },
  onCalciumStimulationChange: (value) => sceneState.setState({ calciumStimulation: value }),
  onShowErChange: (value) => sceneState.setState({ showEr: value }),
  onShowMitochondriaChange: (value) => sceneState.setState({ showMitochondria: value }),
  onShowMicrotubulesChange: (value) => sceneState.setState({ showMicrotubules: value }),
  onMicrotubuleOpacityChange: (value) => sceneState.setState({ microtubuleOpacity: value }),
  onShowCalciumFieldChange: (value) => sceneState.setState({ showCalciumField: value }),
  onShowExocytosisParticlesChange: (value) => sceneState.setState({ showExocytosisParticles: value }),
  onShowLabelsChange: (value) => sceneState.setState({ showLabels: value }),
  onShowVascularContactPatchesChange: (value) => sceneState.setState({ showVascularContactPatches: value }),
  onShowPolarityVectorsChange: (value) => sceneState.setState({ showPolarityVectors: value }),
  onShowMulticellReleaseParticlesChange: (value) => sceneState.setState({ showMulticellReleaseParticles: value }),
  onAnimationSpeedChange: (value) => sceneState.setState({ animationSpeed: value }),
  onCameraPreset: (preset) => {
    applyCameraPreset(preset);
  },
  onResetGranules: () => {
    granules.reset();
    fusionEventCounter.reset();
    multicellReleaseEventCounter.reset();
    exocytosis.resetEffects();
    multicellReleaseParticles.resetEffects();
    sceneInfo.updateCounts(
      granules.getStateCounts(),
      fusionEventCounter.getCounts(),
      multicellReleaseEventCounter.getCounts()
    );
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
  multicellReleaseEventCounter.update(sceneDeltaTime);
  exocytosis.update(sceneDeltaTime);
  if (isMulticellMode) {
    multicellReleaseParticles.update(sceneDeltaTime);
  }
  if (statusElapsed >= 0.5) {
    sceneInfo.updateCounts(
      granules.getStateCounts(),
      fusionEventCounter.getCounts(),
      multicellReleaseEventCounter.getCounts()
    );
    statusElapsed = 0;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
