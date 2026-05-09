import type { GranuleStateCounts } from '../biology/granuleStates';
import type { DemoMode, MulticellLabelDetail, SceneState } from '../state/sceneState';
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

export interface CollapsiblePanelParts {
  body: HTMLDivElement;
}

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
  updateCounts: (snapshot: SceneInfoSnapshot) => void;
}

export interface SceneInfoSnapshot {
  readonly demoMode: DemoMode;
  readonly openedSelectedCellDetail: boolean;
  readonly calciumStimulation: number;
  readonly stateCounts: GranuleStateCounts;
  readonly fusionEvents: FusionEventCounts;
  readonly multicellReleaseEvents: FusionEventCounts;
}

export type SceneControlValues = SceneState;

export type CameraPresetId =
  | 'overview'
  | 'secretionPole'
  | 'transport'
  | 'multicellOverview'
  | 'capillaryPolarity'
  | 'vascularRelease';

export interface SceneControlCallbacks {
  onDemoModeChange: (value: DemoMode) => void;
  onCalciumStimulationChange: (value: number) => void;
  onShowErChange: (value: boolean) => void;
  onShowMitochondriaChange: (value: boolean) => void;
  onShowMicrotubulesChange: (value: boolean) => void;
  onMicrotubuleOpacityChange: (value: number) => void;
  onShowCalciumFieldChange: (value: boolean) => void;
  onShowExocytosisParticlesChange: (value: boolean) => void;
  onShowLabelsChange: (value: boolean) => void;
  onShowVascularContactPatchesChange: (value: boolean) => void;
  onShowPolarityVectorsChange: (value: boolean) => void;
  onShowMulticellReleaseParticlesChange: (value: boolean) => void;
  onShowBlenderBackdropsChange: (value: boolean) => void;
  onBackdropOpacityChange: (value: number) => void;
  onMulticellLabelDetailChange: (value: MulticellLabelDetail) => void;
  onPresentationModeChange: (value: boolean) => void;
  onAnimationSpeedChange: (value: number) => void;
  onCameraPreset: (preset: CameraPresetId) => void;
  onOpenSelectedCellDetail: () => void;
  onPreviousSelectedCell: () => void;
  onNextSelectedCell: () => void;
  onCopyShareLink: () => Promise<boolean>;
  onSaveScreenshot: () => void;
  onResetGranules: () => void;
}

export interface SceneControlsPanel {
  element: HTMLDivElement;
  updateValues: (values: SceneControlValues) => void;
}

export function createSceneInfo(granuleCount: number): SceneInfoPanel {
  const info = document.createElement('div');
  info.className = 'scene-info';
  const { body } = createCollapsiblePanel(info, 'Demo status', shouldCollapsePanelsByDefault());

  function updateCounts(snapshot: SceneInfoSnapshot): void {
    body.innerHTML =
      snapshot.demoMode === 'singleCell'
        ? createSingleCellInfo(snapshot, granuleCount)
        : createMulticellInfo(snapshot);
  }

  updateCounts({
    demoMode: 'singleCell',
    openedSelectedCellDetail: false,
    calciumStimulation: 0.15,
    stateCounts: createZeroStateCounts(),
    fusionEvents: { total: 0, recent: 0 },
    multicellReleaseEvents: { total: 0, recent: 0 }
  });
  document.body.appendChild(info);

  return {
    element: info,
    updateCounts
  };
}

function createSingleCellInfo(snapshot: SceneInfoSnapshot, granuleCount: number): string {
  const counts = snapshot.stateCounts;
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

  return `
  <div class="scene-info-mode">Active mode: single-cell granule demo</div>
  ${snapshot.openedSelectedCellDetail ? '<div class="scene-info-caveat">The selected beta cell is shown in single-cell detail as a schematic intracellular granule demo. This is not a reconstruction of that exact selected cell.</div>' : ''}
  <div>Pancreatic beta-cell schematic</div>
  <div>Calcium stimulation: ${snapshot.calciumStimulation.toFixed(2)}</div>
  <div>Granules: ${granuleCount}</div>
  <div>Counted states: ${accounted}</div>
  <div class="state-counts-title">Single-cell schematic fusion events</div>
  <div>Total schematic fusion events: ${snapshot.fusionEvents.total}</div>
  <div>Events in last 10 seconds: ${snapshot.fusionEvents.recent}</div>
  <div class="state-counts-title">Schematic granule states</div>
  <div class="scene-info-caveat">State counts are visual demo states, not measured biological counts.</div>
  <div class="state-counts">${stateRows}</div>
  <div class="scene-info-caveat">Schematic visualization; not to scale. Educational demo only; not real secretion kinetics.</div>
`;
}

function createMulticellInfo(snapshot: SceneInfoSnapshot): string {
  return `
  <div class="scene-info-mode">Active mode: multicell vascular polarity</div>
  <div>Schematic beta-cell cluster and capillary network</div>
  <div>Calcium stimulation: ${snapshot.calciumStimulation.toFixed(2)}</div>
  <div class="state-counts-title">Schematic multicell release events</div>
  <div>Total schematic release events: ${snapshot.multicellReleaseEvents.total}</div>
  <div>Events in last 10 seconds: ${snapshot.multicellReleaseEvents.recent}</div>
  <div class="scene-info-caveat">Events show a vascular-facing bias for demo purposes, not measured secretion.</div>
  <div class="scene-info-caveat">Single-cell granule states and fusion events are paused while this mode is active.</div>
  <div class="scene-info-caveat">Schematic visualization; not to scale. Educational demo only; not real secretion kinetics.</div>
`;
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
): SceneControlsPanel {
  const panel = document.createElement('div');
  panel.className = 'scene-controls';
  const { body } = createCollapsiblePanel(panel, 'Schematic controls', shouldCollapsePanelsByDefault());

  const modeControl = createModeControl({
    value: initialValues.demoMode,
    onChange: callbacks.onDemoModeChange
  });
  const calciumControl = createRangeControl({
    label: 'Calcium stimulation',
    min: 0,
    max: 1,
    step: 0.01,
    value: initialValues.calciumStimulation,
    onChange: callbacks.onCalciumStimulationChange
  });
  const erControl = createCheckboxControl({
    label: 'Show ER',
    checked: initialValues.showEr,
    onChange: callbacks.onShowErChange
  });
  const mitochondriaControl = createCheckboxControl({
    label: 'Show mitochondria',
    checked: initialValues.showMitochondria,
    onChange: callbacks.onShowMitochondriaChange
  });
  const microtubulesControl = createCheckboxControl({
    label: 'Show microtubules',
    checked: initialValues.showMicrotubules,
    onChange: callbacks.onShowMicrotubulesChange
  });
  const microtubuleOpacityControl = createRangeControl({
    label: 'Microtubule opacity',
    min: 0,
    max: 1,
    step: 0.01,
    value: initialValues.microtubuleOpacity,
    onChange: callbacks.onMicrotubuleOpacityChange
  });
  const calciumFieldControl = createCheckboxControl({
    label: 'Show calcium field',
    checked: initialValues.showCalciumField,
    onChange: callbacks.onShowCalciumFieldChange
  });
  const exocytosisParticlesControl = createCheckboxControl({
    label: 'Show release signal',
    checked: initialValues.showExocytosisParticles,
    onChange: callbacks.onShowExocytosisParticlesChange
  });
  const labelsControl = createCheckboxControl({
    label: 'Show labels',
    checked: initialValues.showLabels,
    onChange: callbacks.onShowLabelsChange
  });
  const multicellLabelsControl = createCheckboxControl({
    label: 'Show labels',
    checked: initialValues.showLabels,
    onChange: callbacks.onShowLabelsChange
  });
  const multicellLabelDetailControl = createLabelDetailControl({
    value: initialValues.multicellLabelDetail,
    onChange: callbacks.onMulticellLabelDetailChange
  });
  const vascularContactPatchesControl = createCheckboxControl({
    label: 'Show vascular contact patches',
    checked: initialValues.showVascularContactPatches,
    onChange: callbacks.onShowVascularContactPatchesChange
  });
  const polarityVectorsControl = createCheckboxControl({
    label: 'Show polarity vectors',
    checked: initialValues.showPolarityVectors,
    onChange: callbacks.onShowPolarityVectorsChange
  });
  const multicellReleaseParticlesControl = createCheckboxControl({
    label: 'Show multicell release particles',
    checked: initialValues.showMulticellReleaseParticles,
    onChange: callbacks.onShowMulticellReleaseParticlesChange
  });
  const blenderBackdropsControl = createCheckboxControl({
    label: 'Show Blender backdrops',
    checked: initialValues.showBlenderBackdrops,
    onChange: callbacks.onShowBlenderBackdropsChange
  });
  const backdropOpacityControl = createRangeControl({
    label: 'Backdrop opacity',
    min: 0,
    max: 1,
    step: 0.01,
    value: initialValues.backdropOpacity,
    onChange: callbacks.onBackdropOpacityChange
  });
  const animationSpeedControl = createRangeControl({
    label: 'Animation speed',
    min: 0.1,
    max: 3,
    step: 0.1,
    value: initialValues.animationSpeed,
    onChange: callbacks.onAnimationSpeedChange
  });
  const presentationModeControl = createCheckboxControl({
    label: 'Presentation mode',
    checked: initialValues.presentationMode,
    onChange: callbacks.onPresentationModeChange
  });

  const singleCellControls = document.createElement('div');
  singleCellControls.className = 'scene-control-section';
  singleCellControls.append(
    erControl.element,
    mitochondriaControl.element,
    microtubulesControl.element,
    microtubuleOpacityControl.element,
    calciumFieldControl.element,
    exocytosisParticlesControl.element,
    labelsControl.element
  );

  const singleCellPresetGroup = document.createElement('div');
  singleCellPresetGroup.className = 'scene-control-button-group';
  singleCellPresetGroup.append(
    createActionButton('Overview', () => callbacks.onCameraPreset('overview')),
    createActionButton('Secretion pole', () => callbacks.onCameraPreset('secretionPole')),
    createActionButton('Transport view', () => callbacks.onCameraPreset('transport'))
  );
  singleCellControls.appendChild(singleCellPresetGroup);

  const multicellControls = document.createElement('div');
  multicellControls.className = 'scene-control-section';
  multicellControls.append(
    multicellLabelsControl.element,
    multicellLabelDetailControl.element,
    vascularContactPatchesControl.element,
    polarityVectorsControl.element,
    multicellReleaseParticlesControl.element,
    blenderBackdropsControl.element,
    backdropOpacityControl.element
  );

  const multicellPresetGroup = document.createElement('div');
  multicellPresetGroup.className = 'scene-control-button-group';
  multicellPresetGroup.append(
    createActionButton('Multicell overview', () => callbacks.onCameraPreset('multicellOverview')),
    createActionButton('Capillary polarity', () => callbacks.onCameraPreset('capillaryPolarity')),
    createActionButton('Vascular release', () => callbacks.onCameraPreset('vascularRelease'))
  );
  multicellControls.appendChild(multicellPresetGroup);

  const selectedCellGroup = document.createElement('div');
  selectedCellGroup.className = 'scene-control-button-group';
  selectedCellGroup.append(
    createActionButton('Open selected cell detail', callbacks.onOpenSelectedCellDetail),
    createActionButton('Previous selected cell', callbacks.onPreviousSelectedCell),
    createActionButton('Next selected cell', callbacks.onNextSelectedCell)
  );
  multicellControls.appendChild(selectedCellGroup);

  body.append(
    modeControl.element,
    calciumControl.element,
    presentationModeControl.element,
    singleCellControls,
    multicellControls,
    animationSpeedControl.element
  );

  const copyShareButton = createActionButton('Copy share link', () => {
    void handleCopyShareLink();
  });
  const copyShareFeedback = document.createElement('div');
  copyShareFeedback.className = 'scene-control-feedback';
  copyShareFeedback.setAttribute('aria-live', 'polite');
  body.append(copyShareButton, copyShareFeedback);
  body.appendChild(createActionButton('Save screenshot', callbacks.onSaveScreenshot));

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'scene-control-button';
  resetButton.textContent = 'Reset active demo state';
  resetButton.addEventListener('click', callbacks.onResetGranules);
  body.appendChild(resetButton);

  document.body.appendChild(panel);
  let copyFeedbackTimer: number | undefined;

  return {
    element: panel,
    updateValues: (values) => {
      modeControl.setValue(values.demoMode);
      calciumControl.setValue(values.calciumStimulation);
      erControl.setValue(values.showEr);
      mitochondriaControl.setValue(values.showMitochondria);
      microtubulesControl.setValue(values.showMicrotubules);
      microtubuleOpacityControl.setValue(values.microtubuleOpacity);
      calciumFieldControl.setValue(values.showCalciumField);
      exocytosisParticlesControl.setValue(values.showExocytosisParticles);
      labelsControl.setValue(values.showLabels);
      multicellLabelsControl.setValue(values.showLabels);
      vascularContactPatchesControl.setValue(values.showVascularContactPatches);
      polarityVectorsControl.setValue(values.showPolarityVectors);
      multicellReleaseParticlesControl.setValue(values.showMulticellReleaseParticles);
      blenderBackdropsControl.setValue(values.showBlenderBackdrops);
      backdropOpacityControl.setValue(values.backdropOpacity);
      multicellLabelDetailControl.setValue(values.multicellLabelDetail);
      presentationModeControl.setValue(values.presentationMode);
      animationSpeedControl.setValue(values.animationSpeed);
      singleCellControls.hidden = values.demoMode !== 'singleCell';
      multicellControls.hidden = values.demoMode !== 'multicellVascular';
    }
  };

  async function handleCopyShareLink(): Promise<void> {
    const copied = await callbacks.onCopyShareLink();
    showCopyFeedback(copied ? 'Copied' : 'Copy manually from prompt');
  }

  function showCopyFeedback(message: string): void {
    copyShareFeedback.textContent = message;

    if (copyFeedbackTimer !== undefined) {
      window.clearTimeout(copyFeedbackTimer);
    }

    copyFeedbackTimer = window.setTimeout(() => {
      copyShareFeedback.textContent = '';
      copyFeedbackTimer = undefined;
    }, 1800);
  }
}

export function createCollapsiblePanel(
  panel: HTMLDivElement,
  title: string,
  initiallyCollapsed: boolean
): CollapsiblePanelParts {
  const header = document.createElement('div');
  header.className = 'overlay-panel-header';

  const titleElement = document.createElement('div');
  titleElement.className = 'overlay-panel-title';
  titleElement.textContent = title;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'overlay-collapse-button';

  const body = document.createElement('div');
  body.className = 'overlay-panel-body';

  function setCollapsed(isCollapsed: boolean): void {
    panel.classList.toggle('is-collapsed', isCollapsed);
    button.textContent = isCollapsed ? 'Expand' : 'Collapse';
    button.setAttribute('aria-expanded', String(!isCollapsed));
  }

  button.addEventListener('click', () => {
    setCollapsed(!panel.classList.contains('is-collapsed'));
  });

  header.append(titleElement, button);
  panel.append(header, body);
  setCollapsed(initiallyCollapsed);

  return { body };
}

export function createPresentationModeToolbar(
  onCopyShareLink: () => Promise<boolean>,
  onExit: () => void
): HTMLDivElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'presentation-toolbar';

  const feedback = document.createElement('div');
  feedback.className = 'presentation-toolbar-feedback';
  feedback.setAttribute('aria-live', 'polite');

  const copyButton = createPresentationToolbarButton('Copy link', () => {
    void handleCopyShareLink();
  });
  const exitButton = createPresentationToolbarButton('Exit presentation mode', onExit);
  toolbar.append(copyButton, exitButton, feedback);
  document.body.appendChild(toolbar);

  let feedbackTimer: number | undefined;

  async function handleCopyShareLink(): Promise<void> {
    const copied = await onCopyShareLink();
    showFeedback(copied ? 'Copied' : 'Copy manually from prompt');
  }

  function showFeedback(message: string): void {
    feedback.textContent = message;

    if (feedbackTimer !== undefined) {
      window.clearTimeout(feedbackTimer);
    }

    feedbackTimer = window.setTimeout(() => {
      feedback.textContent = '';
      feedbackTimer = undefined;
    }, 1800);
  }

  return toolbar;
}

function createPresentationToolbarButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'presentation-toolbar-button';
  button.textContent = label;
  button.addEventListener('click', onClick);

  return button;
}

export function shouldCollapsePanelsByDefault(): boolean {
  return window.matchMedia('(max-width: 760px)').matches;
}

interface ModeControlOptions {
  value: DemoMode;
  onChange: (value: DemoMode) => void;
}

interface ModeControl {
  element: HTMLDivElement;
  setValue: (value: DemoMode) => void;
}

function createModeControl(options: ModeControlOptions): ModeControl {
  const wrapper = document.createElement('div');
  wrapper.className = 'scene-mode-control';

  const label = document.createElement('div');
  label.className = 'scene-mode-label';
  label.textContent = 'Demo mode';

  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'scene-mode-buttons';

  const singleCellButton = createModeButton('Single-cell granule demo', 'singleCell', options.onChange);
  const multicellButton = createModeButton(
    'Multicell vascular polarity demo',
    'multicellVascular',
    options.onChange
  );
  buttonGroup.append(singleCellButton, multicellButton);
  wrapper.append(label, buttonGroup);

  function setValue(value: DemoMode): void {
    singleCellButton.classList.toggle('is-active', value === 'singleCell');
    multicellButton.classList.toggle('is-active', value === 'multicellVascular');
    singleCellButton.setAttribute('aria-pressed', String(value === 'singleCell'));
    multicellButton.setAttribute('aria-pressed', String(value === 'multicellVascular'));
  }

  setValue(options.value);

  return {
    element: wrapper,
    setValue
  };
}

function createModeButton(
  label: string,
  value: DemoMode,
  onChange: (value: DemoMode) => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scene-mode-button';
  button.textContent = label;
  button.addEventListener('click', () => {
    onChange(value);
  });

  return button;
}

interface LabelDetailControlOptions {
  value: MulticellLabelDetail;
  onChange: (value: MulticellLabelDetail) => void;
}

interface LabelDetailControl {
  element: HTMLDivElement;
  setValue: (value: MulticellLabelDetail) => void;
}

function createLabelDetailControl(options: LabelDetailControlOptions): LabelDetailControl {
  const wrapper = document.createElement('div');
  wrapper.className = 'scene-mode-control scene-label-detail-control';

  const label = document.createElement('div');
  label.className = 'scene-mode-label';
  label.textContent = 'Label detail';

  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'scene-mode-buttons';

  const compactButton = createLabelDetailButton('Compact', 'compact', options.onChange);
  const fullButton = createLabelDetailButton('Full', 'full', options.onChange);
  buttonGroup.append(compactButton, fullButton);
  wrapper.append(label, buttonGroup);

  function setValue(value: MulticellLabelDetail): void {
    compactButton.classList.toggle('is-active', value === 'compact');
    fullButton.classList.toggle('is-active', value === 'full');
    compactButton.setAttribute('aria-pressed', String(value === 'compact'));
    fullButton.setAttribute('aria-pressed', String(value === 'full'));
  }

  setValue(options.value);

  return {
    element: wrapper,
    setValue
  };
}

function createLabelDetailButton(
  label: string,
  value: MulticellLabelDetail,
  onChange: (value: MulticellLabelDetail) => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scene-mode-button';
  button.textContent = label;
  button.addEventListener('click', () => {
    onChange(value);
  });

  return button;
}

interface RangeControlOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

interface RangeControl {
  element: HTMLLabelElement;
  setValue: (value: number) => void;
}

function createRangeControl(options: RangeControlOptions): RangeControl {
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
  }

  input.addEventListener('input', () => {
    const clamped = Math.min(Math.max(Number(input.value), options.min), options.max);
    setValue(clamped);
    options.onChange(clamped);
  });

  wrapper.append(labelText, valueText, input);
  setValue(options.value);

  return {
    element: wrapper,
    setValue
  };
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

interface CheckboxControl {
  element: HTMLLabelElement;
  setValue: (value: boolean) => void;
}

function createCheckboxControl(options: CheckboxControlOptions): CheckboxControl {
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

  return {
    element: wrapper,
    setValue: (value) => {
      input.checked = value;
    }
  };
}
