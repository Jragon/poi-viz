import type { LoopSample } from "@/engine/types";
import { beatToCanvasX, clamp } from "@/render/math";
import { getWaveRenderPalette } from "@/render/theme";
import type { OscillatorLaneDefinition, WaveLane, WavePoint, WaveRenderInput, WaveTrace } from "@/render/types";
import type { Theme } from "@/state/theme";

const FONT = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
const LANE_VERTICAL_PADDING = 0.2;
const MIN_HORIZONTAL_GRID_DIVISIONS = 4;
const BEATS_PER_GRID_DIVISION = 0.5;

const MARGIN_TOP = 20;
const MARGIN_RIGHT = 16;
const MARGIN_BOTTOM = 24;
const MARGIN_LEFT = 74;

const OSCILLATOR_LANES: OscillatorLaneDefinition[] = [
  {
    id: "arm-l",
    label: "arm L",
    getAngle: (sample) => sample.angles.L.arm
  },
  {
    id: "rel-l",
    label: "rel L",
    getAngle: (sample) => sample.angles.L.rel
  },
  {
    id: "arm-r",
    label: "arm R",
    getAngle: (sample) => sample.angles.R.arm
  },
  {
    id: "rel-r",
    label: "rel R",
    getAngle: (sample) => sample.angles.R.rel
  }
];

function createTracePoints(samples: LoopSample[], getValue: (sample: LoopSample) => number): WavePoint[] {
  return samples.map((sample) => ({
    tBeats: sample.tBeats,
    value: getValue(sample)
  }));
}

function createTrace(id: string, label: string, color: string, points: WavePoint[]): WaveTrace {
  return {
    id,
    label,
    color,
    points
  };
}

export function createWaveLanesFromSamples(samples: LoopSample[], theme: Theme = "dark"): WaveLane[] {
  const palette = getWaveRenderPalette(theme);

  return OSCILLATOR_LANES.map((laneDefinition) => {
    const sinTracePoints = createTracePoints(samples, (sample) => Math.sin(laneDefinition.getAngle(sample)));
    const cosTracePoints = createTracePoints(samples, (sample) => Math.cos(laneDefinition.getAngle(sample)));

    return {
      id: laneDefinition.id,
      label: laneDefinition.label,
      sin: createTrace(`${laneDefinition.id}-sin`, `${laneDefinition.label} sin`, palette.sin, sinTracePoints),
      cos: createTrace(`${laneDefinition.id}-cos`, `${laneDefinition.label} cos`, palette.cos, cosTracePoints)
    };
  });
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme): void {
  const palette = getWaveRenderPalette(theme);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  loopBeats: number,
  theme: Theme
): void {
  const estimatedDivisions = Math.ceil(loopBeats / BEATS_PER_GRID_DIVISION);
  const horizontalDivisions = Math.max(MIN_HORIZONTAL_GRID_DIVISIONS, estimatedDivisions);
  const divisionWidth = width / horizontalDivisions;
  const palette = getWaveRenderPalette(theme);

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;

  for (let divisionIndex = 0; divisionIndex <= horizontalDivisions; divisionIndex += 1) {
    const x = left + divisionWidth * divisionIndex;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, left: number, laneCenterY: number, label: string, theme: Theme): void {
  const palette = getWaveRenderPalette(theme);
  ctx.save();
  ctx.fillStyle = palette.label;
  ctx.font = FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, left, laneCenterY);
  ctx.restore();
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  points: WavePoint[],
  loopBeats: number,
  left: number,
  width: number,
  centerY: number,
  amplitude: number,
  color: string
): void {
  if (points.length === 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();

  const first = points[0];
  if (!first) {
    ctx.restore();
    return;
  }

  const firstX = beatToCanvasX(first.tBeats, loopBeats, left, width);
  const firstY = centerY - clamp(first.value, -1, 1) * amplitude;
  ctx.moveTo(firstX, firstY);

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (!point) {
      continue;
    }
    const x = beatToCanvasX(point.tBeats, loopBeats, left, width);
    const y = centerY - clamp(point.value, -1, 1) * amplitude;
    ctx.lineTo(x, y);
  }

  ctx.stroke();
  ctx.restore();
}

export function renderWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: WaveRenderInput,
  theme: Theme = "dark"
): void {
  const palette = getWaveRenderPalette(theme);
  drawBackground(ctx, width, height, theme);

  const plotLeft = MARGIN_LEFT;
  const plotTop = MARGIN_TOP;
  const plotWidth = Math.max(width - MARGIN_LEFT - MARGIN_RIGHT, 1);
  const plotHeight = Math.max(height - MARGIN_TOP - MARGIN_BOTTOM, 1);

  drawGrid(ctx, plotLeft, plotTop, plotWidth, plotHeight, input.loopBeats, theme);

  const laneCount = Math.max(input.lanes.length, 1);
  const laneHeight = plotHeight / laneCount;
  const laneAmplitude = laneHeight * (0.5 - LANE_VERTICAL_PADDING);

  for (let laneIndex = 0; laneIndex < input.lanes.length; laneIndex += 1) {
    const lane = input.lanes[laneIndex];
    if (!lane) {
      continue;
    }
    const laneTop = plotTop + laneHeight * laneIndex;
    const laneCenterY = laneTop + laneHeight * 0.5;

    ctx.save();
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, laneCenterY);
    ctx.lineTo(plotLeft + plotWidth, laneCenterY);
    ctx.stroke();
    ctx.restore();

    drawLabels(ctx, 8, laneCenterY, lane.label, theme);
    drawTrace(ctx, lane.sin.points, input.loopBeats, plotLeft, plotWidth, laneCenterY, laneAmplitude, lane.sin.color);
    drawTrace(ctx, lane.cos.points, input.loopBeats, plotLeft, plotWidth, laneCenterY, laneAmplitude, lane.cos.color);
  }

  const cursorX = beatToCanvasX(input.tBeats, input.loopBeats, plotLeft, plotWidth);
  ctx.save();
  ctx.strokeStyle = palette.cursor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cursorX, plotTop);
  ctx.lineTo(cursorX, plotTop + plotHeight);
  ctx.stroke();
  ctx.restore();
}
