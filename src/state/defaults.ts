import type { AppState, HandId, HandState, HandsState } from "@/types/state";
import {
  DEFAULT_ARM_CYCLES_PER_BEAT,
  DEFAULT_ARM_RADIUS,
  DEFAULT_BPM,
  DEFAULT_LOOP_BEATS,
  DEFAULT_PLAY_SPEED,
  DEFAULT_PLAYHEAD_BEATS,
  DEFAULT_POI_RADIUS,
  DEFAULT_RELATIVE_POI_CYCLES_PER_BEAT,
  DEFAULT_TRAIL_BEATS,
  DEFAULT_TRAIL_SAMPLE_HZ,
  SPLIT_TIME_PHASE_OFFSET,
  TWO_PI
} from "@/state/constants";

const LEFT_HAND_ID: HandId = "L";
const RIGHT_HAND_ID: HandId = "R";

const DEFAULT_ARM_SPEED = DEFAULT_ARM_CYCLES_PER_BEAT * TWO_PI;
const DEFAULT_POI_SPEED = DEFAULT_RELATIVE_POI_CYCLES_PER_BEAT * TWO_PI;

const DEFAULT_HAND_TEMPLATE: Omit<HandState, "armPhase"> = {
  armSpeed: DEFAULT_ARM_SPEED,
  armRadius: DEFAULT_ARM_RADIUS,
  poiSpeed: DEFAULT_POI_SPEED,
  poiPhase: 0,
  poiRadius: DEFAULT_POI_RADIUS
};

function createHandState(armPhase: number): HandState {
  return {
    ...DEFAULT_HAND_TEMPLATE,
    armPhase
  };
}

function createDefaultHandsState(): HandsState {
  return {
    [LEFT_HAND_ID]: createHandState(0),
    [RIGHT_HAND_ID]: createHandState(SPLIT_TIME_PHASE_OFFSET)
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

