import type { SceneState } from '../state/sceneState';
import { createCollapsiblePanel, shouldCollapsePanelsByDefault, type CameraPresetId } from './dom';

export interface StoryStep {
  readonly title: string;
  readonly text: string;
  readonly cameraPreset: CameraPresetId;
  readonly settings: Partial<SceneState>;
}

export interface StoryModePanel {
  readonly element: HTMLDivElement;
  applyStep: (index: number) => void;
}

export const storySteps: StoryStep[] = [
  {
    title: '1. Overview',
    cameraPreset: 'overview',
    settings: {
      demoMode: 'singleCell',
      calciumStimulation: 0.15,
      showLabels: true,
      showMicrotubules: true,
      microtubuleOpacity: 0.34,
      showCalciumField: true,
      showExocytosisParticles: true
    },
    text:
      'A schematic pancreatic beta cell contains insulin secretory granules, a nucleus, Golgi region, microtubules, and a secretion pole.'
  },
  {
    title: '2. Granule Maturation Near Golgi',
    cameraPreset: 'transport',
    settings: {
      demoMode: 'singleCell',
      calciumStimulation: 0.15,
      showLabels: true,
      showMicrotubules: true,
      microtubuleOpacity: 0.28,
      showCalciumField: false,
      showExocytosisParticles: true
    },
    text:
      'New insulin granules are represented near the Golgi region before joining the mature granule pool.'
  },
  {
    title: '3. Microtubule-Associated Transport',
    cameraPreset: 'transport',
    settings: {
      demoMode: 'singleCell',
      calciumStimulation: 0.2,
      showLabels: true,
      showMicrotubules: true,
      microtubuleOpacity: 0.78,
      showCalciumField: false,
      showExocytosisParticles: true
    },
    text:
      'A subset of mature granules moves along schematic microtubule-like paths toward the cell periphery.'
  },
  {
    title: '4. Docking And Priming',
    cameraPreset: 'secretionPole',
    settings: {
      demoMode: 'singleCell',
      calciumStimulation: 0.25,
      showLabels: true,
      showMicrotubules: true,
      microtubuleOpacity: 0.42,
      showCalciumField: false,
      showExocytosisParticles: true
    },
    text:
      'Some granules dock and prime near a schematic secretion domain at the plasma membrane.'
  },
  {
    title: '5. Calcium-Triggered Exocytosis',
    cameraPreset: 'secretionPole',
    settings: {
      demoMode: 'singleCell',
      calciumStimulation: 0.85,
      showLabels: true,
      showMicrotubules: true,
      microtubuleOpacity: 0.35,
      showCalciumField: true,
      showExocytosisParticles: true
    },
    text:
      'In this demo, increasing calcium stimulation increases the probability of schematic fusion events and signal particle release.'
  }
];

export function createStoryModePanel(
  steps: readonly StoryStep[],
  onStepChange: (step: StoryStep) => void
): StoryModePanel {
  const panel = document.createElement('div');
  panel.className = 'story-panel';
  const { body } = createCollapsiblePanel(panel, 'Guided story', shouldCollapsePanelsByDefault());

  const title = document.createElement('div');
  title.className = 'story-title';

  const text = document.createElement('p');
  text.className = 'story-text';

  const caveat = document.createElement('div');
  caveat.className = 'story-caveat';
  caveat.textContent = 'Demo visualization; not a quantitative model of insulin secretion.';

  const stepCounter = document.createElement('div');
  stepCounter.className = 'story-counter';

  const controls = document.createElement('div');
  controls.className = 'story-controls';

  const previousButton = createStoryButton('Previous');
  const playButton = createStoryButton('Play');
  const nextButton = createStoryButton('Next');
  controls.append(previousButton, playButton, nextButton);
  body.append(title, text, caveat, stepCounter, controls);
  document.body.appendChild(panel);

  let currentIndex = 0;
  let autoPlayTimer: number | undefined;

  function render(): void {
    const step = steps[currentIndex];

    title.textContent = step.title;
    text.textContent = step.text;
    stepCounter.textContent = `${currentIndex + 1} / ${steps.length}`;
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === steps.length - 1;
    onStepChange(step);
  }

  function stopAutoPlay(): void {
    if (autoPlayTimer !== undefined) {
      window.clearInterval(autoPlayTimer);
      autoPlayTimer = undefined;
    }

    playButton.textContent = 'Play';
  }

  function applyStep(index: number): void {
    currentIndex = Math.min(Math.max(index, 0), steps.length - 1);
    render();
  }

  previousButton.addEventListener('click', () => {
    stopAutoPlay();
    applyStep(currentIndex - 1);
  });

  nextButton.addEventListener('click', () => {
    stopAutoPlay();
    applyStep(currentIndex + 1);
  });

  playButton.addEventListener('click', () => {
    if (autoPlayTimer !== undefined) {
      stopAutoPlay();
      return;
    }

    playButton.textContent = 'Pause';
    autoPlayTimer = window.setInterval(() => {
      if (currentIndex >= steps.length - 1) {
        stopAutoPlay();
        return;
      }

      applyStep(currentIndex + 1);
    }, 7000);
  });

  render();

  return {
    element: panel,
    applyStep
  };
}

function createStoryButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scene-control-button story-button';
  button.textContent = label;

  return button;
}
