import type { PlaneProjectionSettings } from "@/engine/planeProjection";

import type { BodyRigFrame, BodyRigPose } from "./bodyRigFrame";
import { solveBodyRigFrame } from "./bodyRigFrame";
import type { BodyRigWorldGoals } from "./stickFigureGeometry";

/**
 * A display-only continuation policy for chronological playback.
 *
 * The static solver deliberately has no history: the same fixed hand targets
 * always produce the same frame. During playback, however, a symmetric motion
 * can have two equally valid torso-facing branches. This adapter makes the
 * branch choice explicit and stable without changing POI or fixed-pose
 * semantics.
 */
export const DEFAULT_BODY_RIG_YAW_CONTINUITY_WEIGHT = 64;

export interface BodyRigMotionSolveOptions {
  readonly time?: number;
  readonly yawContinuityWeight?: number;
}

export class BodyRigMotionSolver {
  private previousTime: number | null = null;
  private previousYawRad: number | null = null;

  public reset(): void {
    this.previousTime = null;
    this.previousYawRad = null;
  }

  public solve(
    body: BodyRigFrame,
    goals: BodyRigWorldGoals,
    projectionSettings: PlaneProjectionSettings,
    options: BodyRigMotionSolveOptions = {}
  ): BodyRigPose {
    const time = options.time;
    const isChronological =
      Number.isFinite(time) &&
      this.previousTime !== null &&
      time !== undefined &&
      time >= this.previousTime;
    const weight = options.yawContinuityWeight ?? DEFAULT_BODY_RIG_YAW_CONTINUITY_WEIGHT;
    const pose = solveBodyRigFrame(body, goals, projectionSettings, {
      ...(isChronological && this.previousYawRad !== null
        ? {
            yawContinuity: {
              previousYawRad: this.previousYawRad,
              weight
            }
          }
        : {})
    });

    this.previousTime = time !== undefined && Number.isFinite(time) ? time : null;
    this.previousYawRad = pose.skeleton.solverDiagnostics.chestYawRad;
    return pose;
  }
}
