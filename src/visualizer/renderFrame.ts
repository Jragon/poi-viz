import type { CartesianMultiRigPose, RigId, Vec2 } from "@/engine/types";

import {
  DEFAULT_RIG_STYLES,
  clearFrame,
  drawFadingPolyline,
  drawLabel,
  drawLine,
  drawNode,
  type RigRenderStyle
} from "@/visualizer/drawingTools";
import {
  getRigAnchor,
  translatePoint,
  worldToCanvas,
  type SceneLayout
} from "@/visualizer/sceneLayout";

export interface RenderFrameGeometry {
  readonly chainLineWidth: number;
  readonly trailLineWidth: number;
  readonly handRadius: number;
  readonly headRadius: number;
  readonly nodeStrokeWidth: number;
  readonly trailMinOpacity: number;
}

export const DEFAULT_RENDER_FRAME_GEOMETRY: RenderFrameGeometry = {
  chainLineWidth: 3,
  trailLineWidth: 3,
  handRadius: 8,
  headRadius: 10,
  nodeStrokeWidth: 2,
  trailMinOpacity: 0.2
};

export const WEBCAM_RENDER_FRAME_GEOMETRY: RenderFrameGeometry = {
  ...DEFAULT_RENDER_FRAME_GEOMETRY,
  trailMinOpacity: 0.9,
  chainLineWidth: 5,
  trailLineWidth: 5
};

export interface RigTrail {
  readonly hand?: readonly Vec2[];
  readonly head?: readonly Vec2[];
}

export interface RenderFrameOptions {
  readonly backgroundColor?: string;
  readonly transparentBackground?: boolean;
  readonly geometry?: RenderFrameGeometry;
  readonly rigOrder?: readonly RigId[];
  readonly rigStyles?: Partial<Record<RigId, RigRenderStyle>>;
  readonly trails?: Partial<Record<RigId, RigTrail>>;
  readonly showHandTrails?: boolean;
  readonly showHeadTrails?: boolean;
  readonly showChainLines?: boolean;
  readonly showNodeMarkers?: boolean;
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
  const geometry = options.geometry ?? DEFAULT_RENDER_FRAME_GEOMETRY;
  const showHandTrails = options.showHandTrails ?? true;
  const showHeadTrails = options.showHeadTrails ?? true;
  const showChainLines = options.showChainLines ?? true;
  const showNodeMarkers = options.showNodeMarkers ?? true;

  clearFrame(ctx, layout.cssWidth, layout.cssHeight, {
    ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    ...(options.transparentBackground !== undefined
      ? { transparentBackground: options.transparentBackground }
      : {})
  });

  const rigOrder = options.rigOrder ?? Object.keys(poses).sort();

  rigOrder.forEach((rigId, index) => {
    const pose = poses[rigId];
    if (!pose) {
      return;
    }

    const style = styleForRig(rigId, index, options.rigStyles);
    const anchorWorld = getRigAnchor(layout, rigId);
    const anchorCanvas = worldToCanvas(layout, anchorWorld);
    const handCanvas = worldToCanvas(layout, translatePoint(anchorWorld, pose.handPosition));
    const headCanvas = worldToCanvas(layout, translatePoint(anchorWorld, pose.headPosition));
    const trail = options.trails?.[rigId];

    if (trail) {
      if (showHandTrails && trail.hand && trail.hand.length > 1) {
        const handTrailCanvas = trail.hand.map((point) =>
          worldToCanvas(layout, translatePoint(anchorWorld, point))
        );
        drawFadingPolyline(
          ctx,
          handTrailCanvas,
          style.handTrailColor,
          geometry.trailLineWidth,
          geometry.trailMinOpacity
        );
      }

      if (showHeadTrails && trail.head && trail.head.length > 1) {
        const headTrailCanvas = trail.head.map((point) =>
          worldToCanvas(layout, translatePoint(anchorWorld, point))
        );
        drawFadingPolyline(
          ctx,
          headTrailCanvas,
          style.headTrailColor,
          geometry.trailLineWidth,
          geometry.trailMinOpacity
        );
      }
    }

    if (showChainLines) {
      drawLine(ctx, handCanvas, headCanvas, style.lineColor, geometry.chainLineWidth);
    }

    if (showNodeMarkers) {
      drawNode(
        ctx,
        handCanvas,
        geometry.handRadius,
        style.handColor,
        "#0f172a",
        geometry.nodeStrokeWidth
      );
      drawNode(
        ctx,
        headCanvas,
        geometry.headRadius,
        style.headColor,
        "#0f172a",
        geometry.nodeStrokeWidth
      );
    }

    if (options.showLabels ?? true) {
      drawLabel(ctx, rigId, { x: anchorCanvas.x, y: anchorCanvas.y - 10 }, style.labelColor);
    }
  });
}
