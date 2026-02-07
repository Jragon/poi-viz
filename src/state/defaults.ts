import type { AppState, HandId, HandState, HandsState } from "@/types/state";
import {
  DEFAULT_ARM_CYCLES_PER_BEAT,
  DEFAULT_ARM_RADIUS,
  DEFAULT_LEFT_ARM_PHASE,
  DEFAULT_LEFT_RELATIVE_POI_CYCLES_PER_BEAT,
  DEFAULT_BPM,
  DEFAULT_LOOP_BEATS,
  DEFAULT_PLAY_SPEED,
  DEFAULT_PLAYHEAD_BEATS,
  DEFAULT_POI_RADIUS,
  DEFAULT_RIGHT_ARM_PHASE,
  DEFAULT_RIGHT_RELATIVE_POI_CYCLES_PER_BEAT,
  DEFAULT_TRAIL_BEATS,
  DEFAULT_TRAIL_SAMPLE_HZ,
  TWO_PI
} from "@/state/constants";

const LEFT_HAND_ID: HandId = "L";
const RIGHT_HAND_ID: HandId = "R";

const DEFAULT_ARM_SPEED = DEFAULT_ARM_CYCLES_PER_BEAT * TWO_PI;
const DEFAULT_LEFT_POI_SPEED = DEFAULT_LEFT_RELATIVE_POI_CYCLES_PER_BEAT * TWO_PI;
const DEFAULT_RIGHT_POI_SPEED = DEFAULT_RIGHT_RELATIVE_POI_CYCLES_PER_BEAT * TWO_PI;

interface HandDefaultConfig {
  armPhase: number;
  poiSpeed: number;
}

const DEFAULT_HAND_TEMPLATE: Omit<HandState, "armPhase" | "poiSpeed"> = {
  armSpeed: DEFAULT_ARM_SPEED,
  armRadius: DEFAULT_ARM_RADIUS,
  poiPhase: 0,
  poiRadius: DEFAULT_POI_RADIUS
};

function createHandState(config: HandDefaultConfig): HandState {
  return {
    ...DEFAULT_HAND_TEMPLATE,
    armPhase: config.armPhase,
    poiSpeed: config.poiSpeed
  };
}

function createDefaultHandsState(): HandsState {
  return {
    [LEFT_HAND_ID]: createHandState({
      armPhase: DEFAULT_LEFT_ARM_PHASE,
      poiSpeed: DEFAULT_LEFT_POI_SPEED
    }),
    [RIGHT_HAND_ID]: createHandState({
      armPhase: DEFAULT_RIGHT_ARM_PHASE,
      poiSpeed: DEFAULT_RIGHT_POI_SPEED
    })
  };
}

export function createDefaultState(): AppState {
  return {
    global: {
      bpm: DEFAULT_BPM,
      loopBeats: DEFAULT_LOOP_BEATS,
      playSpeed: DEFAULT_PLAY_SPEED,
      isPlaying: false,
      t: DEFAULT_PLAYHEAD_BEATS,
      showTrails: true,
      trailBeats: DEFAULT_TRAIL_BEATS,
      trailSampleHz: DEFAULT_TRAIL_SAMPLE_HZ,
      showWaves: true
    },
    hands: createDefaultHandsState()
  };
}
