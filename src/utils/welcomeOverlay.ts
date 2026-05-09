export interface WelcomeOverlayCallbacks {
  readonly onStartStory: () => void;
  readonly onOpenSingleCell: () => void;
  readonly onOpenMulticell: () => void;
}

export interface WelcomeOverlay {
  readonly element: HTMLDivElement;
  readonly helpButton: HTMLButtonElement;
  readonly open: () => void;
  readonly close: () => void;
}

export function createWelcomeOverlay(callbacks: WelcomeOverlayCallbacks): WelcomeOverlay {
  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';

  const panel = document.createElement('div');
  panel.className = 'welcome-panel';

  const title = document.createElement('div');
  title.className = 'welcome-title';
  title.textContent = 'Insulin granule demo';

  const text = document.createElement('p');
  text.className = 'welcome-text';
  text.textContent =
    'Educational schematic demo only. This is not a real or quantitative insulin secretion simulation.';

  const scaleText = document.createElement('p');
  scaleText.className = 'welcome-text';
  scaleText.textContent =
    'Explore two scales: single-cell granule dynamics and multicell vascular-facing polarity.';

  const actions = document.createElement('div');
  actions.className = 'welcome-actions';
  actions.append(
    createWelcomeButton('Start guided story', () => {
      callbacks.onStartStory();
      close();
    }),
    createWelcomeButton('Open single-cell granule demo', () => {
      callbacks.onOpenSingleCell();
      close();
    }),
    createWelcomeButton('Open multicell vascular polarity demo', () => {
      callbacks.onOpenMulticell();
      close();
    })
  );

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'welcome-close';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => {
    close();
  });

  const caveat = document.createElement('div');
  caveat.className = 'welcome-caveat';
  caveat.textContent = 'Schematic visualization; not to scale. Educational demo only.';

  panel.append(title, text, scaleText, actions, caveat, closeButton);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const helpButton = document.createElement('button');
  helpButton.type = 'button';
  helpButton.className = 'help-about-button';
  helpButton.textContent = 'Help / About';
  helpButton.addEventListener('click', () => {
    open();
  });
  document.body.appendChild(helpButton);

  function open(): void {
    overlay.hidden = false;
  }

  function close(): void {
    overlay.hidden = true;
  }

  open();

  return {
    element: overlay,
    helpButton,
    open,
    close
  };
}

function createWelcomeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'welcome-action-button';
  button.textContent = label;
  button.addEventListener('click', onClick);

  return button;
}
