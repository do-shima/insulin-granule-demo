export type DemoMode = 'singleCell' | 'multicellVascular';

export interface SceneState {
  demoMode: DemoMode;
  selectedCellId: number;
  calciumStimulation: number;
  showEr: boolean;
  showMitochondria: boolean;
  showMicrotubules: boolean;
  microtubuleOpacity: number;
  showCalciumField: boolean;
  showExocytosisParticles: boolean;
  showLabels: boolean;
  showVascularContactPatches: boolean;
  showPolarityVectors: boolean;
  showMulticellReleaseParticles: boolean;
  animationSpeed: number;
}

export type SceneStateListener = (state: Readonly<SceneState>) => void;

export interface SceneStateController {
  getState: () => SceneState;
  setState: (partialState: Partial<SceneState>) => void;
  subscribe: (listener: SceneStateListener) => () => void;
}

export const defaultSceneState: SceneState = {
  demoMode: 'singleCell',
  selectedCellId: 0,
  calciumStimulation: 0.15,
  showEr: true,
  showMitochondria: true,
  showMicrotubules: true,
  microtubuleOpacity: 0.34,
  showCalciumField: true,
  showExocytosisParticles: true,
  showLabels: true,
  showVascularContactPatches: true,
  showPolarityVectors: true,
  showMulticellReleaseParticles: true,
  animationSpeed: 1
};

export function createSceneStateController(initialState: SceneState): SceneStateController {
  let state = { ...initialState };
  const listeners = new Set<SceneStateListener>();

  function emit(): void {
    const snapshot = { ...state };

    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  return {
    getState: () => ({ ...state }),
    setState: (partialState) => {
      state = {
        ...state,
        ...partialState
      };
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener({ ...state });

      return () => {
        listeners.delete(listener);
      };
    }
  };
}
