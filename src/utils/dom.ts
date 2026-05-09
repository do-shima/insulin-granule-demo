import type { GranuleStateCounts } from '../biology/granuleStates';
import type { FusionEventCounts } from './fusionEventCounter';

const stateDisplayRows = [
  { key: 'immature', label: 'Immature' },
  { key: 'mature', label: 'Mature' },
  { key: 'transporting', label: 'Transporting' },
  { key: 'docked', label: 'Docked' },
  { key: 'primed', label: 'Primed' },
  { key: 'fusing', label: 'Fusing' },
  { key: 'released', label: 'Released' }
] as const;

export function getAppMount(): HTMLDivElement {
  const mount = document.querySelector<HTMLDivElement>('#app');

  if (!mount) {
    throw new Error('Missing #app element.');
  }

  return mount;
}

export function createSceneNote(): HTMLDivElement {
  const label = document.createElement('div');
  label.className = 'scene-note';
  label.innerHTML = `
    <div>Schematic visualization; not to scale.</div>
    <div>Educational demo only; not a real secretion simulation.</div>
  `;
  document.body.appendChild(label);

  return label;
}

export interface SceneInfoPanel {
  element: HTMLDivElement;
  updateCounts: (stateCounts: GranuleStateCounts, fusionEvents: FusionEventCounts) => void;
}

export interface SceneControlValues {
  calciumStimulation: number;
  showEr: boolean;
  showMitochondria: boolean;
  showMicrotubules: boolean;
  microtubuleOpacity: number;
  showCalciumField: boolean;
  showExocytosisParticles: boolean;
  showLabels: boolean;
  animationSpeed: number;
}

export type CameraPresetId = 'overview' | 'secretionPole' | 'transport';

export interface SceneControlCallbacks {
  onCalciumStimulationChange: (value: number) => void;
  onShowErChange: (value: boolean) => void;
  onShowMitochondriaChange: (value: boolean) => void;
  onShowMicrotubulesChange: (value: boolean) => void;
  onMicrotubuleOpacityChange: (value: number) => void;
  onShowCalciumFieldChange: (value: boolean) => void;
  onShowExocytosisParticlesChange: (value: boolean) => void;
  onShowLabelsChange: (value: boolean) => void;
  onAnimationSpeedChange: (value: number) => void;
  onCameraPreset: (preset: CameraPresetId) => void;
  onResetGranules: () => void;
}

export function createSceneInfo(granuleCount: number): SceneInfoPanel {
  const info = document.createElement('div');
  info.className = 'scene-info';

  function updateCounts(counts: GranuleStateCounts, fusionEvents: FusionEventCounts): void {
    const accounted =
      counts.immature +
      counts.mature +
      counts.transporting +
      counts.docked +
      counts.primed +
      counts.fusing +
      counts.released;

    const stateRows = stateDisplayRows
      .map(({ key, label }) => createStateCountRow(label, counts[key], granuleCount))
      .join('');

    info.innerHTML = `
  <div class="scene-info-title">Insulin secretory granules</div>
  <div>Pancreatic beta-cell schematic</div>
  <div>Granules: ${granuleCount}</div>
  <div>Counted states: ${accounted}</div>
  <div class="state-counts-title">Schematic fusion events</div>
  <div>Total schematic fusion events: ${fusionEvents.total}</div>
  <div>Events in last 10 seconds: ${fusionEvents.recent}</div>
  <div class="state-counts-title">Schematic granule states</div>
  <div class="scene-info-caveat">State counts are visual demo states, not measured biological counts.</div>
  <div class="state-counts">${stateRows}</div>
`;
  }

  updateCounts(createZeroStateCounts(), { total: 0, recent: 0 });
  document.body.appendChild(info);

  return {
    element: info,
    updateCounts
  };
}

function createZeroStateCounts(): GranuleStateCounts {
  return {
    immature: 0,
    mature: 0,
    transporting: 0,
    docked: 0,
    primed: 0,
    fusing: 0,
    released: 0
  };
}

function createStateCountRow(label: string, count: number, total: number): string {
  const percentage = total > 0 ? Math.min(Math.max((count / total) * 100, 0), 100) : 0;

  return `
    <div class="state-count-row">
      <div class="state-count-label">${label}</div>
      <div class="state-count-track">
        <div class="state-count-bar" style="width: ${percentage.toFixed(2)}%"></div>
      </div>
      <div class="state-count-value">${count}</div>
    </div>
  `;
}

export function createSceneControls(
  initialValues: SceneControlValues,
  callbacks: SceneControlCallbacks
): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'scene-controls';

  const title = document.createElement('div');
  title.className = 'scene-controls-title';
  title.textContent = 'Schematic controls';
  panel.appendChild(title);

  panel.appendChild(
    createRangeControl({
      label: 'Calcium stimulation',
      min: 0,
      max: 1,
      step: 0.01,
      value: initialValues.calciumStimulation,
      onChange: callbacks.onCalciumStimulationChange
    })
  );
  panel.appendChild(
    createCheckboxControl({
      label: 'Show ER',
      checked: initialValues.showEr,
      onChange: callbacks.onShowErChange
    })
  );
  panel.appendChild(
    createCheckboxControl({
      label: 'Show mitochondria',
      checked: initialValues.showMitochondria,
      onChange: callbacks.onShowMitochondriaChange
    })
  );
  panel.appendChild(
    createCheckboxControl({
      label: 'Show microtubules',
      checked: initialValues.showMicrotubules,
      onChange: callbacks.onShowMicrotubulesChange
    })
  );
  panel.appendChild(
    createRangeControl({
      label: 'Microtubule opacity',
      min: 0,
      max: 1,
      step: 0.01,
      value: initialValues.microtubuleOpacity,
      onChange: callbacks.onMicrotubuleOpacityChange
    })
  );
  panel.appendChild(
    createCheckboxControl({
      label: 'Show calcium field',
      checked: initialValues.showCalciumField,
      onChange: callbacks.onShowCalciumFieldChange
    })
  );
  panel.appendChild(
    createCheckboxControl({
      label: 'Show release signal',
      checked: initialValues.showExocytosisParticles,
      onChange: callbacks.onShowExocytosisParticlesChange
    })
  );
  panel.appendChild(
    createCheckboxControl({
      label: 'Show labels',
      checked: initialValues.showLabels,
      onChange: callbacks.onShowLabelsChange
    })
  );
  panel.appendChild(
    createRangeControl({
      label: 'Animation speed',
      min: 0.1,
      max: 3,
      step: 0.1,
      value: initialValues.animationSpeed,
      onChange: callbacks.onAnimationSpeedChange
    })
  );

  const presetGroup = document.createElement('div');
  presetGroup.className = 'scene-control-button-group';
  presetGroup.append(
    createActionButton('Overview', () => callbacks.onCameraPreset('overview')),
    createActionButton('Secretion pole', () => callbacks.onCameraPreset('secretionPole')),
    createActionButton('Transport view', () => callbacks.onCameraPreset('transport'))
  );
  panel.appendChild(presetGroup);

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'scene-control-button';
  resetButton.textContent = 'Reset granules';
  resetButton.addEventListener('click', callbacks.onResetGranules);
  panel.appendChild(resetButton);

  document.body.appendChild(panel);

  return panel;
}

interface RangeControlOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function createRangeControl(options: RangeControlOptions): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'scene-control-row scene-control-range';

  const labelText = document.createElement('span');
  labelText.textContent = options.label;

  const valueText = document.createElement('span');
  valueText.className = 'scene-control-value';

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);

  function setValue(value: number): void {
    const clamped = Math.min(Math.max(value, options.min), options.max);
    input.value = String(clamped);
    valueText.textContent = clamped.toFixed(options.step < 0.1 ? 2 : 1);
    options.onChange(clamped);
  }

  input.addEventListener('input', () => {
    setValue(Number(input.value));
  });

  wrapper.append(labelText, valueText, input);
  setValue(options.value);

  return wrapper;
}

function createActionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scene-control-button';
  button.textContent = label;
  button.addEventListener('click', onClick);

  return button;
}

interface CheckboxControlOptions {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function createCheckboxControl(options: CheckboxControlOptions): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'scene-control-row scene-control-checkbox';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = options.checked;

  const labelText = document.createElement('span');
  labelText.textContent = options.label;

  input.addEventListener('change', () => {
    options.onChange(input.checked);
  });

  wrapper.append(input, labelText);
  options.onChange(options.checked);

  return wrapper;
}
