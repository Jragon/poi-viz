export interface BodyRigConfig {
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly baseShoulderSpan: number;
  readonly maxYawRad: number;
  readonly minProjectedSpanRatio?: number;
  readonly neutralDeadzonePx?: number;
  readonly elbowPolicy?: BodyRigElbowPolicy;
  readonly limits?: BodyRigLimits;
  readonly solverWeights?: BodyRigSolverWeights;
  readonly shoulderPolicy?: BodyRigShoulderPolicy;
}

export type BodyRigElbowMode = "outward";

export interface BodyRigElbowPolicy {
  readonly mode?: BodyRigElbowMode;
  readonly preferOverheadOutward?: boolean;
}

export interface BodyRigLimits {
  readonly allowStretch?: boolean;
  readonly extensionComfortRatio?: number;
}

export interface BodyRigSolverWeights {
  readonly reachPenalty?: number;
  readonly extensionPenalty?: number;
  readonly yawPenalty?: number;
  readonly sideBiasPenalty?: number;
}

export interface BodyRigShoulderPolicy {
  readonly maxLift?: number;
  readonly maxOutwardReach?: number;
  readonly maxCrossBodyReach?: number;
  readonly activationExtensionRatio?: number;
  readonly overheadLiftBias?: number;
  readonly minEffectiveSpanRatio?: number;
}

export interface ResolvedBodyRigElbowPolicy {
  readonly mode: BodyRigElbowMode;
  readonly preferOverheadOutward: boolean;
}

export interface ResolvedBodyRigLimits {
  readonly allowStretch: boolean;
  readonly extensionComfortRatio: number;
}

export interface ResolvedBodyRigSolverWeights {
  readonly reachPenalty: number;
  readonly extensionPenalty: number;
  readonly yawPenalty: number;
  readonly sideBiasPenalty: number;
}

export interface ResolvedBodyRigShoulderPolicy {
  readonly maxLift: number;
  readonly maxOutwardReach: number;
  readonly maxCrossBodyReach: number;
  readonly activationExtensionRatio: number;
  readonly overheadLiftBias: number;
  readonly minEffectiveSpanRatio: number;
}

export interface ResolvedBodyRigConfig extends BodyRigConfig {
  readonly elbowPolicy: ResolvedBodyRigElbowPolicy;
  readonly limits: ResolvedBodyRigLimits;
  readonly solverWeights: ResolvedBodyRigSolverWeights;
  readonly shoulderPolicy: ResolvedBodyRigShoulderPolicy;
}

export interface BuildBodyRigConfigOptions {
  readonly maxYawRad?: number;
  readonly minProjectedSpanRatio?: number;
  readonly neutralDeadzonePx?: number;
}

export const DEFAULT_MAX_TORSO_YAW_DEG = 70;
export const DEFAULT_MAX_TORSO_YAW_RAD = (DEFAULT_MAX_TORSO_YAW_DEG * Math.PI) / 180;
export const DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO = 0.36;
export const DEFAULT_ARM_REACH_UPPER_ARM_RATIO = 0.5;
export const DEFAULT_ARM_REACH_FOREARM_RATIO = 0.5;
export const DEFAULT_ARM_REACH_SHOULDER_SPAN_RATIO = 1.0625;
export const DEFAULT_EXTENSION_COMFORT_RATIO = 0.86;
export const DEFAULT_REACH_PENALTY_WEIGHT = 24;
export const DEFAULT_EXTENSION_PENALTY_WEIGHT = 180;
export const DEFAULT_YAW_PENALTY_WEIGHT = 2.4;
export const DEFAULT_SIDE_BIAS_PENALTY_WEIGHT = 6;
export const DEFAULT_SHOULDER_MAX_LIFT_RATIO = 0.18;
export const DEFAULT_SHOULDER_MAX_OUTWARD_REACH_RATIO = 0.1;
export const DEFAULT_SHOULDER_MAX_CROSS_BODY_REACH_RATIO = 0.05;
export const DEFAULT_SHOULDER_ACTIVATION_EXTENSION_RATIO = 0.78;
export const DEFAULT_SHOULDER_OVERHEAD_LIFT_BIAS = 0.8;
export const DEFAULT_ELBOW_MODE: BodyRigElbowMode = "outward";

export function buildBodyRigConfigFromArmReach(
  armReach: number,
  overrides: BuildBodyRigConfigOptions = {}
): BodyRigConfig {
  const normalizedArmReach = Math.max(0, armReach);
  const baseShoulderSpan = normalizedArmReach * DEFAULT_ARM_REACH_SHOULDER_SPAN_RATIO;

  return {
    upperArmLength: normalizedArmReach * DEFAULT_ARM_REACH_UPPER_ARM_RATIO,
    forearmLength: normalizedArmReach * DEFAULT_ARM_REACH_FOREARM_RATIO,
    baseShoulderSpan,
    maxYawRad: overrides.maxYawRad ?? DEFAULT_MAX_TORSO_YAW_RAD,
    minProjectedSpanRatio:
      overrides.minProjectedSpanRatio ?? DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO,
    elbowPolicy: {
      mode: DEFAULT_ELBOW_MODE,
      preferOverheadOutward: true
    },
    limits: {
      allowStretch: false,
      extensionComfortRatio: DEFAULT_EXTENSION_COMFORT_RATIO
    },
    solverWeights: {
      reachPenalty: DEFAULT_REACH_PENALTY_WEIGHT,
      extensionPenalty: DEFAULT_EXTENSION_PENALTY_WEIGHT,
      yawPenalty: DEFAULT_YAW_PENALTY_WEIGHT,
      sideBiasPenalty: DEFAULT_SIDE_BIAS_PENALTY_WEIGHT
    },
    shoulderPolicy: {
      maxLift: normalizedArmReach * DEFAULT_SHOULDER_MAX_LIFT_RATIO,
      maxOutwardReach: normalizedArmReach * DEFAULT_SHOULDER_MAX_OUTWARD_REACH_RATIO,
      maxCrossBodyReach: normalizedArmReach * DEFAULT_SHOULDER_MAX_CROSS_BODY_REACH_RATIO,
      activationExtensionRatio: DEFAULT_SHOULDER_ACTIVATION_EXTENSION_RATIO,
      overheadLiftBias: DEFAULT_SHOULDER_OVERHEAD_LIFT_BIAS,
      minEffectiveSpanRatio:
        overrides.minProjectedSpanRatio ?? DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO
    },
    ...(overrides.neutralDeadzonePx === undefined
      ? {}
      : { neutralDeadzonePx: overrides.neutralDeadzonePx })
  };
}

export function resolveBodyRigConfig(config: BodyRigConfig): ResolvedBodyRigConfig {
  const armReach = config.upperArmLength + config.forearmLength;

  return {
    ...config,
    elbowPolicy: {
      mode: config.elbowPolicy?.mode ?? DEFAULT_ELBOW_MODE,
      preferOverheadOutward: config.elbowPolicy?.preferOverheadOutward ?? true
    },
    limits: {
      allowStretch: config.limits?.allowStretch ?? false,
      extensionComfortRatio: config.limits?.extensionComfortRatio ?? DEFAULT_EXTENSION_COMFORT_RATIO
    },
    solverWeights: {
      reachPenalty: config.solverWeights?.reachPenalty ?? DEFAULT_REACH_PENALTY_WEIGHT,
      extensionPenalty: config.solverWeights?.extensionPenalty ?? DEFAULT_EXTENSION_PENALTY_WEIGHT,
      yawPenalty: config.solverWeights?.yawPenalty ?? DEFAULT_YAW_PENALTY_WEIGHT,
      sideBiasPenalty: config.solverWeights?.sideBiasPenalty ?? DEFAULT_SIDE_BIAS_PENALTY_WEIGHT
    },
    shoulderPolicy: {
      maxLift: config.shoulderPolicy?.maxLift ?? armReach * DEFAULT_SHOULDER_MAX_LIFT_RATIO,
      maxOutwardReach:
        config.shoulderPolicy?.maxOutwardReach ??
        armReach * DEFAULT_SHOULDER_MAX_OUTWARD_REACH_RATIO,
      maxCrossBodyReach:
        config.shoulderPolicy?.maxCrossBodyReach ??
        armReach * DEFAULT_SHOULDER_MAX_CROSS_BODY_REACH_RATIO,
      activationExtensionRatio:
        config.shoulderPolicy?.activationExtensionRatio ??
        DEFAULT_SHOULDER_ACTIVATION_EXTENSION_RATIO,
      overheadLiftBias:
        config.shoulderPolicy?.overheadLiftBias ?? DEFAULT_SHOULDER_OVERHEAD_LIFT_BIAS,
      minEffectiveSpanRatio:
        config.shoulderPolicy?.minEffectiveSpanRatio ??
        config.minProjectedSpanRatio ??
        DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO
    }
  };
}
