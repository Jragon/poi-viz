import type { Vec2 } from "@/engine/types";

export interface RigRenderStyle {
  readonly bodyColor: string;
  readonly handColor: string;
  readonly headColor: string;
  readonly lineColor: string;
  readonly labelColor: string;
  readonly trailColor: string;
}

export const DEFAULT_RIG_STYLES: readonly RigRenderStyle[] = [
  {
    bodyColor: "#cbd5e1",
    handColor: "#34d399",
    headColor: "#60a5fa",
    lineColor: "#94a3b8",
    labelColor: "#e2e8f0",
    trailColor: "rgba(96, 165, 250, 0.28)"
  },
  {
    bodyColor: "#fde68a",
    handColor: "#f472b6",
    headColor: "#f87171",
    lineColor: "#fca5a5",
    labelColor: "#fef3c7",
    trailColor: "rgba(248, 113, 113, 0.28)"
  }
];

export function clearFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = backgroundColor;
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
