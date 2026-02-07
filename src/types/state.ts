export type HandId = "L" | "R";

export interface GlobalState {
  bpm: number;
  loopBeats: number;
  playSpeed: number;
  isPlaying: boolean;
  t: number;
  showTrails: boolean;
  trailBeats: number;
  trailSampleHz: number;
  showWaves: boolean;
}

export interface HandState {
  armSpeed: number;
  armPhase: number;
  armRadius: number;
  poiSpeed: number;
  poiPhase: number;
  poiRadius: number;
}

export type HandsState = Record<HandId, HandState>;

export interface AppState {
  global: GlobalState;
  hands: HandsState;
}

export type ElementPresetId = "earth" | "air" | "water" | "fire";
export type FlowerMode = "inspin" | "antispin";
export type FlowerPetalCount = 3 | 4 | 5;
export type FlowerPresetId = `${FlowerMode}-${FlowerPetalCount}`;

export type PresetId = ElementPresetId | FlowerPresetId;

export interface PresetDefinition {
  id: PresetId;
  label: string;
  apply: (state: AppState) => AppState;
}

