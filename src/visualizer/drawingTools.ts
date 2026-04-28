import type { Vec2 } from "@/engine/types";

export interface RigRenderStyle {
  readonly handColor: string;
  readonly headColor: string;
  readonly lineColor: string;
  readonly labelColor: string;
  readonly handTrailColor: string;
  readonly headTrailColor: string;
}

export interface ClearFrameOptions {
  readonly backgroundColor?: string;
  readonly transparentBackground?: boolean;
}

export const DEFAULT_RIG_STYLES: readonly RigRenderStyle[] = [
  {
    handColor: "#34d399",
    headColor: "#60a5fa",
    lineColor: "#94a3b8",
    labelColor: "#e2e8f0",
    handTrailColor: "rgba(52, 211, 153, 0.28)",
    headTrailColor: "rgba(96, 165, 250, 0.28)"
  },
  {
    handColor: "#f472b6",
    headColor: "#f87171",
    lineColor: "#fca5a5",
    labelColor: "#fef3c7",
    handTrailColor: "rgba(244, 114, 182, 0.28)",
    headTrailColor: "rgba(248, 113, 113, 0.28)"
  }
];

export const WEBCAM_RIG_STYLES: readonly RigRenderStyle[] = [
  {
    handColor: "#22c55e",
    headColor: "#2563eb",
    lineColor: "#166534",
    labelColor: "#f8fafc",
    handTrailColor: "rgba(22, 101, 52, 0.82)",
    headTrailColor: "rgba(37, 99, 235, 0.82)"
  },
  {
    handColor: "#db2777",
    headColor: "#dc2626",
    lineColor: "#9f1239",
    labelColor: "#fff7ed",
    handTrailColor: "rgba(159, 18, 57, 0.82)",
    headTrailColor: "rgba(185, 28, 28, 0.82)"
  }
];

export function clearFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ClearFrameOptions = {}
) {
  ctx.clearRect(0, 0, width, height);

  if (options.transparentBackground) {
    return;
  }

  ctx.fillStyle = options.backgroundColor ?? "#020617";
  ctx.fillRect(0, 0, width, height);
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  start: Vec2,
  end: Vec2,
  color: string,
  width: number
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  fillColor: string,
  strokeColor?: string,
  strokeWidth = 1
) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  color: string,
  width: number
) {
  if (points.length < 2) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }

  ctx.stroke();
}

export function drawFadingPolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  color: string,
  width: number,
  minOpacity = 0.2
) {
  if (points.length < 2) {
    return;
  }

  const segmentCount = points.length - 1;
  const floorOpacity = Math.min(Math.max(minOpacity, 0), 1);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const progress = index / segmentCount;
    ctx.globalAlpha = floorOpacity + (1 - floorOpacity) * progress;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  position: Vec2,
  color: string,
  font = "12px ui-monospace, SFMono-Regular, monospace"
) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, position.x, position.y);
}
