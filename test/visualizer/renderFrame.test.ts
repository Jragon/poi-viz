import { describe, expect, it } from "vitest";

import type { CartesianMultiRigPose } from "@/engine/types";
import { renderFrame } from "@/visualizer/renderFrame";
import { createSceneLayout } from "@/visualizer/sceneLayout";

function createMockContext() {
  const operations: string[] = [];

  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    clearRect: (x: number, y: number, width: number, height: number) => {
      operations.push(`clearRect:${x},${y},${width},${height}`);
    },
    fillRect: (x: number, y: number, width: number, height: number) => {
      operations.push(`fillRect:${x},${y},${width},${height}`);
    },
    beginPath: () => {
      operations.push("beginPath");
    },
    moveTo: (x: number, y: number) => {
      operations.push(`moveTo:${x.toFixed(1)},${y.toFixed(1)}`);
    },
    lineTo: (x: number, y: number) => {
      operations.push(`lineTo:${x.toFixed(1)},${y.toFixed(1)}`);
    },
    stroke: () => {
      operations.push("stroke");
    },
    arc: (x: number, y: number, radius: number) => {
      operations.push(`arc:${x.toFixed(1)},${y.toFixed(1)},${radius.toFixed(1)}`);
    },
    fill: () => {
      operations.push("fill");
    },
    fillText: (text: string, x: number, y: number) => {
      operations.push(`fillText:${text}:${x.toFixed(1)},${y.toFixed(1)}`);
    }
  };

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    operations
  };
}

describe("renderFrame", () => {
  it("draws rigs in deterministic order with anchor offsets applied", () => {
    const layout = createSceneLayout({
      cssWidth: 400,
      cssHeight: 300,
      rigAnchors: {
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
      },
      pixelsPerWorldUnit: 100
    });
    const poses: CartesianMultiRigPose = {
      right: {
        handPosition: { x: 1, y: 0 },
        headPosition: { x: 1.5, y: 0 }
      },
      left: {
        handPosition: { x: 1, y: 0 },
        headPosition: { x: 1.5, y: 0 }
      }
    };
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses);

    expect(operations[0]).toBe("clearRect:0,0,400,300");
    expect(operations[1]).toBe("fillRect:0,0,400,300");
    expect(operations).toContain("moveTo:100.0,150.0");
    expect(operations).toContain("lineTo:200.0,150.0");
    expect(operations).toContain("moveTo:300.0,150.0");
    expect(operations).toContain("lineTo:400.0,150.0");
    expect(operations).toContain("fillText:left:100.0,140.0");
    expect(operations).toContain("fillText:right:300.0,140.0");
  });

  it("draws trail polylines before node chains", () => {
    const layout = createSceneLayout({
      cssWidth: 300,
      cssHeight: 200,
      pixelsPerWorldUnit: 100,
      rigAnchors: { left: { x: 0, y: 0 } }
    });
    const poses: CartesianMultiRigPose = {
      left: {
        handPosition: { x: 0.5, y: 0 },
        headPosition: { x: 1, y: 0 }
      }
    };
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, {
      trails: {
        left: [
          { x: -0.5, y: -0.25 },
          { x: 0, y: -0.5 },
          { x: 0.5, y: -0.25 }
        ]
      }
    });

    const trailLineIndex = operations.indexOf("lineTo:150.0,150.0");
    const chainLineIndex = operations.indexOf("lineTo:200.0,100.0");

    expect(trailLineIndex).toBeGreaterThan(-1);
    expect(chainLineIndex).toBeGreaterThan(trailLineIndex);
  });
});
