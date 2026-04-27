import type { CartesianMultiRigPose, RigId, Vec2 } from "@/engine/types";

import {
  DEFAULT_RIG_STYLES,
  clearFrame,
  drawLabel,
  drawLine,
  drawNode,
  drawPolyline,
  type RigRenderStyle
} from "@/visualizer/drawingTools";
import {
  getRigAnchor,
  translatePoint,
  worldToCanvas,
  type SceneLayout
} from "@/visualizer/sceneLayout";

export interface RenderFrameOptions {
  readonly backgroundColor?: string;
  readonly rigOrder?: readonly RigId[];
  readonly rigStyles?: Partial<Record<RigId, RigRenderStyle>>;
  readonly trails?: Partial<Record<RigId, readonly Vec2[]>>;
  readonly showLabels?: boolean;
}

function styleForRig(
  rigId: RigId,
  index: number,
  rigStyles?: Partial<Record<RigId, RigRenderStyle>>
): RigRenderStyle {
  return rigStyles?.[rigId] ?? DEFAULT_RIG_STYLES[index % DEFAULT_RIG_STYLES.length];
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  poses: CartesianMultiRigPose,
  options: RenderFrameOptions = {}
) {
  clearFrame(ctx, layout.cssWidth, layout.cssHeight, options.backgroundColor ?? "#020617");

  const rigOrder = options.rigOrder ?? Object.keys(poses).sort();

  rigOrder.forEach((rigId, index) => {
    const pose = poses[rigId];
    if (!pose) {
      return;
    }

    const style = styleForRig(rigId, index, options.rigStyles);
    const anchorWorld = getRigAnchor(layout, rigId);
    const bodyCanvas = worldToCanvas(layout, anchorWorld);
    const handCanvas = worldToCanvas(layout, translatePoint(anchorWorld, pose.handPosition));
    const headCanvas = worldToCanvas(layout, translatePoint(anchorWorld, pose.headPosition));
    const trail = options.trails?.[rigId];

    if (trail && trail.length > 1) {
      const trailCanvas = trail.map((point) =>
        worldToCanvas(layout, translatePoint(anchorWorld, point))
      );
      drawPolyline(ctx, trailCanvas, style.trailColor, 2);
    }

    drawLine(ctx, bodyCanvas, handCanvas, style.lineColor, 2);
    drawLine(ctx, handCanvas, headCanvas, style.lineColor, 2);
    drawNode(ctx, bodyCanvas, 5, style.bodyColor);
    drawNode(ctx, handCanvas, 6, style.handColor, "#0f172a", 1.5);
    drawNode(ctx, headCanvas, 8, style.headColor, "#0f172a", 1.5);

    if (options.showLabels ?? true) {
      drawLabel(ctx, rigId, { x: bodyCanvas.x, y: bodyCanvas.y - 10 }, style.labelColor);
    }
  });
}
