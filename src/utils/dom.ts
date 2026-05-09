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

export function createSceneInfo(granuleCount: number): HTMLDivElement {
  const info = document.createElement('div');
  info.className = 'scene-info';
  info.innerHTML = `
  <strong>Insulin secretory granules</strong><br />
  Pancreatic beta-cell schematic<br />
  Granules: ${granuleCount}
`;
  document.body.appendChild(info);

  return info;
}
