import { describe, expect, it } from "vitest";

import {
  computeDragProjection,
  createProjectionDragState,
  PROJECTION_DRAG_SENSITIVITY_DEG_PER_PX
} from "@/visualizer/projectionDrag";
import {
  PROJECTION_PITCH_MAX,
  PROJECTION_PITCH_MIN,
  PROJECTION_YAW_MAX,
  PROJECTION_YAW_MIN
} from "@/visualizer/useVisualizerSession";

describe("computeDragProjection", () => {
  it("maps horizontal drag to yaw from the drag start anchor", () => {
    expect(computeDragProjection(10, 5, 20, 0)).toEqual({
      yawDeg: 10 + 20 * PROJECTION_DRAG_SENSITIVITY_DEG_PER_PX,
      pitchDeg: 5
    });
  });

  it("maps upward drag to higher pitch from the drag start anchor", () => {
    expect(computeDragProjection(10, 5, 0, -20)).toEqual({
      yawDeg: 10,
      pitchDeg: 5 + 20 * PROJECTION_DRAG_SENSITIVITY_DEG_PER_PX
    });
  });

  it("uses absolute drag deltas instead of accumulating from previous output", () => {
    const first = computeDragProjection(0, 0, 10, -10);
    const second = computeDragProjection(0, 0, 20, -20);

    expect(second.yawDeg).toBe(first.yawDeg * 2);
    expect(second.pitchDeg).toBe(first.pitchDeg * 2);
  });

  it("clamps yaw and pitch to projection bounds", () => {
    expect(computeDragProjection(PROJECTION_YAW_MAX, PROJECTION_PITCH_MAX, 100, -100)).toEqual({
      yawDeg: PROJECTION_YAW_MAX,
      pitchDeg: PROJECTION_PITCH_MAX
    });
    expect(computeDragProjection(PROJECTION_YAW_MIN, PROJECTION_PITCH_MIN, -100, 100)).toEqual({
      yawDeg: PROJECTION_YAW_MIN,
      pitchDeg: PROJECTION_PITCH_MIN
    });
  });
});

describe("createProjectionDragState", () => {
  it("returns drag deltas after start", () => {
    const state = createProjectionDragState();

    state.start(100, 200, -25, 18);

    expect(state.isActive()).toBe(true);
    expect(state.move(120, 185)).toEqual({
      startYawDeg: -25,
      startPitchDeg: 18,
      dx: 20,
      dy: -15
    });
  });

  it("returns null when moved while idle", () => {
    const state = createProjectionDragState();

    expect(state.isActive()).toBe(false);
    expect(state.move(120, 185)).toBeNull();
  });

  it("clears drag state on end", () => {
    const state = createProjectionDragState();

    state.start(100, 200, -25, 18);
    state.end();

    expect(state.isActive()).toBe(false);
    expect(state.move(120, 185)).toBeNull();
  });

  it("replaces an active drag when started again", () => {
    const state = createProjectionDragState();

    state.start(100, 200, -25, 18);
    state.start(10, 20, 5, -5);

    expect(state.move(15, 18)).toEqual({
      startYawDeg: 5,
      startPitchDeg: -5,
      dx: 5,
      dy: -2
    });
  });
});
