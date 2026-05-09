import './style.css';
import * as THREE from 'three';
import {
  getEllipsoidNormal,
  projectToEllipsoidSurface
} from './biology/betaCellGeometry';
import { cellRadii, secretionPoleDirection } from './biology/betaCellModel';
import { AssetBackdrops } from './objects/AssetBackdrops';
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
import { SelectedCellHighlight } from './objects/SelectedCellHighlight';
import { VascularContactPatches } from './objects/VascularContactPatches';
import { createBetaCellShell } from './objects/betaCellShell';
import { createGolgiRegion } from './objects/golgiRegion';
import { createMembraneRing } from './objects/membraneRing';
import { createNucleus } from './objects/nucleus';
import { createSecretionPoleMarker } from './objects/SecretionPoleMarker';
import { createSceneContext } from './scene/createSceneContext';
import {
  createSceneStateController,
  defaultSceneState,
  type DemoMode,
  type SceneState
} from './state/sceneState';
import {
  type CameraPresetId,
  createSceneControls,
  createSceneInfo,
  createSceneNote,
  createPresentationModeExitButton,
  getAppMount
} from './utils/dom';
import { parseInitialDeepLink } from './utils/deepLinks';
import { FusionEventCounter } from './utils/fusionEventCounter';
import { saveRendererScreenshot } from './utils/screenshot';
import { createStoryModePanel, storySteps, type StoryStep } from './utils/storyMode';
import { createWelcomeOverlay } from './utils/welcomeOverlay';

const { scene, camera, renderer, controls } = createSceneContext(getAppMount());

const singleCellGroup = new THREE.Group();
singleCellGroup.name = 'Single-cell granule demo';
scene.add(singleCellGroup);

const singleCellBackdrop = new AssetBackdrops('assets/single_cell_backdrop.glb', 'Single-cell optional GLB backdrop');
singleCellGroup.add(singleCellBackdrop);
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
const multicellBackdrop = new AssetBackdrops('assets/multicell_backdrop.glb', 'Multicell optional GLB backdrop');
multicellPlaceholder.add(multicellBackdrop);
const capillaryNetwork = new CapillaryNetwork();
const isletCellCluster = new IsletCellCluster(capillaryNetwork);
const vascularContactPatches = new VascularContactPatches(isletCellCluster.getCells());
const polarityVectorField = new PolarityVectorField(isletCellCluster.getCells());
const selectedCellHighlight = new SelectedCellHighlight(
  isletCellCluster.getCellById(isletCellCluster.getDefaultSelectedCellId())
);
const multicellReleaseParticles = new MulticellReleaseParticles(isletCellCluster.getCells());
multicellReleaseParticles.setEventHandler(() => {
  multicellReleaseEventCounter.recordEvent();
});
multicellPlaceholder.add(isletCellCluster);
multicellPlaceholder.add(vascularContactPatches);
multicellPlaceholder.add(polarityVectorField);
multicellPlaceholder.add(selectedCellHighlight);
multicellPlaceholder.add(multicellReleaseParticles);
multicellPlaceholder.add(capillaryNetwork);
scene.add(multicellPlaceholder);

createSceneNote();
const sceneInfo = createSceneInfo(granules.getCount());

const sceneState = createSceneStateController({
  ...defaultSceneState,
  selectedCellId: isletCellCluster.getDefaultSelectedCellId()
});
createPresentationModeExitButton(() => {
  sceneState.setState({ presentationMode: false });
});
let animationSpeed = sceneState.getState().animationSpeed;
let activeDemoMode: DemoMode = sceneState.getState().demoMode;
updateSceneInfo();

function applySceneState(state: Readonly<SceneState>): void {
  const isSingleCellMode = state.demoMode === 'singleCell';

  singleCellGroup.visible = isSingleCellMode;
  multicellPlaceholder.visible = state.demoMode === 'multicellVascular';
  activeDemoMode = state.demoMode;
  const showMulticellLabels = state.showLabels && !isSingleCellMode;
  const showFullMulticellLabels = showMulticellLabels && state.multicellLabelDetail === 'full';

  granules.setStimulationLevel(state.calciumStimulation);
  calciumField.setStimulationLevel(state.calciumStimulation);
  multicellReleaseParticles.setStimulationLevel(state.calciumStimulation);
  singleCellBackdrop.setBackdropVisible(state.showBlenderBackdrops);
  singleCellBackdrop.setBackdropOpacity(state.backdropOpacity);
  multicellBackdrop.setBackdropVisible(state.showBlenderBackdrops);
  multicellBackdrop.setBackdropOpacity(state.backdropOpacity);
  endoplasmicReticulum.visible = state.showEr;
  mitochondria.visible = state.showMitochondria;
  microtubules.visible = state.showMicrotubules;
  microtubules.setOpacity(state.microtubuleOpacity);
  calciumField.visible = state.showCalciumField;
  exocytosis.setParticlesVisible(state.showExocytosisParticles);
  labels.setLabelsVisible(state.showLabels);
  multicellPlaceholder.setLabelVisible(showFullMulticellLabels);
  capillaryNetwork.setLabelsVisible(showMulticellLabels);
  capillaryNetwork.setBackdropContextVisible(state.showBlenderBackdrops);
  vascularContactPatches.setPatchesVisible(state.showVascularContactPatches);
  vascularContactPatches.setReleaseParticlesVisible(state.showMulticellReleaseParticles);
  vascularContactPatches.setLabelsVisible(showFullMulticellLabels);
  polarityVectorField.setVectorsVisible(state.showPolarityVectors);
  polarityVectorField.setLabelsVisible(showMulticellLabels && state.showPolarityVectors);
  selectedCellHighlight.setSelectedCell(isletCellCluster.getCellById(state.selectedCellId));
  selectedCellHighlight.setLabelsVisible(showMulticellLabels);
  selectedCellHighlight.setPatchVisible(state.showVascularContactPatches);
  selectedCellHighlight.setVectorVisible(state.showPolarityVectors);
  multicellReleaseParticles.setParticlesVisible(state.showMulticellReleaseParticles);
  document.body.classList.toggle('presentation-mode', state.presentationMode);
  animationSpeed = state.animationSpeed;
}

function updateSceneInfo(): void {
  const currentState = sceneState.getState();

  sceneInfo.updateCounts({
    demoMode: currentState.demoMode,
    openedSelectedCellDetail: currentState.openedSelectedCellDetail,
    calciumStimulation: currentState.calciumStimulation,
    stateCounts: granules.getStateCounts(),
    fusionEvents: fusionEventCounter.getCounts(),
    multicellReleaseEvents: multicellReleaseEventCounter.getCounts()
  });
}

const sceneControls = createSceneControls(sceneState.getState(), {
  onDemoModeChange: (value) => {
    sceneState.setState({
      demoMode: value,
      openedSelectedCellDetail: false,
      multicellLabelDetail: value === 'multicellVascular' ? 'compact' : sceneState.getState().multicellLabelDetail
    });
    if (value === 'multicellVascular') {
      applyCameraPreset('multicellOverview');
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
  onShowBlenderBackdropsChange: (value) => sceneState.setState({ showBlenderBackdrops: value }),
  onBackdropOpacityChange: (value) => sceneState.setState({ backdropOpacity: value }),
  onMulticellLabelDetailChange: (value) => sceneState.setState({ multicellLabelDetail: value }),
  onPresentationModeChange: (value) => sceneState.setState({ presentationMode: value }),
  onAnimationSpeedChange: (value) => sceneState.setState({ animationSpeed: value }),
  onCameraPreset: (preset) => {
    applyCameraPreset(preset);
  },
  onOpenSelectedCellDetail: () => {
    sceneState.setState({
      demoMode: 'singleCell',
      openedSelectedCellDetail: true,
      showLabels: true,
      calciumStimulation: 0.35
    });
    applyCameraPreset('secretionPole');
  },
  onPreviousSelectedCell: () => {
    selectRelativeCell(-1);
  },
  onNextSelectedCell: () => {
    selectRelativeCell(1);
  },
  onSaveScreenshot: () => {
    controls.update();
    saveRendererScreenshot(renderer, scene, camera);
  },
  onResetGranules: () => {
    if (activeDemoMode === 'singleCell') {
      granules.reset();
      fusionEventCounter.reset();
      exocytosis.resetEffects();
    } else {
      multicellReleaseEventCounter.reset();
      multicellReleaseParticles.resetEffects();
    }

    updateSceneInfo();
  }
});

function selectRelativeCell(offset: number): void {
  const currentSelectedCellId = sceneState.getState().selectedCellId;
  const cellCount = isletCellCluster.getCellCount();
  const selectedCellId = ((currentSelectedCellId + offset) % cellCount + cellCount) % cellCount;

  sceneState.setState({ selectedCellId });
}

sceneState.subscribe((state) => {
  applySceneState(state);
  sceneControls.updateValues(state);
  updateSceneInfo();
});

const storyPanel = createStoryModePanel(storySteps, applyStoryStep);

const welcomeOverlay = createWelcomeOverlay({
  onStartStory: () => {
    storyPanel.applyStep(0);
  },
  onOpenSingleCell: () => {
    sceneState.setState({
      demoMode: 'singleCell',
      openedSelectedCellDetail: false,
      showLabels: true,
      calciumStimulation: 0.15
    });
    applyCameraPreset('overview');
  },
  onOpenMulticell: () => {
    sceneState.setState({
      demoMode: 'multicellVascular',
      openedSelectedCellDetail: false,
      showLabels: true,
      calciumStimulation: 0.15,
      multicellLabelDetail: 'compact',
      showVascularContactPatches: true,
      showPolarityVectors: true,
      showMulticellReleaseParticles: false
    });
    applyCameraPreset('multicellOverview');
  }
});
applyInitialDeepLink();

const clock = new THREE.Clock();
let statusElapsed = 0;

function applyInitialDeepLink(): void {
  const deepLink = parseInitialDeepLink();

  if (deepLink.storyIndex !== undefined) {
    storyPanel.applyStep(deepLink.storyIndex);
  } else if (deepLink.mode !== undefined) {
    sceneState.setState({
      demoMode: deepLink.mode,
      openedSelectedCellDetail: false,
      multicellLabelDetail: deepLink.mode === 'multicellVascular' ? 'compact' : sceneState.getState().multicellLabelDetail
    });
    applyCameraPreset(deepLink.mode === 'multicellVascular' ? 'multicellOverview' : 'overview');
  }

  if (deepLink.presentationMode) {
    sceneState.setState({ presentationMode: true });
  }

  if (deepLink.hasValidParameter) {
    welcomeOverlay.close();
  }
}

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
    case 'multicellOverview':
      controls.target.set(0, -0.6, 0);
      camera.position.set(0, 12, 27);
      break;
    case 'capillaryPolarity':
      controls.target.set(-0.5, -1.6, 1.1);
      camera.position.set(-8.5, 5.2, 13.5);
      break;
    case 'vascularRelease':
      controls.target.set(1.6, -2.8, 0.6);
      camera.position.set(6.7, 1.8, 9.2);
      break;
  }

  controls.update();
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const sceneDeltaTime = deltaTime * animationSpeed;
  statusElapsed += deltaTime;

  if (activeDemoMode === 'singleCell') {
    granules.update(sceneDeltaTime);
    calciumField.update(sceneDeltaTime);
    fusionEventCounter.update(sceneDeltaTime);
    exocytosis.update(sceneDeltaTime);
  } else {
    multicellReleaseEventCounter.update(sceneDeltaTime);
    multicellReleaseParticles.update(sceneDeltaTime);
  }

  if (statusElapsed >= 0.5) {
    updateSceneInfo();
    statusElapsed = 0;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
