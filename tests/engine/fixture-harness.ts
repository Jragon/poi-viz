import type { FixtureSample } from "@/engine/fixtures";
import type { HandId } from "@/types/state";
import { FIXTURE_TOLERANCE } from "./helpers";

export type FixtureAxis = keyof FixtureSample["L"] | "tBeats";

export interface FixtureMismatch {
  sampleIndex: number;
  tBeats: number;
  handId: HandId | "GLOBAL";
  axis: FixtureAxis;
  expected: number;
  actual: number;
  delta: number;
}

const HAND_IDS: HandId[] = ["L", "R"];
const AXES: FixtureAxis[] = ["x", "y"];

export function compareFixtureSamples(
  expectedSamples: FixtureSample[],
  actualSamples: FixtureSample[],
  tolerance = FIXTURE_TOLERANCE
): FixtureMismatch[] {
  if (expectedSamples.length !== actualSamples.length) {
    throw new Error(`fixture sample length mismatch: expected ${expectedSamples.length}, actual ${actualSamples.length}`);
  }

  const mismatches: FixtureMismatch[] = [];

  for (let sampleIndex = 0; sampleIndex < expectedSamples.length; sampleIndex += 1) {
    const expectedSample = expectedSamples[sampleIndex];
    const actualSample = actualSamples[sampleIndex];

    if (!expectedSample || !actualSample) {
      continue;
    }

    const beatDelta = Math.abs(expectedSample.tBeats - actualSample.tBeats);
    if (beatDelta > tolerance) {
      mismatches.push({
        sampleIndex,
        tBeats: expectedSample.tBeats,
        handId: "GLOBAL",
        axis: "tBeats",
        expected: expectedSample.tBeats,
        actual: actualSample.tBeats,
        delta: beatDelta
      });
      continue;
    }

    for (const handId of HAND_IDS) {
      for (const axis of AXES) {
        const expected = expectedSample[handId][axis];
        const actual = actualSample[handId][axis];
        const delta = Math.abs(expected - actual);

        if (delta > tolerance) {
          mismatches.push({
            sampleIndex,
            tBeats: expectedSample.tBeats,
            handId,
            axis,
            expected,
            actual,
            delta
          });
        }
      }
    }
  }

  return mismatches;
}
