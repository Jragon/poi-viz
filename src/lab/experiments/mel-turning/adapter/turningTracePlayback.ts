import { PI } from "@/engine/constants";
import type {
  DriverEvalContext,
  MultiRigSequence,
  RelativeNodePose,
  Segment,
  Vec2
} from "@/engine/types";
import {
  getTurningFacingAtStep,
  projectTurningHandPoint
} from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import type {
  BodyTurnDirection,
  TurningDirection,
  TurningLaneId,
  TurningNode,
  TurningPhase,
  TurningTrace,
  TurningTrack
} from "@/lab/experiments/mel-turning/model/turningTypes";

export interface TurningTracePlaybackOptions {
  readonly halfBeatDuration: number;
  readonly headRadius: number;
  readonly handHorizontalOffset: number;
  readonly handVerticalOffset: number;
}

export const DEFAULT_TURNING_TRACE_PLAYBACK_OPTIONS: TurningTracePlaybackOptions = {
  halfBeatDuration: 0.5,
  headRadius: 0.6,
  handHorizontalOffset: 0.5,
  handVerticalOffset: 0.35
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, progress: number): number {
  return a + (b - a) * progress;
}

function lerpPoint(a: Vec2, b: Vec2, progress: number): Vec2 {
  return {
    x: lerp(a.x, b.x, progress),
    y: lerp(a.y, b.y, progress)
  };
}

function cartesianToPolar(point: Vec2, fallbackPhaseAbs: number): RelativeNodePose {
  const radius = Math.hypot(point.x, point.y);
  if (radius <= 1e-12) return { phaseAbs: fallbackPhaseAbs, radius: 0 };

  return {
    phaseAbs: Math.atan2(point.y, point.x),
    radius
  };
}

function phaseAbsForLabel(phase: TurningPhase): number {
  return phase === "up" ? PI / 2 : (3 * PI) / 2;
}

function directionSign(direction: TurningDirection): 1 | -1 {
  return direction === "counterclockwise" ? 1 : -1;
}

function lanePoint(laneId: TurningLaneId, options: TurningTracePlaybackOptions): Vec2 {
  const vertical = laneId.endsWith("-high")
    ? options.handVerticalOffset
    : laneId.endsWith("-low")
      ? -options.handVerticalOffset
      : 0;

  if (laneId.startsWith("left-")) {
    return { x: -options.handHorizontalOffset, y: vertical };
  }
  if (laneId.startsWith("right-")) {
    return { x: options.handHorizontalOffset, y: vertical };
  }
  return { x: 0, y: 0 };
}

function observerHandPoint(
  trace: TurningTrace,
  node: TurningNode,
  options: TurningTracePlaybackOptions
): Vec2 {
  return projectTurningHandPoint(
    node.handPoint ?? lanePoint(node.laneId, options),
    getTurningFacingAtStep(trace, node.step),
    "observer-relative"
  );
}

function makeHandMotion(
  trace: TurningTrace,
  from: TurningNode,
  to: TurningNode,
  options: TurningTracePlaybackOptions
): Segment["hand"] {
  const start = observerHandPoint(trace, from, options);
  const end = observerHandPoint(trace, to, options);
  const startPose = cartesianToPolar(start, phaseAbsForLabel(from.phase));

  if (Math.hypot(end.x - start.x, end.y - start.y) <= 1e-12) {
    return {
      startPose,
      driver: { kind: "circle", omega: 0 }
    };
  }

  return {
    startPose,
    driver: {
      kind: "runtime",
      label: `turning hand ${from.laneId} to ${to.laneId}`,
      evalPose: (fallback, context: DriverEvalContext) =>
        cartesianToPolar(
          lerpPoint(start, end, clamp01(context.tLocal / context.durationUnits)),
          fallback.phaseAbs
        )
    }
  };
}

function orderedNodes(track: TurningTrack): readonly TurningNode[] {
  return [...track.nodes].sort((a, b) => a.step - b.step);
}

function compileTrack(
  trace: TurningTrace,
  track: TurningTrack,
  options: TurningTracePlaybackOptions
): Segment[] {
  const nodes = orderedNodes(track);
  const omega = (directionSign(track.poiDirection) * PI) / options.halfBeatDuration;

  return nodes.slice(0, -1).map((from, index) => {
    const to = nodes[index + 1];
    if (!to) throw new Error(`Turning track ${track.id} has no node after t${from.step}.`);
    const stepDelta = to.step - from.step;
    if (!Number.isInteger(stepDelta) || stepDelta <= 0) {
      throw new Error(`Turning track ${track.id} steps must increase.`);
    }

    return {
      durationUnits: stepDelta * options.halfBeatDuration,
      planeId: "wall",
      planeSide: to.planeSide,
      ...(from.handPlacement === "behind-body" ? { behindBody: true } : {}),
      hand: makeHandMotion(trace, from, to, options),
      head: {
        startPose: {
          phaseAbs: phaseAbsForLabel(from.phase),
          radius: options.headRadius
        },
        driver: {
          kind: "circle",
          omega
        }
      }
    };
  });
}

/**
 * Compile a finite turning trace for the existing engine/visualizer. The engine
 * remains periodic; the explorer transport decides whether to stop-reset or
 * replay when this finite presentation reaches its boundary.
 */
export function compileTurningTracePlayback(
  trace: TurningTrace,
  options: TurningTracePlaybackOptions = DEFAULT_TURNING_TRACE_PLAYBACK_OPTIONS
): MultiRigSequence {
  return {
    rigs: trace.tracks.map((track) => ({
      rigId: track.id,
      sequence: {
        segments: compileTrack(trace, track, options)
      }
    }))
  };
}

function turnSign(direction: BodyTurnDirection): 1 | -1 {
  return direction === "right" ? 1 : -1;
}

export function getTurningRootFacingDeg(
  trace: TurningTrace,
  currentTime: number,
  halfBeatDuration = DEFAULT_TURNING_TRACE_PLAYBACK_OPTIONS.halfBeatDuration
): number {
  if (
    !Number.isFinite(currentTime) ||
    currentTime <= 0 ||
    !Number.isFinite(halfBeatDuration) ||
    halfBeatDuration <= 0
  ) {
    return 0;
  }

  const firstStep = Math.min(
    ...trace.tracks.flatMap((track) => track.nodes.map((node) => node.step))
  );
  if (!Number.isFinite(firstStep)) return 0;

  let facingDeg = 0;
  const events = [...trace.events].sort((a, b) => a.afterStep - b.afterStep);

  for (const event of events) {
    const startTime = (event.afterStep - firstStep) * halfBeatDuration;
    const progress = clamp01((currentTime - startTime) / halfBeatDuration);
    facingDeg += turnSign(event.direction) * event.degrees * progress;
  }

  return facingDeg;
}
