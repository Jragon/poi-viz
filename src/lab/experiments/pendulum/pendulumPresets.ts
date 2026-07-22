import type {
  CircleDriver,
  MultiRigSequence,
  PendulumDriver,
  RelativeNodePose
} from "@/engine/types";

const TAU = Math.PI * 2;
const DOWN_PHASE = -Math.PI / 2;
const DURATION_UNITS = 4;
export const EXTENDULUM_HEAD_CYCLES_PER_UNIT = 1 / DURATION_UNITS;

export type PendulumPresetId =
  | "ordinary"
  | "extended"
  | "isolated"
  | "same-time"
  | "quarter-time"
  | "mirrored"
  | "extendulum";

export interface PendulumLabConfig {
  readonly presetId: PendulumPresetId;
  readonly amplitudeRad: number;
  readonly cyclesPerUnit: number;
  readonly swingPhaseRad: number;
  readonly pairOffsetRad: number;
}

export interface PendulumPresetDefinition {
  readonly id: PendulumPresetId;
  readonly label: string;
  readonly summary: string;
  readonly handUse: string;
  readonly headUse: string;
  readonly defaultPairOffsetRad: number;
}

export const PENDULUM_PRESETS: readonly PendulumPresetDefinition[] = [
  {
    id: "ordinary",
    label: "Ordinary",
    summary: "A fixed hand with the poi head swinging through the lower arc.",
    handUse: "Fixed",
    headUse: "Pendulum",
    defaultPairOffsetRad: 0
  },
  {
    id: "extended",
    label: "Extended",
    summary: "Hand and poi head use the same lower-arc oscillator and stay in line.",
    handUse: "Pendulum, lower arc",
    headUse: "Pendulum, in phase",
    defaultPairOffsetRad: 0
  },
  {
    id: "isolated",
    label: "Isolated",
    summary: "The hand uses the opposite upper arc while the poi head uses the lower arc.",
    handUse: "Pendulum, upper arc",
    headUse: "Pendulum, lower arc",
    defaultPairOffsetRad: 0
  },
  {
    id: "same-time",
    label: "Same time",
    summary: "Two extended pendulums share the same oscillator phase.",
    handUse: "Extended pendulum pair",
    headUse: "Pendulum, offset 0°",
    defaultPairOffsetRad: 0
  },
  {
    id: "quarter-time",
    label: "Quarter time",
    summary: "Two extended pendulums are offset by one quarter of the oscillator cycle.",
    handUse: "Extended pendulum pair",
    headUse: "Pendulum, offset 90°",
    defaultPairOffsetRad: Math.PI / 2
  },
  {
    id: "mirrored",
    label: "Mirrored",
    summary: "Two extended pendulums occupy opposite oscillator phases.",
    handUse: "Extended pendulum pair",
    headUse: "Pendulum, offset 180°",
    defaultPairOffsetRad: Math.PI
  },
  {
    id: "extendulum",
    label: "Extendulum",
    summary: "One hand circle carries two poi downswings, producing a semicircular head trace.",
    handUse: "One full circle",
    headUse: "One cycle / two downswings",
    defaultPairOffsetRad: 0
  }
] as const;

type NodeMotion = {
  startPose: RelativeNodePose;
  driver: CircleDriver | PendulumDriver;
};

function pendulumMotion(
  centerPhaseAbs: number,
  radius: number,
  config: PendulumLabConfig,
  options: {
    readonly oscillatorOffsetRad?: number;
    readonly cyclesPerUnit?: number;
  } = {}
): NodeMotion {
  const swingPhaseRad = config.swingPhaseRad + (options.oscillatorOffsetRad ?? 0);
  return {
    startPose: {
      phaseAbs: centerPhaseAbs + config.amplitudeRad * Math.sin(swingPhaseRad),
      radius
    },
    driver: {
      kind: "pendulum",
      amplitudeRad: config.amplitudeRad,
      cyclesPerUnit: options.cyclesPerUnit ?? config.cyclesPerUnit,
      swingPhaseRad
    }
  };
}

function fixedMotion(phaseAbs: number, radius: number): NodeMotion {
  return {
    startPose: { phaseAbs, radius },
    driver: { kind: "circle", omega: 0 }
  };
}

function makeRig(
  rigId: string,
  hand: NodeMotion,
  head: NodeMotion
): MultiRigSequence["rigs"][number] {
  return {
    rigId,
    sequence: {
      segments: [
        {
          durationUnits: DURATION_UNITS,
          planeId: "wall",
          hand,
          head
        }
      ]
    }
  };
}

function buildTimingPair(config: PendulumLabConfig): MultiRigSequence {
  return {
    rigs: [
      makeRig(
        "left",
        pendulumMotion(DOWN_PHASE, 0.34, config),
        pendulumMotion(DOWN_PHASE, 0.56, config)
      ),
      makeRig(
        "right",
        pendulumMotion(DOWN_PHASE, 0.42, config, {
          oscillatorOffsetRad: config.pairOffsetRad
        }),
        pendulumMotion(DOWN_PHASE, 0.62, config, {
          oscillatorOffsetRad: config.pairOffsetRad
        })
      )
    ]
  };
}

export function buildPendulumLabSequence(config: PendulumLabConfig): MultiRigSequence {
  switch (config.presetId) {
    case "ordinary":
      return {
        rigs: [makeRig("poi", fixedMotion(DOWN_PHASE, 0), pendulumMotion(DOWN_PHASE, 0.9, config))]
      };
    case "extended":
      return {
        rigs: [
          makeRig(
            "poi",
            pendulumMotion(DOWN_PHASE, 0.38, config),
            pendulumMotion(DOWN_PHASE, 0.62, config)
          )
        ]
      };
    case "isolated":
      return {
        rigs: [
          makeRig(
            "poi",
            pendulumMotion(DOWN_PHASE + Math.PI, 0.45, config),
            pendulumMotion(DOWN_PHASE, 0.9, config)
          )
        ]
      };
    case "same-time":
    case "quarter-time":
    case "mirrored":
      return buildTimingPair(config);
    case "extendulum":
      return {
        rigs: [
          makeRig(
            "poi",
            {
              startPose: { phaseAbs: DOWN_PHASE, radius: 0.42 },
              driver: { kind: "circle", omega: TAU / DURATION_UNITS }
            },
            pendulumMotion(DOWN_PHASE, 0.62, config, {
              cyclesPerUnit: EXTENDULUM_HEAD_CYCLES_PER_UNIT
            })
          )
        ]
      };
  }

  const exhaustive: never = config.presetId;
  return exhaustive;
}
