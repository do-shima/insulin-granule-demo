import type { DemoMode } from '../state/sceneState';

export interface InitialDeepLink {
  readonly mode?: DemoMode;
  readonly storyIndex?: number;
  readonly presentationMode: boolean;
  readonly hasValidParameter: boolean;
}

export function parseInitialDeepLink(search = window.location.search): InitialDeepLink {
  const parameters = new URLSearchParams(search);
  const mode = parseDemoMode(parameters.get('mode'));
  const storyIndex = parseStoryIndex(parameters.get('story'));
  const presentationMode = parameters.get('presentation') === '1';

  return {
    mode,
    storyIndex,
    presentationMode,
    hasValidParameter: mode !== undefined || storyIndex !== undefined || presentationMode
  };
}

function parseDemoMode(value: string | null): DemoMode | undefined {
  if (value === 'singleCell' || value === 'multicellVascular') {
    return value;
  }

  return undefined;
}

function parseStoryIndex(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const stepNumber = Number(value);
  if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > 8) {
    return undefined;
  }

  return stepNumber - 1;
}
