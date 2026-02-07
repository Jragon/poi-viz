import type { LoopSample, PositionsByHand, TrailPoint } from "@/engine/types";
import type { HandsState } from "@/types/state";

export interface TrailSeries {
  L: TrailPoint[];
  R: TrailPoint[];
}

export interface PatternRenderInput {
  hands: HandsState;
  positions: PositionsByHand;
  trails: TrailSeries;
  showTrails: boolean;
}

export interface WavePoint {
  tBeats: number;
  value: number;
}

export interface WaveTrace {
  id: string;
  label: string;
  color: string;
  points: WavePoint[];
}

export interface WaveLane {
  id: string;
  label: string;
  sin: WaveTrace;
  cos: WaveTrace;
}

export interface WaveRenderInput {
  loopBeats: number;
  tBeats: number;
  lanes: WaveLane[];
}

export interface OscillatorLaneDefinition {
  id: string;
  label: string;
  getAngle: (sample: LoopSample) => number;
}

