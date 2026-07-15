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
  readonly pelvisPolicy?: BodyRigPelvisPolicy;
  readonly chestPolicy?: BodyRigChestPolicy;
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

export interface BodyRigPelvisPolicy {
  readonly yawFollowRatio?: number;
  readonly maxLateralShift?: number;
  readonly maxForwardShift?: number;
}

export interface BodyRigChestPolicy {
  readonly yawFollowRatio?: number;
  readonly centerLiftRatio?: number;
}

export interface BodyRigShoulderPolicy {
  readonly maxLift?: number;
  readonly maxOutwardReach?: number;
  readonly maxCrossBodyReach?: number;
  readonly activationExtensionRatio?: number;
  readonly overheadLiftBias?: number;
  readonly minEffectiveSpanRatio?: number;
  readonly maxProtraction?: number;
  readonly maxRetraction?: number;
  readonly overheadAmbiguityRadius?: number;
  readonly overheadLateralFadeRadius?: number;
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

export interface ResolvedBodyRigPelvisPolicy {
  readonly yawFollowRatio: number;
  readonly maxLateralShift: number;
  readonly maxForwardShift: number;
}

export interface ResolvedBodyRigChestPolicy {
  readonly yawFollowRatio: number;
  readonly centerLiftRatio: number;
}

export interface ResolvedBodyRigShoulderPolicy {
  readonly maxLift: number;
  readonly maxOutwardReach: number;
  readonly maxCrossBodyReach: number;
  readonly activationExtensionRatio: number;
  readonly overheadLiftBias: number;
  readonly minEffectiveSpanRatio: number;
  readonly maxProtraction: number;
  readonly maxRetraction: number;
  readonly overheadAmbiguityRadius: number;
  readonly overheadLateralFadeRadius: number;
}

export interface ResolvedBodyRigConfig extends BodyRigConfig {
  readonly elbowPolicy: ResolvedBodyRigElbowPolicy;
  readonly limits: ResolvedBodyRigLimits;
  readonly solverWeights: ResolvedBodyRigSolverWeights;
  readonly shoulderPolicy: ResolvedBodyRigShoulderPolicy;
  readonly pelvisPolicy: ResolvedBodyRigPelvisPolicy;
  readonly chestPolicy: ResolvedBodyRigChestPolicy;
}

export interface BuildBodyRigConfigOptions {
  readonly maxYawRad?: number;
  readonly minProjectedSpanRatio?: number;
  readonly neutralDeadzonePx?: number;
}

export const DEFAULT_MAX_TORSO_YAW_DEG = 55;
export const DEFAULT_MAX_TORSO_YAW_RAD = (DEFAULT_MAX_TORSO_YAW_DEG * Math.PI) / 180;
export const DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO = 0.36;
export const DEFAULT_ARM_REACH_UPPER_ARM_RATIO = 0.55;
export const DEFAULT_ARM_REACH_FOREARM_RATIO = 0.45;
export const DEFAULT_ARM_REACH_SHOULDER_SPAN_RATIO = 0.8;
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
export const DEFAULT_PELVIS_YAW_FOLLOW_RATIO = 0.35;
export const DEFAULT_PELVIS_MAX_LATERAL_SHIFT_RATIO = 0.12;
export const DEFAULT_PELVIS_MAX_FORWARD_SHIFT_RATIO = 0.08;
export const DEFAULT_CHEST_YAW_FOLLOW_RATIO = 0.82;
export const DEFAULT_CHEST_CENTER_LIFT_RATIO = 0;
export const DEFAULT_SHOULDER_MAX_PROTRACTION_RATIO = 0.12;
export const DEFAULT_SHOULDER_MAX_RETRACTION_RATIO = 0.06;
export const DEFAULT_SHOULDER_OVERHEAD_AMBIGUITY_RADIUS_RATIO = 0.18;
export const DEFAULT_SHOULDER_OVERHEAD_LATERAL_FADE_RADIUS_RATIO = 0.28;
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
    pelvisPolicy: {
      yawFollowRatio: DEFAULT_PELVIS_YAW_FOLLOW_RATIO,
      maxLateralShift: baseShoulderSpan * DEFAULT_PELVIS_MAX_LATERAL_SHIFT_RATIO,
      maxForwardShift: baseShoulderSpan * DEFAULT_PELVIS_MAX_FORWARD_SHIFT_RATIO
    },
    chestPolicy: {
      yawFollowRatio: DEFAULT_CHEST_YAW_FOLLOW_RATIO,
      centerLiftRatio: DEFAULT_CHEST_CENTER_LIFT_RATIO
    },
    shoulderPolicy: {
      maxLift: normalizedArmReach * DEFAULT_SHOULDER_MAX_LIFT_RATIO,
      maxOutwardReach: normalizedArmReach * DEFAULT_SHOULDER_MAX_OUTWARD_REACH_RATIO,
      maxCrossBodyReach: normalizedArmReach * DEFAULT_SHOULDER_MAX_CROSS_BODY_REACH_RATIO,
      activationExtensionRatio: DEFAULT_SHOULDER_ACTIVATION_EXTENSION_RATIO,
      overheadLiftBias: DEFAULT_SHOULDER_OVERHEAD_LIFT_BIAS,
      minEffectiveSpanRatio:
        overrides.minProjectedSpanRatio ?? DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO,
      maxProtraction: normalizedArmReach * DEFAULT_SHOULDER_MAX_PROTRACTION_RATIO,
      maxRetraction: normalizedArmReach * DEFAULT_SHOULDER_MAX_RETRACTION_RATIO,
      overheadAmbiguityRadius:
        normalizedArmReach * DEFAULT_SHOULDER_OVERHEAD_AMBIGUITY_RADIUS_RATIO,
      overheadLateralFadeRadius:
        normalizedArmReach * DEFAULT_SHOULDER_OVERHEAD_LATERAL_FADE_RADIUS_RATIO
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
    pelvisPolicy: {
      yawFollowRatio: config.pelvisPolicy?.yawFollowRatio ?? DEFAULT_PELVIS_YAW_FOLLOW_RATIO,
      maxLateralShift:
        config.pelvisPolicy?.maxLateralShift ??
        config.baseShoulderSpan * DEFAULT_PELVIS_MAX_LATERAL_SHIFT_RATIO,
      maxForwardShift:
        config.pelvisPolicy?.maxForwardShift ??
        config.baseShoulderSpan * DEFAULT_PELVIS_MAX_FORWARD_SHIFT_RATIO
    },
    chestPolicy: {
      yawFollowRatio: config.chestPolicy?.yawFollowRatio ?? DEFAULT_CHEST_YAW_FOLLOW_RATIO,
      centerLiftRatio: config.chestPolicy?.centerLiftRatio ?? DEFAULT_CHEST_CENTER_LIFT_RATIO
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
        DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO,
      maxProtraction:
        config.shoulderPolicy?.maxProtraction ?? armReach * DEFAULT_SHOULDER_MAX_PROTRACTION_RATIO,
      maxRetraction:
        config.shoulderPolicy?.maxRetraction ?? armReach * DEFAULT_SHOULDER_MAX_RETRACTION_RATIO,
      overheadAmbiguityRadius:
        config.shoulderPolicy?.overheadAmbiguityRadius ??
        armReach * DEFAULT_SHOULDER_OVERHEAD_AMBIGUITY_RADIUS_RATIO,
      overheadLateralFadeRadius:
        config.shoulderPolicy?.overheadLateralFadeRadius ??
        armReach * DEFAULT_SHOULDER_OVERHEAD_LATERAL_FADE_RADIUS_RATIO
    }
  };
}
