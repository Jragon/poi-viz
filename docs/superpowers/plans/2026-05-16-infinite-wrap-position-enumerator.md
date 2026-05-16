# Infinite Wrap Position Enumerator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new lab page that generates two-hand, split-time-opposite, wraps-only body-tracing sequences from an infinite position-visit enumerator, then previews the generated beat graph and visualizer.

**Architecture:** Add a pure generator module that emits deterministic `PoiBeatGraph` data from a seed, target position-visit count, and BTB probability. The page stays thin: it owns controls, calls the generator on button click, compiles the graph through the existing beat-graph compiler, and renders the existing `PoiBeatGraph` and `PoiCanvasViewport` components.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, existing `mel-body-tracing` beat graph/compiler/visualizer modules.

---

## File Structure

- Create `src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts`
  - Owns seeded randomness, per-hand position traversal, normal/BTB visit templates, sync-block generation, and `PoiBeatGraph` assembly.
  - Exports a small public API: generator options, result type, `generateWrapPositionGraph`, and row-template helpers used by tests.
- Create `test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts`
  - Covers deterministic output, normal visits, BTB template shape, BTB-only-from-native rule, row-count synchronization, and compile compatibility.
- Create `src/lab/experiments/mel-body-tracing/pages/InfiniteWrapExplorerPage.vue`
  - Lab page with controls for target position visits, seed, BTB chance, generate button, summary, beat graph, and visualizer.
  - Reuses existing display/transport setup from `BodyTracingExplorerPage.vue`.
- Modify `src/router.ts`
  - Adds route `/lab/infinite-wraps` for the new page.
- Modify `src/lab/experiments/mel-body-tracing/pages/BodyTracingExplorerPage.vue`
  - Adds a small `RouterLink` to the new lab page so the experiment is discoverable from the existing Mel explorer.

---

### Task 1: Generator Types, Seeded Random, and Visit Templates

**Files:**
- Create: `src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts`
- Test: `test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts`

- [ ] **Step 1: Write failing tests for deterministic random and visit templates**

Add `test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts`:

```ts
import {
  DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
  buildBtbVisitRows,
  buildNormalVisitRows,
  createSeededRandom,
  generateWrapPositionGraph
} from "@/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator";
import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { isValidWrapPair } from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import { describe, expect, it } from "vitest";

describe("wrapPositionEnumerator visit templates", () => {
  it("creates repeatable pseudo-random values from the same seed", () => {
    const a = createSeededRandom(1234);
    const b = createSeededRandom(1234);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("builds a normal front visit as position, position, center", () => {
    expect(buildNormalVisitRows("low-native", "right", 0)).toEqual([
      { step: 0, laneId: "right-low", planeSide: "b" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "center", planeSide: "a" }
    ]);
  });

  it("builds the low-native BTB visit with a front-compatible center exit", () => {
    expect(buildBtbVisitRows("low-native", "right", 0)).toEqual([
      { step: 0, laneId: "right-low", planeSide: "b" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "right-low", planeSide: "a" },
      { step: 3, laneId: "right-low", planeSide: "a" },
      { step: 4, laneId: "center", planeSide: "b" },
      { step: 5, laneId: "left-low", planeSide: "a" },
      { step: 6, laneId: "left-low", planeSide: "a" },
      { step: 7, laneId: "center", planeSide: "b" },
      { step: 8, laneId: "right-low", planeSide: "a" },
      { step: 9, laneId: "right-low", planeSide: "a" },
      { step: 10, laneId: "right-low", planeSide: "b" },
      { step: 11, laneId: "right-low", planeSide: "b" },
      { step: 12, laneId: "center", planeSide: "a" }
    ]);
  });

  it("builds the high-native BTB visit by staying at the same height", () => {
    expect(buildBtbVisitRows("high-native", "left", 3)).toEqual([
      { step: 3, laneId: "left-high", planeSide: "b" },
      { step: 4, laneId: "left-high", planeSide: "b" },
      { step: 5, laneId: "left-high", planeSide: "a" },
      { step: 6, laneId: "left-high", planeSide: "a" },
      { step: 7, laneId: "center", planeSide: "b" },
      { step: 8, laneId: "right-high", planeSide: "a" },
      { step: 9, laneId: "right-high", planeSide: "a" },
      { step: 10, laneId: "center", planeSide: "b" },
      { step: 11, laneId: "left-high", planeSide: "a" },
      { step: 12, laneId: "left-high", planeSide: "a" },
      { step: 13, laneId: "left-high", planeSide: "b" },
      { step: 14, laneId: "left-high", planeSide: "b" },
      { step: 15, laneId: "center", planeSide: "a" }
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm vitest --run test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
```

Expected: FAIL because `wrapPositionEnumerator.ts` does not exist.

- [ ] **Step 3: Implement seeded random and visit templates**

Create `src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts`:

```ts
import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatRow
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import {
  getValidPartners,
  isValidWrapPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import type { ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import { mapPositionToLane } from "@/lab/experiments/mel-body-tracing/explorers/reelRules";

export interface WrapPositionEnumeratorOptions {
  readonly targetPositionVisits: number;
  readonly seed: number;
  readonly btbChance: number;
  readonly leftStart: ReelPosition;
  readonly rightStart: ReelPosition;
}

export interface WrapPositionEnumeratorResult {
  readonly graph: PoiBeatGraph;
  readonly visitedPositions: Readonly<Record<PoiBeatHand, readonly ReelPosition[]>>;
  readonly btbVisits: Readonly<Record<PoiBeatHand, number>>;
}

export const DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS: WrapPositionEnumeratorOptions = {
  targetPositionVisits: 16,
  seed: 1,
  btbChance: 0.25,
  leftStart: "low-native",
  rightStart: "low-native"
};

const SPLIT_TIME_DIRECTIONS: Readonly<Record<PoiBeatHand, PoiBeatDirection>> = {
  left: "clockwise",
  right: "counterclockwise"
};

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function isNative(position: ReelPosition): boolean {
  return position === "low-native" || position === "high-native";
}

function matchingNonNative(position: Extract<ReelPosition, "low-native" | "high-native">): ReelPosition {
  return position === "low-native" ? "low-non-native" : "high-non-native";
}

function choose<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) {
    throw new Error("Cannot choose from an empty list");
  }

  return items[Math.min(Math.floor(random() * items.length), items.length - 1)] as T;
}

function withSteps(rows: readonly Omit<PoiBeatRow, "step">[], startStep: number): readonly PoiBeatRow[] {
  return rows.map((row, index) => ({ ...row, step: startStep + index }));
}

export function buildNormalVisitRows(
  position: ReelPosition,
  hand: PoiBeatHand,
  startStep: number
): readonly PoiBeatRow[] {
  return withSteps(
    [
      { laneId: mapPositionToLane(position, hand), planeSide: "b" },
      { laneId: mapPositionToLane(position, hand), planeSide: "b" },
      { laneId: "center", planeSide: "a" }
    ],
    startStep
  );
}

export function buildBtbVisitRows(
  position: Extract<ReelPosition, "low-native" | "high-native">,
  hand: PoiBeatHand,
  startStep: number
): readonly PoiBeatRow[] {
  const nativeLane = mapPositionToLane(position, hand);
  const nonNativeLane = mapPositionToLane(matchingNonNative(position), hand);

  return withSteps(
    [
      { laneId: nativeLane, planeSide: "b" },
      { laneId: nativeLane, planeSide: "b" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: "center", planeSide: "b" },
      { laneId: nonNativeLane, planeSide: "a" },
      { laneId: nonNativeLane, planeSide: "a" },
      { laneId: "center", planeSide: "b" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: nativeLane, planeSide: "b" },
      { laneId: nativeLane, planeSide: "b" },
      { laneId: "center", planeSide: "a" }
    ],
    startStep
  );
}
```

- [ ] **Step 4: Run tests to verify Task 1 passes**

Run:

```bash
pnpm vitest --run test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
```

Expected: PASS for the four template/random tests.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
git commit -m "feat: add wrap position visit templates"
```

---

### Task 2: Per-Hand Traversal and Synchronized Graph Generation

**Files:**
- Modify: `src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts`
- Modify: `test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts`

- [ ] **Step 1: Add failing tests for synchronized generation**

Append these tests inside `test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts`, after the first `describe` block. Do not add new import statements; Task 1 already placed the needed imports at the top of the file.

```ts
describe("generateWrapPositionGraph", () => {
  it("generates deterministic two-hand split-time-opposite graphs", () => {
    const options = {
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 8,
      seed: 77,
      btbChance: 0
    };

    const first = generateWrapPositionGraph(options);
    const second = generateWrapPositionGraph(options);

    expect(first).toEqual(second);
    expect(first.graph.tracks.map((track) => track.id)).toEqual(["left", "right"]);
    expect(first.graph.tracks.map((track) => track.poiDirection)).toEqual([
      "clockwise",
      "counterclockwise"
    ]);
    expect(first.graph.tracks[0]?.rows).toHaveLength(first.graph.cycleSteps);
    expect(first.graph.tracks[1]?.rows).toHaveLength(first.graph.cycleSteps);
    expect(first.btbVisits.left).toBe(0);
    expect(first.btbVisits.right).toBe(0);
  });

  it("uses only valid wrap partners between position changes", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 12,
      seed: 8,
      btbChance: 0
    });

    for (const hand of ["left", "right"] as const) {
      const positions = result.visitedPositions[hand];
      for (let index = 0; index < positions.length - 1; index += 1) {
        if (positions[index] === positions[index + 1]) continue;
        expect(isValidWrapPair(positions[index]!, positions[index + 1]!)).toBe(true);
      }
    }
  });

  it("keeps both tracks synchronized when one hand chooses BTB", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 6,
      seed: 2,
      btbChance: 1
    });

    const leftRows = result.graph.tracks.find((track) => track.id === "left")?.rows ?? [];
    const rightRows = result.graph.tracks.find((track) => track.id === "right")?.rows ?? [];

    expect(result.btbVisits.left + result.btbVisits.right).toBeGreaterThan(0);
    expect(leftRows).toHaveLength(result.graph.cycleSteps);
    expect(rightRows).toHaveLength(result.graph.cycleSteps);
    expect(leftRows.length).toBe(rightRows.length);
  });

  it("compiles generated graphs without diagnostics", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 10,
      seed: 12,
      btbChance: 0.35
    });

    const compiled = compilePoiBeatGraph(result.graph, DEFAULT_POI_BEAT_COMPILER_OPTIONS);

    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.sequence.rigs).toHaveLength(2);
    expect(compiled.sequence.rigs[0]?.sequence.segments).toHaveLength(result.graph.cycleSteps);
    expect(compiled.sequence.rigs[1]?.sequence.segments).toHaveLength(result.graph.cycleSteps);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm vitest --run test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
```

Expected: FAIL because `generateWrapPositionGraph` is not implemented.

- [ ] **Step 3: Implement traversal helpers and graph generation**

Append this implementation to `src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts`:

```ts
interface HandGenerationState {
  readonly hand: PoiBeatHand;
  readonly rows: PoiBeatRow[];
  readonly pendingNormalRows: PoiBeatRow[];
  readonly visitedPositions: ReelPosition[];
  currentPosition: ReelPosition;
  btbVisits: number;
}

function createHandState(hand: PoiBeatHand, startPosition: ReelPosition): HandGenerationState {
  return {
    hand,
    rows: [],
    pendingNormalRows: [],
    visitedPositions: [startPosition],
    currentPosition: startPosition,
    btbVisits: 0
  };
}

function appendRows(state: HandGenerationState, rows: readonly PoiBeatRow[]): void {
  state.rows.push(
    ...rows.map((row, index) => ({
      ...row,
      step: state.rows.length + index
    }))
  );
}

function chooseNextPosition(currentPosition: ReelPosition, random: () => number): ReelPosition {
  const partners = getValidPartners(currentPosition);
  return choose(partners, random);
}

function queueNormalVisit(state: HandGenerationState, random: () => number): void {
  state.pendingNormalRows.push(...buildNormalVisitRows(state.currentPosition, state.hand, 0));
  state.currentPosition = chooseNextPosition(state.currentPosition, random);
  state.visitedPositions.push(state.currentPosition);
}

function appendNormalRows(
  state: HandGenerationState,
  rowCount: number,
  random: () => number
): void {
  while (state.pendingNormalRows.length < rowCount) {
    queueNormalVisit(state, random);
  }

  appendRows(state, state.pendingNormalRows.splice(0, rowCount));
}

function canUseBtb(state: HandGenerationState): state is HandGenerationState & {
  currentPosition: Extract<ReelPosition, "low-native" | "high-native">;
} {
  return isNative(state.currentPosition);
}

function appendBtbVisit(state: HandGenerationState): void {
  if (!canUseBtb(state)) {
    throw new Error(`BTB visit requires native position, got ${state.currentPosition}`);
  }

  appendRows(state, buildBtbVisitRows(state.currentPosition, state.hand, 0));
  state.visitedPositions.push(state.currentPosition);
  state.btbVisits += 1;
}

function normalizeTargetPositionVisits(targetPositionVisits: number): number {
  if (!Number.isFinite(targetPositionVisits)) return 1;
  return Math.max(1, Math.floor(targetPositionVisits));
}

function shouldUseBtb(
  state: HandGenerationState,
  btbChance: number,
  random: () => number
): boolean {
  return canUseBtb(state) && random() < btbChance;
}

export function generateWrapPositionGraph(
  options: WrapPositionEnumeratorOptions = DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS
): WrapPositionEnumeratorResult {
  const targetPositionVisits = normalizeTargetPositionVisits(options.targetPositionVisits);
  const btbChance = clamp01(options.btbChance);
  const random = createSeededRandom(options.seed);
  const left = createHandState("left", options.leftStart);
  const right = createHandState("right", options.rightStart);

  while (
    left.visitedPositions.length < targetPositionVisits ||
    right.visitedPositions.length < targetPositionVisits
  ) {
    const leftCanGenerate = left.visitedPositions.length < targetPositionVisits;
    const rightCanGenerate = right.visitedPositions.length < targetPositionVisits;
    const leftBtb = leftCanGenerate && shouldUseBtb(left, btbChance, random);
    const rightBtb = rightCanGenerate && !leftBtb && shouldUseBtb(right, btbChance, random);

    if (leftBtb) {
      appendBtbVisit(left);
      appendNormalRows(right, 13, random);
    } else if (rightBtb) {
      appendBtbVisit(right);
      appendNormalRows(left, 13, random);
    } else {
      appendNormalRows(left, 3, random);
      appendNormalRows(right, 3, random);
    }
  }

  const cycleSteps = Math.max(left.rows.length, right.rows.length);

  return {
    graph: {
      cycleSteps,
      lanes: POI_BEAT_LANES,
      tracks: [
        {
          id: "left",
          hand: "left",
          poiDirection: SPLIT_TIME_DIRECTIONS.left,
          initialPhase: "up",
          rows: left.rows
        },
        {
          id: "right",
          hand: "right",
          poiDirection: SPLIT_TIME_DIRECTIONS.right,
          initialPhase: "down",
          rows: right.rows
        }
      ]
    },
    visitedPositions: {
      left: left.visitedPositions,
      right: right.visitedPositions
    },
    btbVisits: {
      left: left.btbVisits,
      right: right.btbVisits
    }
  };
}
```

- [ ] **Step 4: Add the no-three-spins regression test**

Add this helper and test inside `test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts`:

```ts
function expectNoMoreThanTwoConsecutiveSameSurfaceRows(rows: readonly { laneId: string; planeSide?: string }[]): void {
  let runKey = "";
  let runLength = 0;

  for (const row of rows) {
    const key = `${row.laneId}:${row.planeSide ?? ""}`;
    if (key === runKey) {
      runLength += 1;
    } else {
      runKey = key;
      runLength = 1;
    }

    expect(runLength).toBeLessThanOrEqual(2);
  }
}

it("never emits more than two consecutive rows on the same lane and plane side", () => {
  const result = generateWrapPositionGraph({
    ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
    targetPositionVisits: 18,
    seed: 4,
    btbChance: 0.8
  });

  for (const track of result.graph.tracks) {
    expectNoMoreThanTwoConsecutiveSameSurfaceRows(track.rows);
  }
});
```

Expected: this should pass with the pending-row normal-fill implementation. If it fails, inspect the emitted rows and fix the generator rather than relaxing the test.

- [ ] **Step 5: Run tests to verify Task 2 passes**

Run:

```bash
pnpm vitest --run test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
```

Expected: PASS for all generator tests.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
git commit -m "feat: generate synchronized wrap position graphs"
```

---

### Task 3: New Infinite Wrap Lab Page

**Files:**
- Create: `src/lab/experiments/mel-body-tracing/pages/InfiniteWrapExplorerPage.vue`
- Test: generator tests from Task 2 remain the primary coverage; this task is visually verified in browser.

- [ ] **Step 1: Create the lab page script and controls**

Create `src/lab/experiments/mel-body-tracing/pages/InfiniteWrapExplorerPage.vue`:

```vue
<script setup lang="ts">
import { computed, ref } from "vue";

import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { findActivePoiBeatStep } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import PoiBeatGraph from "@/lab/experiments/mel-body-tracing/components/PoiBeatGraph.vue";
import {
  DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
  generateWrapPositionGraph
} from "@/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

const targetPositionVisits = ref(DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS.targetPositionVisits);
const seed = ref(DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS.seed);
const btbChancePercent = ref(DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS.btbChance * 100);
const generation = ref(generateWrapPositionGraph(DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS));
const compilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
const compiled = computed(() => compilePoiBeatGraph(generation.value.graph, compilerOptions));
const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(() => compiled.value.sequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { core, transport, display } = workspace;
const activeStep = computed(() =>
  findActivePoiBeatStep(
    transport.currentTime.value,
    generation.value.graph.cycleSteps,
    compilerOptions.halfBeatDuration
  )
);
const durationLabel = computed(() => transport.duration.value.toFixed(2));
const generatedBeatLabel = computed(() =>
  ((generation.value.graph.cycleSteps * compilerOptions.halfBeatDuration) / 1).toFixed(1)
);
const btbSummary = computed(
  () => `BTB L ${generation.value.btbVisits.left} / R ${generation.value.btbVisits.right}`
);
const positionSummary = computed(
  () =>
    `Visits L ${generation.value.visitedPositions.left.length} / R ${generation.value.visitedPositions.right.length}`
);

core.session.setProjectionMode("tilted");
core.session.setPlaneSideSeparationWorld(0.2);
transport.setSpeed(0.5);
display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);
display.setOverlayVisibility("showBodyRig", true);

function generate(): void {
  generation.value = generateWrapPositionGraph({
    ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
    targetPositionVisits: targetPositionVisits.value,
    seed: seed.value,
    btbChance: btbChancePercent.value / 100
  });
}

function togglePlayback(): void {
  transport.toggle();
}

function onScrub(event: Event): void {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}

function setTargetPositionVisits(event: Event): void {
  targetPositionVisits.value = Number((event.target as HTMLInputElement).value);
}

function setSeed(event: Event): void {
  seed.value = Number((event.target as HTMLInputElement).value);
}

function setBtbChance(event: Event): void {
  btbChancePercent.value = Number((event.target as HTMLInputElement).value);
}
</script>
```

- [ ] **Step 2: Add the page template**

Append the template in the same file:

```vue
<template>
  <main class="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-8 md:py-10">
    <section class="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <div class="grid content-start gap-4">
        <header>
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Mel body tracing</p>
              <h1 class="mt-2 text-2xl font-semibold text-slate-50">Infinite Wraps</h1>
            </div>
            <RouterLink
              to="/lab/body-tracing-explorer"
              class="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100"
            >
              Explorer
            </RouterLink>
          </div>
          <p class="mt-2 text-sm leading-6 text-slate-400">
            Generate split-time opposite wrap position visits for both hands. BTB visits are
            random native-side template substitutions inside the same position walk.
          </p>
        </header>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Generator</h2>
          </div>
          <div class="grid gap-4 px-4 py-4">
            <label class="grid gap-1 text-sm">
              <span class="font-medium text-slate-300">Target position visits</span>
              <input
                type="number"
                min="1"
                max="128"
                :value="targetPositionVisits"
                class="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                @input="setTargetPositionVisits"
              />
            </label>

            <label class="grid gap-1 text-sm">
              <span class="font-medium text-slate-300">Seed</span>
              <input
                type="number"
                :value="seed"
                class="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                @input="setSeed"
              />
            </label>

            <label class="grid gap-2 text-sm">
              <span class="font-medium text-slate-300">BTB chance {{ btbChancePercent }}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                :value="btbChancePercent"
                class="accent-amber-400"
                @input="setBtbChance"
              />
            </label>

            <button
              type="button"
              class="rounded-md border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-300/20"
              @click="generate"
            >
              Generate
            </button>
          </div>
        </section>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Summary</h2>
          </div>
          <dl class="grid gap-2 px-4 py-4 text-sm text-slate-400">
            <div class="flex justify-between gap-4">
              <dt>Rows</dt>
              <dd class="font-mono text-slate-200">{{ generation.graph.cycleSteps }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt>Beats</dt>
              <dd class="font-mono text-slate-200">{{ generatedBeatLabel }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt>Duration</dt>
              <dd class="font-mono text-slate-200">{{ durationLabel }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt>Positions</dt>
              <dd class="font-mono text-slate-200">{{ positionSummary }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt>BTB</dt>
              <dd class="font-mono text-slate-200">{{ btbSummary }}</dd>
            </div>
          </dl>
        </section>

        <PoiBeatGraph
          :graph="generation.graph"
          :half-beat-duration="compilerOptions.halfBeatDuration"
          :active-step="activeStep"
          readonly
        />
      </div>

      <section class="grid content-start gap-4">
        <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
          <header
            class="grid gap-3 border-b border-slate-800 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
          >
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Visualizer</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-100">Generated wrap stream</h2>
            </div>
            <button
              type="button"
              class="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100"
              @click="togglePlayback"
            >
              {{ transport.isPlaying.value ? "Pause" : "Play" }}
            </button>
          </header>

          <PoiCanvasViewport
            :core="core"
            :display="display"
            :transport="transport"
            class="min-h-[34rem]"
          />

          <div class="border-t border-slate-800 px-4 py-3">
            <input
              type="range"
              min="0"
              :max="transport.duration.value"
              step="0.01"
              :value="transport.currentTime.value"
              class="w-full accent-amber-400"
              @input="onScrub"
            />
          </div>
        </section>
      </section>
    </section>
  </main>
</template>
```

- [ ] **Step 3: Run typecheck to catch page API issues**

Run:

```bash
pnpm typecheck
```

Expected: PASS. If this fails on `transport.isPlaying.value` inside the template, replace that template expression with a computed `isPlayingLabel`.

- [ ] **Step 4: Commit Task 3**

```bash
git add src/lab/experiments/mel-body-tracing/pages/InfiniteWrapExplorerPage.vue
git commit -m "feat: add infinite wrap lab page"
```

---

### Task 4: Route the New Lab Page

**Files:**
- Modify: `src/router.ts`

- [ ] **Step 1: Add the import**

Modify `src/router.ts` imports:

```ts
import InfiniteWrapExplorerPage from "@/lab/experiments/mel-body-tracing/pages/InfiniteWrapExplorerPage.vue";
```

- [ ] **Step 2: Add the route**

Add this route near the other Mel body tracing routes:

```ts
{
  path: "/lab/infinite-wraps",
  name: "infinite-wraps",
  component: InfiniteWrapExplorerPage
},
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit Task 4**

```bash
git add src/router.ts
git commit -m "feat: route infinite wrap lab"
```

---

### Task 5: Verification and Browser Smoke Test

**Files:**
- No required edits unless verification exposes defects.

- [ ] **Step 1: Run focused generator tests**

Run:

```bash
pnpm vitest --run test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run existing related tests**

Run:

```bash
pnpm vitest --run test/lab/experiments/mel-body-tracing/wrapRules.test.ts test/lab/experiments/mel-body-tracing/cosmoRules.test.ts test/lab/experiments/mel-body-tracing/poiBeatGraph.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full validation**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: all commands PASS.

- [ ] **Step 4: Start the dev server**

Run:

```bash
pnpm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 5: Browser smoke test**

Open:

```text
http://127.0.0.1:5173/lab/infinite-wraps
```

Verify:

- The page loads without console errors.
- The beat graph has two tracks and the active step advances during playback.
- Clicking `Generate` with the same seed produces the same graph.
- Changing the seed usually produces a different graph.
- Setting BTB chance to `0%` produces no BTB visits in the summary.
- Setting BTB chance to `100%` produces at least one BTB visit when either hand reaches a native position.
- The visualizer shows poi trails and body overlay; side offsets make BTB sections visible in tilted projection.

- [ ] **Step 6: Commit any verification fixes**

If Step 5 required fixes:

```bash
git add src/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator.ts src/lab/experiments/mel-body-tracing/pages/InfiniteWrapExplorerPage.vue test/lab/experiments/mel-body-tracing/wrapPositionEnumerator.test.ts
git commit -m "fix: stabilize infinite wrap lab"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: The plan builds a separate lab page, a two-hand position enumerator, random BTB template substitution from native positions, synchronized graph output, and visualizer/beat-graph preview.
- Scope check: Timing modes, offset exploration, cosmo/reel enumeration, early exits into overlapping beat graph rows, and polished gallery browsing are intentionally excluded from this MVP.
- Known risk: BTB has 13 rows while normal visits have 3 rows. Task 2 handles this by using a pending-row normal stream for the non-BTB hand, so the catch-up side can emit exactly 13 normal rows without inserting silent static filler.
