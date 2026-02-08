import type { TrailPoint, Vector2 } from "@/engine/types";
import { createPatternTransform, worldToCanvas } from "@/render/math";
import { getPatternRenderPalette, type PatternRenderPalette } from "@/render/theme";
import type { PatternRenderInput, TrailSeries } from "@/render/types";
import type { Theme } from "@/state/theme";
import type { HandId, HandsState } from "@/types/state";

const TETHER_LINE_WIDTH = 2;
const HAND_DOT_RADIUS = 4;
const HEAD_DOT_RADIUS = 8;
const GRID_LINE_WIDTH = 1;
const GRID_RING_COUNT = 6;
const WORLD_PADDING_FACTOR = 1.15;
const TRAIL_MIN_ALPHA = 0.12;
const TRAIL_MAX_ALPHA = 0.85;

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, palette: PatternRenderPalette): void {
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
}

export function getWorldRadius(hands: HandsState): number {
  const leftReach = hands.L.armRadius + hands.L.poiRadius;
  const rightReach = hands.R.armRadius + hands.R.poiRadius;
  return Math.max(leftReach, rightReach);
}

export function createPolarRingRadii(worldRadius: number, ringCount = GRID_RING_COUNT): number[] {
  if (ringCount <= 0) {
    return [];
  }
  const ringStep = worldRadius / ringCount;
  return Array.from({ length: ringCount }, (_, index) => ringStep * (index + 1));
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  worldRadius: number,
  palette: PatternRenderPalette
): ReturnType<typeof createPatternTransform> {
  const transform = createPatternTransform(width, height, worldRadius, WORLD_PADDING_FACTOR);
  const ringRadii = createPolarRingRadii(worldRadius);

  ctx.save();
  ctx.lineWidth = GRID_LINE_WIDTH;
  ctx.strokeStyle = palette.grid;

  for (const ringRadius of ringRadii) {
    ctx.beginPath();
    ctx.arc(transform.centerX, transform.centerY, ringRadius * transform.scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.axis;
  ctx.beginPath();
  ctx.moveTo(0, transform.centerY);
  ctx.lineTo(width, transform.centerY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(transform.centerX, 0);
  ctx.lineTo(transform.centerX, height);
  ctx.stroke();
  ctx.restore();

  return transform;
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  transform: ReturnType<typeof createPatternTransform>,
  points: TrailPoint[],
  color: string
): void {
  if (points.length < 2) {
    return;
  }

  const oldestIndex = 0;
  const newestIndex = points.length - 1;

  for (let index = oldestIndex + 1; index <= newestIndex; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) {
      continue;
    }

    const previousCanvas = worldToCanvas(previous.point, transform);
    const currentCanvas = worldToCanvas(current.point, transform);
    const ageRatio = index / newestIndex;
    const alpha = TRAIL_MIN_ALPHA + (TRAIL_MAX_ALPHA - TRAIL_MIN_ALPHA) * ageRatio;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(previousCanvas.x, previousCanvas.y);
    ctx.lineTo(currentCanvas.x, currentCanvas.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTrails(
  ctx: CanvasRenderingContext2D,
  transform: ReturnType<typeof createPatternTransform>,
  trails: TrailSeries,
  palette: PatternRenderPalette
): void {
  drawTrail(ctx, transform, trails.L, palette.left);
  drawTrail(ctx, transform, trails.R, palette.right);
}

function drawTether(
  ctx: CanvasRenderingContext2D,
  transform: ReturnType<typeof createPatternTransform>,
  hand: Vector2,
  head: Vector2,
  color: string
): void {
  const handCanvas = worldToCanvas(hand, transform);
  const headCanvas = worldToCanvas(head, transform);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = TETHER_LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(handCanvas.x, handCanvas.y);
  ctx.lineTo(headCanvas.x, headCanvas.y);
  ctx.stroke();
  ctx.restore();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  transform: ReturnType<typeof createPatternTransform>,
  point: Vector2,
  radius: number,
  color: string
): void {
  const canvasPoint = worldToCanvas(point, transform);

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(canvasPoint.x, canvasPoint.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHandPoi(
  ctx: CanvasRenderingContext2D,
  transform: ReturnType<typeof createPatternTransform>,
  input: PatternRenderInput,
  handId: HandId,
  color: string
): void {
  drawTether(ctx, transform, input.positions[handId].hand, input.positions[handId].head, color);
  drawDot(ctx, transform, input.positions[handId].hand, HAND_DOT_RADIUS, color);
  drawDot(ctx, transform, input.positions[handId].head, HEAD_DOT_RADIUS, color);
}

export function renderPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: PatternRenderInput,
  theme: Theme = "dark"
): void {
  const palette = getPatternRenderPalette(theme);
  drawBackground(ctx, width, height, palette);

  const worldRadius = getWorldRadius(input.hands);
  const transform = drawGrid(ctx, width, height, worldRadius, palette);

  if (input.showTrails) {
    drawTrails(ctx, transform, input.trails, palette);
  }

  drawHandPoi(ctx, transform, input, "L", palette.left);
  drawHandPoi(ctx, transform, input, "R", palette.right);
}
