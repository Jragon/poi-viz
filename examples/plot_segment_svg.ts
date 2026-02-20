import { mkdir, writeFile } from "node:fs/promises";
import { toCartesianRigPose } from "../src/engine/cartesian";
import { PI } from "../src/engine/constants";
import { evalSegment } from "../src/engine/engine";
import type { Segment, Vec2 } from "../src/engine/types";
function sampleTimes(duration: number, steps: number): number[] {
  const dt = duration / steps;
  const out: number[] = [];
  for (let i = 0; i <= steps; i += 1) out.push(i * dt);
  return out;
}

function toSvgPoint(p: Vec2, width: number, height: number, scale: number): string {
  const cx = width / 2;
  const cy = height / 2;
  const x = cx + p.x * scale;
  const y = cy - p.y * scale; // invert Y for SVG
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function polyline(points: string[], stroke: string): string {
  return `<polyline points="${points.join(" ")}" fill="none" stroke="${stroke}" stroke-width="2" />`;
}

async function main() {
  const segment: Segment = {
    hand: {
      startPose: { phaseAbs: 0, radius: 1.5 },
      driver: { kind: "circle", omega: 1 }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: 3 } // simple inspin-like absolute phase demo
    }
  };
  const duration = 2 * PI;
  const steps = 400;
  const times = sampleTimes(duration, steps);
  const handPts: string[] = [];
  const headPts: string[] = [];
  for (const t of times) {
    const rel = evalSegment(segment, t);
    const cart = toCartesianRigPose(rel);
    handPts.push(toSvgPoint(cart.handPosition, 800, 800, 120));
    headPts.push(toSvgPoint(cart.headPosition, 800, 800, 120));
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect x="0" y="0" width="800" height="800" fill="#0f1115" />
  <line x1="0" y1="400" x2="800" y2="400" stroke="#2a2f3a" stroke-width="1" />
  <line x1="400" y1="0" x2="400" y2="800" stroke="#2a2f3a" stroke-width="1" />
  ${polyline(handPts, "#6ee7b7")}
  ${polyline(headPts, "#60a5fa")}
</svg>`;
  await mkdir("debug", { recursive: true });
  await writeFile("debug/segment.svg", svg, "utf8");
  console.log("Wrote debug/segment.svg");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
