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
  updateStateCounts: (counts: Record<string, number>) => void;
}

export interface StimulationControl {
  element: HTMLDivElement;
  getValue: () => number;
  setValue: (value: number) => void;
}

export function createSceneInfo(granuleCount: number): SceneInfoPanel {
  const info = document.createElement('div');
  info.className = 'scene-info';

  function updateStateCounts(counts: Record<string, number>): void {
    info.innerHTML = `
  <strong>Insulin secretory granules</strong><br />
  Pancreatic beta-cell schematic<br />
  Granules: ${granuleCount}<br />
  Mature: ${counts.mature ?? 0}<br />
  Docked: ${counts.docked ?? 0}<br />
  Primed: ${counts.primed ?? 0}<br />
  Fusing: ${counts.fusing ?? 0}<br />
  Released: ${counts.released ?? 0}
`;
  }

  updateStateCounts({});
  document.body.appendChild(info);

  return {
    element: info,
    updateStateCounts
  };
}

export function createStimulationControl(
  initialValue: number,
  onChange: (value: number) => void
): StimulationControl {
  const control = document.createElement('div');
  control.className = 'stimulation-control';

  const label = document.createElement('label');
  label.htmlFor = 'stimulation-level';
  label.textContent = 'Calcium stimulation';

  const valueLabel = document.createElement('span');
  valueLabel.className = 'stimulation-value';

  const input = document.createElement('input');
  input.id = 'stimulation-level';
  input.type = 'range';
  input.min = '0';
  input.max = '1';
  input.step = '0.01';

  function setValue(value: number): void {
    const clamped = Math.min(Math.max(value, 0), 1);
    input.value = clamped.toFixed(2);
    valueLabel.textContent = clamped.toFixed(2);
    onChange(clamped);
  }

  input.addEventListener('input', () => {
    setValue(Number(input.value));
  });

  control.append(label, valueLabel, input);
  document.body.appendChild(control);
  setValue(initialValue);

  return {
    element: control,
    getValue: () => Number(input.value),
    setValue
  };
}
