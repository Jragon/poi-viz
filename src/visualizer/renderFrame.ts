import { getBodyRigArmDrawOrder, getBodyRigArmPoints, type ArmSide } from "@/body-rig";
import type { CartesianMultiRigPose, RigId, Vec2 } from "@/engine/types";
import type { BodyOverlayFrame } from "@/visualizer/bodyOverlay";

import {
  DEFAULT_RIG_STYLES,
  clearFrame,
  drawFadingPolyline,
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

export interface RenderFrameGeometry {
  readonly chainLineWidth: number;
  readonly trailLineWidth: number;
  readonly handRadius: number;
  readonly headRadius: number;
  readonly nodeStrokeWidth: number;
  readonly trailMinOpacity: number;
  readonly bodyLineWidth: number;
  readonly bodySecondaryLineWidth: number;
  readonly bodyArmLineWidth: number;
  readonly bodyJointRadius: number;
  readonly bodyHeadLineWidth: number;
}

export const DEFAULT_RENDER_FRAME_GEOMETRY: RenderFrameGeometry = {
  chainLineWidth: 3,
  trailLineWidth: 3,
  handRadius: 8,
  headRadius: 10,
  nodeStrokeWidth: 2,
  trailMinOpacity: 0.2,
  bodyLineWidth: 12,
  bodySecondaryLineWidth: 6,
  bodyArmLineWidth: 12,
  bodyJointRadius: 5.5,
  bodyHeadLineWidth: 9
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
  readonly bodyOverlay?: BodyOverlayFrame | null;
  readonly showHandTrails?: boolean;
  readonly showHeadTrails?: boolean;
  readonly showChainLines?: boolean;
  readonly showNodeMarkers?: boolean;
  readonly showBodyRig?: boolean;
  readonly showLabels?: boolean;
}

function styleForRig(
  rigId: RigId,
  index: number,
  rigStyles?: Partial<Record<RigId, RigRenderStyle>>
): RigRenderStyle {
  return rigStyles?.[rigId] ?? DEFAULT_RIG_STYLES[index % DEFAULT_RIG_STYLES.length];
}

function bodyArmStyle(
  bodyOverlay: BodyOverlayFrame,
  side: ArmSide,
  styles: Map<RigId, RigRenderStyle>
): string {
  const rigId = side === "left" ? bodyOverlay.rigIds.left : bodyOverlay.rigIds.right;

  return styles.get(rigId)?.lineColor ?? (side === "left" ? "#5eead4" : "#fbbf24");
}

function bodyHandStyle(
  bodyOverlay: BodyOverlayFrame,
  side: ArmSide,
  styles: Map<RigId, RigRenderStyle>
): string {
  const rigId = side === "left" ? bodyOverlay.rigIds.left : bodyOverlay.rigIds.right;

  return styles.get(rigId)?.handColor ?? (side === "left" ? "#2dd4bf" : "#f59e0b");
}

function renderBodyOverlay(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  bodyOverlay: BodyOverlayFrame,
  geometry: RenderFrameGeometry,
  styles: Map<RigId, RigRenderStyle>
) {
  const pose = bodyOverlay.pose;
  const body = pose.projectedBody;
  const toCanvas = (point: Vec2) => worldToCanvas(layout, point);
  const limbStroke = "rgba(226, 232, 240, 0.5)";
  const secondaryStroke = "rgba(148, 163, 184, 0.42)";
  const nodeFill = "rgba(15, 23, 42, 0.62)";

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  drawLine(
    ctx,
    toCanvas(body.headCenter),
    toCanvas(body.neck),
    secondaryStroke,
    geometry.bodySecondaryLineWidth
  );
  drawLine(
    ctx,
    toCanvas(pose.shoulders.leftShoulder),
    toCanvas(pose.shoulders.rightShoulder),
    limbStroke,
    geometry.bodyLineWidth
  );
  drawLine(ctx, toCanvas(body.neck), toCanvas(body.pelvis), limbStroke, geometry.bodyLineWidth);
  drawLine(
    ctx,
    toCanvas(body.hipLeft),
    toCanvas(body.hipRight),
    secondaryStroke,
    geometry.bodyLineWidth
  );
  drawPolyline(
    ctx,
    [toCanvas(body.hipLeft), toCanvas(body.kneeLeft), toCanvas(body.footLeft)],
    limbStroke,
    geometry.bodyLineWidth
  );
  drawPolyline(
    ctx,
    [toCanvas(body.hipRight), toCanvas(body.kneeRight), toCanvas(body.footRight)],
    limbStroke,
    geometry.bodyLineWidth
  );

  for (const side of getBodyRigArmDrawOrder(pose)) {
    drawPolyline(
      ctx,
      getBodyRigArmPoints(pose, side).map(toCanvas),
      bodyArmStyle(bodyOverlay, side, styles),
      geometry.bodyArmLineWidth
    );
  }

  const headCenter = toCanvas(body.headCenter);
  ctx.beginPath();
  ctx.arc(headCenter.x, headCenter.y, body.headRadius * layout.pixelsPerWorldUnit, 0, Math.PI * 2);
  ctx.lineWidth = geometry.bodyHeadLineWidth;
  ctx.strokeStyle = limbStroke;
  ctx.stroke();

  for (const point of [
    body.neck,
    pose.shoulders.leftShoulder,
    pose.shoulders.rightShoulder,
    pose.leftArm.elbow,
    pose.rightArm.elbow,
    body.pelvis,
    body.hipLeft,
    body.hipRight,
    body.kneeLeft,
    body.kneeRight,
    body.footLeft,
    body.footRight
  ]) {
    drawNode(ctx, toCanvas(point), geometry.bodyJointRadius, nodeFill, "rgba(226, 232, 240, 0.5)");
  }

  drawNode(
    ctx,
    toCanvas(pose.leftArm.hand),
    geometry.handRadius,
    bodyHandStyle(bodyOverlay, "left", styles),
    "#0f172a",
    geometry.nodeStrokeWidth
  );
  drawNode(
    ctx,
    toCanvas(pose.rightArm.hand),
    geometry.handRadius,
    bodyHandStyle(bodyOverlay, "right", styles),
    "#0f172a",
    geometry.nodeStrokeWidth
  );
  ctx.restore();
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
  const showBodyRig = options.showBodyRig ?? false;

  clearFrame(ctx, layout.cssWidth, layout.cssHeight, {
    ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    ...(options.transparentBackground !== undefined
      ? { transparentBackground: options.transparentBackground }
      : {})
  });

  const rigOrder = options.rigOrder ?? Object.keys(poses).sort();
  const styles = new Map(
    rigOrder.map((rigId, index) => [rigId, styleForRig(rigId, index, options.rigStyles)])
  );

  rigOrder.forEach((rigId, index) => {
    const pose = poses[rigId];
    if (!pose) {
      return;
    }

    const style = styles.get(rigId) ?? styleForRig(rigId, index, options.rigStyles);
    const anchorWorld = getRigAnchor(layout, rigId);
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
  });

  if (showBodyRig && options.bodyOverlay) {
    renderBodyOverlay(ctx, layout, options.bodyOverlay, geometry, styles);
  }

  rigOrder.forEach((rigId, index) => {
    const pose = poses[rigId];
    if (!pose) {
      return;
    }

    const style = styles.get(rigId) ?? styleForRig(rigId, index, options.rigStyles);
    const anchorWorld = getRigAnchor(layout, rigId);
    const anchorCanvas = worldToCanvas(layout, anchorWorld);
    const handCanvas = worldToCanvas(layout, translatePoint(anchorWorld, pose.handPosition));
    const headCanvas = worldToCanvas(layout, translatePoint(anchorWorld, pose.headPosition));

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
