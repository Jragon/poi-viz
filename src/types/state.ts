/**
 * Hand identifier used across engine, state, and rendering layers.
 */
export type HandId = "L" | "R";

/**
 * Global phase-zero reference used for user-facing phase semantics.
 * Engine internals remain canonical (`right = 0`).
 */
export type PhaseReference = "right" | "down" | "left" | "up";

/**
 * Global runtime state.
 * Time-domain units are beats for loop/playhead fields.
 */
export interface GlobalState {
  /**
   * Tempo in beats per minute.
   */
  bpm: number;
  /**
   * Loop length in beats.
   */
  loopBeats: number;
  /**
   * Playhead speed multiplier.
   */
  playSpeed: number;
  /**
   * Transport play/pause flag.
   */
  isPlaying: boolean;
  /**
   * Current playhead position in beats.
   */
  t: number;
  /**
   * Pattern trail visibility toggle.
   */
  showTrails: boolean;
  /**
   * Trail history length in beats.
   */
  trailBeats: number;
  /**
   * Trail sampling frequency in samples per second.
   */
  trailSampleHz: number;
  /**
   * Wave-panel visibility toggle.
   */
  showWaves: boolean;
  /**
   * User-facing phase-zero reference for controls/VTG orientation semantics.
   */
  phaseReference: PhaseReference;
}

/**
 * Per-hand oscillator and geometry parameters.
 * Angular values are in radians and radians-per-beat.
 */
export interface HandState {
  /**
   * Arm angular speed `ω_arm` in radians per beat.
   */
  armSpeed: number;
  /**
   * Arm phase `φ_arm` in radians.
   */
  armPhase: number;
  /**
   * Arm radius `R_arm`.
   */
  armRadius: number;
  /**
   * Relative poi speed `ω_rel` in radians per beat.
   */
  poiSpeed: number;
  /**
   * Relative poi phase `φ_rel` in radians.
   */
  poiPhase: number;
  /**
   * Poi tether radius `R_poi`.
   */
  poiRadius: number;
}

/**
 * Left/right hand state map.
 */
export type HandsState = Record<HandId, HandState>;

/**
 * Canonical full application state.
 */
export interface AppState {
  global: GlobalState;
  hands: HandsState;
}
