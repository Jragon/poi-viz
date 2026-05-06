import { toCartesianMultiRigPose, toCartesianRigPose } from "@/engine/cartesian";
import { prepareMultiRigSequence, samplePreparedMultiRigSequence } from "@/engine/multirig";
import { evalPreparedSequenceAt } from "@/engine/sequence";
import { mkdir, writeFile } from "node:fs/promises";
import { PI } from "../src/engine/constants";
import type { MultiRigSequence, RigId, Segment, TimeUnit, Vec2 } from "../src/engine/types";

const WIDTH = 800;
const HEIGHT = 800;
const SCALE = 120; // world units -> px

const RIG_STYLES = [
  {
    hand: "#34d399",
    head: "#60a5fa",
    boundary: "#f59e0b",
    start: "#e5e7eb"
  },
  {
    hand: "#f472b6",
    head: "#f87171",
    boundary: "#fbbf24",
    start: "#fde68a"
  },
  {
    hand: "#a78bfa",
    head: "#22d3ee",
    boundary: "#fb7185",
    start: "#f8fafc"
  }
] as const;

type RigStyle = (typeof RIG_STYLES)[number];

type RigPaths = {
  handPath: Vec2[];
  headPath: Vec2[];
};

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

function circle(point: Vec2, color: string, radius: number): string {
  return `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${radius}" fill="${color}" />`;
}

function styleForRig(index: number): RigStyle {
  return RIG_STYLES[index % RIG_STYLES.length];
}

function makeSegment(durationUnits: number, handOmega: number, headOmega: number): Segment {
  return {
    durationUnits,
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
  const sequence: MultiRigSequence = {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [makeSegment(2 * PI, 1, 1), makeSegment(2 * PI, 1, -2)]
        }
      },
      {
        rigId: "right",
        sequence: {
          segments: [makeSegment(2 * PI, 1, 1), makeSegment(4 * PI, 1, 2)]
        }
      }
    ]
  };

  const preparedSequenceResult = prepareMultiRigSequence(sequence);
  if (!preparedSequenceResult.ok) {
    throw new Error(`Invalid sequence: ${JSON.stringify(preparedSequenceResult.errors)}`);
  }

  const prepared = preparedSequenceResult.prepared;
  const times = sampleTimesExclusive(prepared.maxSequenceDuration, 1000);
  const rigPaths: Record<RigId, RigPaths> = Object.fromEntries(
    prepared.rigs.map((rig) => [
      rig.rigId,
      {
        handPath: [],
        headPath: []
      }
    ])
  );

  const samples = samplePreparedMultiRigSequence(prepared, times);
  for (const [index, res] of samples.entries()) {
    if (!res.ok) {
      const t = times[index];
      throw new Error(`Sequence evaluation failed at t=${t.toFixed(6)} (${res.reason})`);
    }

    const cartesianByRig = toCartesianMultiRigPose(
      Object.fromEntries(Object.entries(res.poses).map(([rigId, value]) => [rigId, value.pose]))
    );

    for (const rig of prepared.rigs) {
      const cart = cartesianByRig[rig.rigId];
      const paths = rigPaths[rig.rigId];

      paths.handPath.push(worldToSvg(cart.handPosition));
      paths.headPath.push(worldToSvg(cart.headPosition));
    }
  }

  const boundaryMarkers: string[] = [];
  for (const [rigIndex, rig] of prepared.rigs.entries()) {
    const style = styleForRig(rigIndex);

    for (let i = 1; i < rig.prepared.segments.length; i += 1) {
      const boundaryTime = rig.prepared.segments[i].startUnit;
      const res = evalPreparedSequenceAt(rig.prepared, boundaryTime);
      if (!res.ok) {
        throw new Error(
          `Boundary evaluation failed at t=${boundaryTime.toFixed(6)} (${res.reason})`
        );
      }

      const cart = toCartesianRigPose(res.pose);
      const hand = worldToSvg(cart.handPosition);
      const head = worldToSvg(cart.headPosition);
      boundaryMarkers.push(
        `<circle cx="${hand.x.toFixed(2)}" cy="${hand.y.toFixed(2)}" r="5" fill="none" stroke="${style.boundary}" stroke-width="2" />`
      );
      boundaryMarkers.push(
        `<circle cx="${head.x.toFixed(2)}" cy="${head.y.toFixed(2)}" r="5" fill="none" stroke="${style.boundary}" stroke-width="2" />`
      );
    }
  }

  const rigPolylines = prepared.rigs
    .map((rig, rigIndex) => {
      const style = styleForRig(rigIndex);
      const paths = rigPaths[rig.rigId];

      return [
        polyline(paths.handPath, style.hand, 2),
        polyline(paths.headPath, style.head, 2)
      ].join("\n  ");
    })
    .join("\n  ");

  const startMarkers = prepared.rigs
    .map((rig, rigIndex) => {
      const style = styleForRig(rigIndex);
      const paths = rigPaths[rig.rigId];
      return [
        circle(paths.handPath[0], style.start, 4),
        circle(paths.headPath[0], style.start, 4)
      ].join("\n  ");
    })
    .join("\n  ");

  const legend = prepared.rigs
    .map((rig, rigIndex) => {
      const style = styleForRig(rigIndex);
      const y = 84 + rigIndex * 24;
      return [
        `<circle cx="28" cy="${y}" r="5" fill="${style.hand}" />`,
        `<text x="40" y="${y + 4}" fill="#d1d5db" font-family="monospace" font-size="13">${rig.rigId} hand</text>`,
        `<circle cx="140" cy="${y}" r="5" fill="${style.head}" />`,
        `<text x="152" y="${y + 4}" fill="#d1d5db" font-family="monospace" font-size="13">${rig.rigId} head</text>`
      ].join("\n  ");
    })
    .join("\n  ");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#0f1115" />
  <line x1="0" y1="${HEIGHT / 2}" x2="${WIDTH}" y2="${HEIGHT / 2}" stroke="#2a2f3a" />
  <line x1="${WIDTH / 2}" y1="0" x2="${WIDTH / 2}" y2="${HEIGHT}" stroke="#2a2f3a" />
  <text x="24" y="28" fill="#d1d5db" font-family="monospace" font-size="16">Multi-rig sequence: left loops over 2 segments, right loops over 2 segments with a longer total duration</text>
  <text x="24" y="52" fill="#9ca3af" font-family="monospace" font-size="13">Boundary markers show each rig's segment transitions. The outer transport window is maxSequenceDuration.</text>
  ${legend}
  ${rigPolylines}
  ${boundaryMarkers.join("\n  ")}
  ${startMarkers}
</svg>`;

  await mkdir("debug", { recursive: true });
  const outputPath = "debug/multirig-sequence.svg";
  await writeFile(outputPath, svg, "utf8");
  console.log(
    `Wrote ${outputPath} (${times.length} samples, maxSequenceDuration=${prepared.maxSequenceDuration.toFixed(4)})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
