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
