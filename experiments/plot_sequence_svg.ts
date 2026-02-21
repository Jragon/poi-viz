import { evalPreparedSequenceAt, prepareSequence, samplePreparedSequence } from "@/engine/sequence";
import { mkdir, writeFile } from "node:fs/promises";
import { toCartesianRigPose } from "../src/engine/cartesian";
import { PI } from "../src/engine/constants";
import type { Segment, SequenceSpec, TimeUnit, Vec2 } from "../src/engine/types";

const WIDTH = 800;
const HEIGHT = 800;
const SCALE = 120; // world units -> px

function sampleTimesExclusive(duration: TimeUnit, steps: number): TimeUnit[] {
  const dt = duration / steps;
  const out: TimeUnit[] = [];
  for (let i = 0; i < steps; i += 1) out.push(i * dt);
  return out;
}

function worldToSvg(p: Vec2): Vec2 {
  return {
    x: WIDTH / 2 + p.x * SCALE,
    y: HEIGHT / 2 - p.y * SCALE // invert y for svg
  };
}

function toPolylinePoints(points: Vec2[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function polyline(points: Vec2[], color: string, width = 2): string {
  return `<polyline points="${toPolylinePoints(points)}" fill="none" stroke="${color}" stroke-width="${width}" />`;
}

function makeSegment(handOmega: number, headOmega: number): Segment {
  return {
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

async function main() {
  const sequence: SequenceSpec = {
    segments: [
      { segment: makeSegment(1, 1), durationUnits: 2 * PI },
      { segment: makeSegment(1, 2), durationUnits: 2 * PI },
      { segment: makeSegment(1, -2), durationUnits: 2 * PI }
    ]
  };

  const preparedSequenceResult = prepareSequence(sequence);
  if (!preparedSequenceResult.ok) {
    throw new Error(`Invalid sequence: ${JSON.stringify(preparedSequenceResult.errors)}`);
  }

  const prepared = preparedSequenceResult.prepared;
  const times = sampleTimesExclusive(prepared.totalDuration, 1000);
  const handPath: Vec2[] = [];
  const headPath: Vec2[] = [];

  const samples = samplePreparedSequence(prepared, times);
  for (const [index, res] of samples.entries()) {
    if (!res.ok) {
      const t = times[index];
      throw new Error(`Sequence evaluation failed at t=${t.toFixed(6)} (${res.reason})`);
    }

    const cart = toCartesianRigPose(res.pose);

    handPath.push(worldToSvg(cart.handPosition));
    headPath.push(worldToSvg(cart.headPosition));
  }

  const boundaryMarkers: string[] = [];
  for (let i = 1; i < prepared.placements.length; i += 1) {
    const boundaryTime = prepared.placements[i].startUnit;
    const res = evalPreparedSequenceAt(prepared, boundaryTime);
    if (!res.ok) {
      throw new Error(`Boundary evaluation failed at t=${boundaryTime.toFixed(6)} (${res.reason})`);
    }
    const cart = toCartesianRigPose(res.pose);
    const hand = worldToSvg(cart.handPosition);
    const head = worldToSvg(cart.headPosition);
    boundaryMarkers.push(
      `<circle cx="${hand.x.toFixed(2)}" cy="${hand.y.toFixed(2)}" r="5" fill="none" stroke="#f59e0b" stroke-width="2" />`
    );
    boundaryMarkers.push(
      `<circle cx="${head.x.toFixed(2)}" cy="${head.y.toFixed(2)}" r="5" fill="none" stroke="#f59e0b" stroke-width="2" />`
    );
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#0f1115" />
  <line x1="0" y1="${HEIGHT / 2}" x2="${WIDTH}" y2="${HEIGHT / 2}" stroke="#2a2f3a" />
  <line x1="${WIDTH / 2}" y1="0" x2="${WIDTH / 2}" y2="${HEIGHT}" stroke="#2a2f3a" />
  <text x="24" y="28" fill="#d1d5db" font-family="monospace" font-size="16">Sequence: extension (1,1) -> inspin (1,2) -> antispin (1,-2)</text>
  <text x="24" y="52" fill="#9ca3af" font-family="monospace" font-size="13">Boundary markers: orange circles</text>
  ${polyline(handPath, "#34d399")}
  ${polyline(headPath, "#60a5fa")}
  ${boundaryMarkers.join("\n  ")}
  <circle cx="${handPath[0].x}" cy="${handPath[0].y}" r="4" fill="#34d399" />
  <circle cx="${headPath[0].x}" cy="${headPath[0].y}" r="4" fill="#60a5fa" />
</svg>`;

  await mkdir("debug", { recursive: true });
  const outputPath = "debug/sequence.svg";
  await writeFile(outputPath, svg, "utf8");
  console.log(
    `Wrote ${outputPath} (${times.length} samples, duration=${prepared.totalDuration.toFixed(4)})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
