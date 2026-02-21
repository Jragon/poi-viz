import { mkdir, writeFile } from "node:fs/promises";
import { toCartesianRigPose } from "../src/engine/cartesian";
import { PI } from "../src/engine/constants";
import { evalSegment } from "../src/engine/engine";
import type { Segment, TimeUnit, Vec2 } from "../src/engine/types";
const WIDTH = 800;
const HEIGHT = 800;
const SCALE = 120; // world units -> px
function sampleTimes(duration: TimeUnit, steps: number): TimeUnit[] {
  const dt = duration / steps;
  const out: TimeUnit[] = [];
  for (let i = 0; i <= steps; i += 1) out.push(i * dt);
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
async function main() {
  const segment: Segment = {
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: 1 }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: 2 } // simple inspin-like absolute test
    }
  };
  const duration = 2 * PI;
  const steps = 500;
  const times = sampleTimes(duration, steps);
  const handPath: Vec2[] = [];
  const headPath: Vec2[] = [];
  for (const t of times) {
    const rel = evalSegment(segment, t);
    const cart = toCartesianRigPose(rel);
    handPath.push(worldToSvg(cart.handPosition));
    headPath.push(worldToSvg(cart.headPosition));
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#0f1115" />
  <line x1="0" y1="${HEIGHT / 2}" x2="${WIDTH}" y2="${HEIGHT / 2}" stroke="#2a2f3a" />
  <line x1="${WIDTH / 2}" y1="0" x2="${WIDTH / 2}" y2="${HEIGHT}" stroke="#2a2f3a" />
  ${polyline(handPath, "#34d399")}
  ${polyline(headPath, "#60a5fa")}
  <circle cx="${handPath[0].x}" cy="${handPath[0].y}" r="4" fill="#34d399" />
  <circle cx="${headPath[0].x}" cy="${headPath[0].y}" r="4" fill="#60a5fa" />
</svg>`;
  await mkdir("debug", { recursive: true });
  await writeFile("debug/segment.svg", svg, "utf8");
  console.log("Wrote debug/segment.svg");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
