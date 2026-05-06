import { describe, expect, it } from "vitest";

import type { CartesianMultiRigPose } from "@/engine/types";
import { computeBodyOverlay } from "@/visualizer/bodyOverlay";
import {
  DEFAULT_RENDER_FRAME_GEOMETRY,
  WEBCAM_RENDER_FRAME_GEOMETRY,
  renderFrame
} from "@/visualizer/renderFrame";
import { createSceneLayout } from "@/visualizer/sceneLayout";

function createMockContext() {
  const operations: string[] = [];
  let globalAlpha = 1;
  let lineWidth = 1;

  const ctx = {
    fillStyle: "",
    strokeStyle: "",
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
    save: () => {
      operations.push("save");
    },
    restore: () => {
      operations.push("restore");
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
  } as Record<string, unknown>;

  Object.defineProperty(ctx, "globalAlpha", {
    get: () => globalAlpha,
    set: (value: number) => {
      globalAlpha = value;
      operations.push(`globalAlpha:${value.toFixed(2)}`);
    }
  });
  Object.defineProperty(ctx, "lineWidth", {
    get: () => lineWidth,
    set: (value: number) => {
      lineWidth = value;
      operations.push(`lineWidth:${value.toFixed(1)}`);
    }
  });

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    operations
  };
}

function createSingleRigRenderInput() {
  return {
    layout: createSceneLayout({
      cssWidth: 300,
      cssHeight: 200,
      pixelsPerWorldUnit: 100,
      rigAnchors: { left: { x: 0, y: 0 } }
    }),
    poses: {
      left: {
        handPosition: { x: 0.5, y: 0 },
        headPosition: { x: 1, y: 0 }
      }
    } satisfies CartesianMultiRigPose,
    trails: {
      left: {
        hand: [
          { x: -0.5, y: -0.25 },
          { x: 0, y: -0.5 },
          { x: 0.5, y: -0.25 }
        ],
        head: [
          { x: -0.7, y: -0.35 },
          { x: 0, y: -0.7 },
          { x: 0.7, y: -0.35 }
        ]
      }
    }
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
    expect(operations).toContain("moveTo:200.0,150.0");
    expect(operations).toContain("lineTo:250.0,150.0");
    expect(operations).toContain("moveTo:400.0,150.0");
    expect(operations).toContain("lineTo:450.0,150.0");
    expect(operations).toContain("fillText:left:100.0,140.0");
    expect(operations).toContain("fillText:right:300.0,140.0");
  });

  it("draws hand and head trail polylines before node chains", () => {
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
        left: {
          hand: [
            { x: -0.5, y: -0.25 },
            { x: 0, y: -0.5 },
            { x: 0.5, y: -0.25 }
          ],
          head: [
            { x: -0.7, y: -0.35 },
            { x: 0, y: -0.7 },
            { x: 0.7, y: -0.35 }
          ]
        }
      }
    });

    const handTrailIndex = operations.indexOf("lineTo:150.0,150.0");
    const headTrailIndex = operations.indexOf("lineTo:150.0,170.0");
    const chainLineIndex = operations.indexOf("lineTo:250.0,100.0");

    expect(handTrailIndex).toBeGreaterThan(-1);
    expect(headTrailIndex).toBeGreaterThan(-1);
    expect(chainLineIndex).toBeGreaterThan(handTrailIndex);
    expect(chainLineIndex).toBeGreaterThan(headTrailIndex);
  });

  it("tolerates missing hand or head trail without skipping the other", () => {
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

    expect(() =>
      renderFrame(ctx, layout, poses, {
        trails: {
          left: {
            head: [
              { x: -0.7, y: -0.35 },
              { x: 0, y: -0.7 },
              { x: 0.7, y: -0.35 }
            ]
          }
        }
      })
    ).not.toThrow();

    expect(operations).toContain("lineTo:150.0,170.0");
  });

  it("applies fade along trail segments", () => {
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
        left: {
          hand: [
            { x: -0.5, y: -0.25 },
            { x: 0, y: -0.5 },
            { x: 0.5, y: -0.25 }
          ]
        }
      }
    });

    const alphaOps = operations.filter((op) => op.startsWith("globalAlpha:"));
    expect(alphaOps).toContain("globalAlpha:0.60");
    expect(alphaOps).toContain("globalAlpha:1.00");
  });

  it("skips background fill when transparent rendering is requested", () => {
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

    renderFrame(ctx, layout, poses, { transparentBackground: true });

    expect(operations).toContain("clearRect:0,0,300,200");
    expect(operations.some((operation) => operation.startsWith("fillRect:"))).toBe(false);
  });

  it("allows webcam geometry to raise trail opacity without changing draw order", () => {
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
    const trails = {
      left: {
        hand: [
          { x: -0.5, y: -0.25 },
          { x: 0, y: -0.5 },
          { x: 0.5, y: -0.25 }
        ]
      }
    };

    const defaultResult = createMockContext();
    renderFrame(defaultResult.ctx, layout, poses, {
      trails,
      geometry: DEFAULT_RENDER_FRAME_GEOMETRY
    });

    const webcamResult = createMockContext();
    renderFrame(webcamResult.ctx, layout, poses, {
      trails,
      geometry: WEBCAM_RENDER_FRAME_GEOMETRY
    });

    expect(defaultResult.operations).toContain("globalAlpha:0.60");
    expect(webcamResult.operations).toContain("globalAlpha:0.95");
    expect(webcamResult.operations.indexOf("lineTo:250.0,100.0")).toBeGreaterThan(
      webcamResult.operations.indexOf("lineTo:150.0,150.0")
    );
  });

  it("applies custom overlay geometry", () => {
    const { layout, poses, trails } = createSingleRigRenderInput();
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, {
      trails,
      geometry: {
        chainLineWidth: 9,
        trailLineWidth: 4.5,
        handRadius: 11,
        headRadius: 13,
        nodeStrokeWidth: 3.5,
        trailMinOpacity: 0.25,
        bodyLineWidth: 12,
        bodySecondaryLineWidth: 6,
        bodyArmLineWidth: 12,
        bodyJointRadius: 5.5,
        bodyHeadLineWidth: 9
      }
    });

    expect(operations).toContain("lineWidth:4.5");
    expect(operations).toContain("lineWidth:9.0");
    expect(operations).toContain("lineWidth:3.5");
    expect(operations).toContain("arc:200.0,100.0,11.0");
    expect(operations).toContain("arc:250.0,100.0,13.0");
  });

  it("can hide only hand trails", () => {
    const { layout, poses, trails } = createSingleRigRenderInput();
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, { trails, showHandTrails: false });

    expect(operations).not.toContain("lineTo:150.0,150.0");
    expect(operations).toContain("lineTo:150.0,170.0");
    expect(operations).toContain("lineTo:250.0,100.0");
    expect(operations).toContain("arc:200.0,100.0,8.0");
  });

  it("can hide only head trails", () => {
    const { layout, poses, trails } = createSingleRigRenderInput();
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, { trails, showHeadTrails: false });

    expect(operations).toContain("lineTo:150.0,150.0");
    expect(operations).not.toContain("lineTo:150.0,170.0");
    expect(operations).toContain("lineTo:250.0,100.0");
    expect(operations).toContain("arc:250.0,100.0,10.0");
  });

  it("can hide only chain lines", () => {
    const { layout, poses, trails } = createSingleRigRenderInput();
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, { trails, showChainLines: false });

    expect(operations).toContain("lineTo:150.0,150.0");
    expect(operations).toContain("lineTo:150.0,170.0");
    expect(operations).not.toContain("lineTo:250.0,100.0");
    expect(operations).toContain("arc:250.0,100.0,10.0");
  });

  it("can hide only node markers", () => {
    const { layout, poses, trails } = createSingleRigRenderInput();
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, { trails, showNodeMarkers: false });

    expect(operations).toContain("lineTo:150.0,150.0");
    expect(operations).toContain("lineTo:150.0,170.0");
    expect(operations).toContain("lineTo:250.0,100.0");
    expect(operations.some((operation) => operation.startsWith("arc:"))).toBe(false);
  });

  it("draws prepared body overlay between trails and poi chains", () => {
    const { layout, poses, trails } = createSingleRigRenderInput();
    const bodyOverlay = computeBodyOverlay({
      layout,
      worldPoses: {
        left: {
          handPosition: { x: -0.5, y: 0.25, z: 0 },
          headPosition: { x: -0.25, y: 0.25, z: 0 },
          planeId: "wall"
        },
        right: {
          handPosition: { x: 0.5, y: 0.25, z: 0 },
          headPosition: { x: 0.75, y: 0.25, z: 0 },
          planeId: "wall"
        }
      }
    });
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, {
      trails,
      bodyOverlay,
      showBodyRig: true
    });

    const handTrailIndex = operations.indexOf("lineTo:150.0,150.0");
    const bodyIndex = operations.indexOf("lineWidth:12.0");
    const chainLineIndex = operations.indexOf("lineTo:250.0,100.0");

    expect(bodyOverlay).not.toBeNull();
    expect(bodyIndex).toBeGreaterThan(handTrailIndex);
    expect(chainLineIndex).toBeGreaterThan(bodyIndex);
  });

  it("does not draw provided body overlay when the body layer is disabled", () => {
    const { layout, poses } = createSingleRigRenderInput();
    const bodyOverlay = computeBodyOverlay({
      layout,
      worldPoses: {
        left: {
          handPosition: { x: -0.5, y: 0.25, z: 0 },
          headPosition: { x: -0.25, y: 0.25, z: 0 },
          planeId: "wall"
        },
        right: {
          handPosition: { x: 0.5, y: 0.25, z: 0 },
          headPosition: { x: 0.75, y: 0.25, z: 0 },
          planeId: "wall"
        }
      }
    });
    const { ctx, operations } = createMockContext();

    renderFrame(ctx, layout, poses, { bodyOverlay });

    expect(operations).not.toContain("lineWidth:12.0");
  });

  it("tolerates enabled body layer with no prepared body data", () => {
    const { layout, poses } = createSingleRigRenderInput();
    const { ctx, operations } = createMockContext();

    expect(() => renderFrame(ctx, layout, poses, { showBodyRig: true })).not.toThrow();
    expect(operations).toContain("lineTo:250.0,100.0");
  });
});
