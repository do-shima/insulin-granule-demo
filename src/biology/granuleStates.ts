export const GranuleState = {
  Immature: 0,
  Mature: 1,
  Transporting: 2,
  Docked: 3,
  Primed: 4,
  Fusing: 5,
  Released: 6
} as const;

export type GranuleState = (typeof GranuleState)[keyof typeof GranuleState];

export const granuleStateNames = [
  'immature',
  'mature',
  'transporting',
  'docked',
  'primed',
  'fusing',
  'released'
] as const;

export type GranuleStateName = (typeof granuleStateNames)[number];

export function createEmptyGranuleStateCounts(): Record<string, number> {
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

export function getGranuleStateName(state: GranuleState): GranuleStateName {
  return granuleStateNames[state];
}
