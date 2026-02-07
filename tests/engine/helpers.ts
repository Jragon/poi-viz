import { expect } from "vitest";

export const MATH_TOLERANCE = 1e-6;
export const FIXTURE_TOLERANCE = 1e-4;

const ZERO = 0;
const ONE = 1;
const TWO = ONE + ONE;
const THREE = TWO + ONE;
const HALF = ONE / TWO;
const QUARTER = HALF / TWO;
const EIGHTH = QUARTER / TWO;
const THREE_QUARTERS = HALF + QUARTER;

export const DEFAULT_SAMPLE_BEATS = [ZERO, EIGHTH, QUARTER, HALF, ONE, TWO, THREE + THREE_QUARTERS] as const;

export function expectWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number,
  label: string
): void {
  const delta = Math.abs(actual - expected);
  expect(delta, `${label}: |${actual} - ${expected}| = ${delta}`).toBeLessThanOrEqual(tolerance);
}

