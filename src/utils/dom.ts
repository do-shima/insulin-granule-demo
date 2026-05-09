import type { GranuleStateCounts } from '../biology/granuleStates';

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
  label.textContent = 'Schematic visualization; not to scale.';
  document.body.appendChild(label);

  return label;
}

export interface SceneInfoPanel {
  element: HTMLDivElement;
  updateStateCounts: (counts: GranuleStateCounts) => void;
}

export interface SceneControlValues {
  calciumStimulation: number;
  showMicrotubules: boolean;
  microtubuleOpacity: number;
  showCalciumField: boolean;
  showExocytosisParticles: boolean;
  animationSpeed: number;
}

export interface SceneControlCallbacks {
  onCalciumStimulationChange: (value: number) => void;
  onShowMicrotubulesChange: (value: boolean) => void;
  onMicrotubuleOpacityChange: (value: number) => void;
  onShowCalciumFieldChange: (value: boolean) => void;
  onShowExocytosisParticlesChange: (value: boolean) => void;
  onAnimationSpeedChange: (value: number) => void;
  onResetGranules: () => void;
}

export function createSceneInfo(granuleCount: number): SceneInfoPanel {
  const info = document.createElement('div');
  info.className = 'scene-info';

  function updateStateCounts(counts: GranuleStateCounts): void {
    const accounted =
      counts.immature +
      counts.mature +
      counts.transporting +
      counts.docked +
      counts.primed +
      counts.fusing +
      counts.released;

    info.innerHTML = `
  <strong>Insulin secretory granules</strong><br />
  Pancreatic beta-cell schematic<br />
  Granules: ${granuleCount}<br />
  Counted states: ${accounted}<br />
  Immature: ${counts.immature}<br />
  Mature: ${counts.mature}<br />
  Transporting: ${counts.transporting}<br />
  Docked: ${counts.docked}<br />
  Primed: ${counts.primed}<br />
  Fusing: ${counts.fusing}<br />
  Released: ${counts.released}
`;
  }

  updateStateCounts({
    immature: 0,
    mature: 0,
    transporting: 0,
    docked: 0,
    primed: 0,
    fusing: 0,
    released: 0
  });
  document.body.appendChild(info);

  return {
    element: info,
    updateStateCounts
  };
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
    createRangeControl({
      label: 'Animation speed',
      min: 0.1,
      max: 3,
      step: 0.1,
      value: initialValues.animationSpeed,
      onChange: callbacks.onAnimationSpeedChange
    })
  );

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
