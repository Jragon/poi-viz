# Boundary-Explicit Sequence Model (Part 1)

## Goal

Provide deterministic sequence evaluation over global time with explicit boundary behavior and no silent fixups.

## Scope (Part 1)

- 2D plane only
- Rig: `body -> hand -> head`
- Absolute world phase per node
- Sequence timing is contiguous by order (no explicit segment start times in authored spec)
- Boundary mode is `jump` only

## Core Terms

### Segment

Reusable motion law for one interval:

- hand start pose + hand driver
- head start pose + head driver

### SequenceSpec

Ordered list of placements:

- each placement has `segment`
- each placement has `durationUnits`

There is no authored `startUnit` in `SequenceSpec`.

### PreparedSequence

Validated + derived runtime representation:

- `placements[]` with derived `startUnit` / `endUnit`
- `totalDuration`

`PreparedSequence` is created once via `prepareSequence` and evaluated many times.

## Current Data Shape (Source-Accurate)

```ts
type TimeUnit = number;

type SegmentPlacement = {
  segment: Segment;
  durationUnits: TimeUnit;
};

type SequenceSpec = {
  segments: SegmentPlacement[];
};

type PreparedPlacement = SegmentPlacement & {
  readonly startUnit: TimeUnit;
  readonly endUnit: TimeUnit;
};

type PreparedSequence = {
  readonly placements: readonly PreparedPlacement[];
  readonly totalDuration: TimeUnit;
};
```

## Public Sequence API (Part 1)

- `validateSequence(sequence) -> { ok: true } | { ok: false; errors[] }`
- `prepareSequence(sequence) -> { ok: true; prepared } | { ok: false; errors[] }`
- `evalPreparedSequenceAt(prepared, tGlobal) -> EvalPreparedAtResult`
- `samplePreparedSequence(prepared, times[]) -> EvalPreparedAtResult[]`

`EvalPreparedAtResult` is structured:

- success: `{ ok: true, pose, segmentIndex, tLocal }`
- miss/error: `{ ok: false, reason: "INVALID_TIME" | "NEGATIVE_TIME" }`

## Boundary Semantics

- Non-negative finite global time wraps modulo `totalDuration`.
- Segment intervals are half-open: `[startUnit, endUnit)`.
- Exact segment boundary selects the next segment.
- Exact final boundary (`tGlobal === totalDuration`) wraps to local time `0`.
- Negative time is rejected explicitly.
- Non-finite time is rejected explicitly.

## Visualizer Trail Overlay

Trail rendering may use continuity-aware wraparound at the transport boundary as a visual overlay behavior. This does not change engine evaluation semantics.

- The trail loop period is the prepared multi-rig `maxSequenceDuration`, matching the transport window.
- In automatic mode, finite trail windows wrap across the boundary only when every rig's hand and head polar phase/radius match between `t = 0` and the exact left-limit pose at the transport boundary, modulo whole turns and within visual tolerance.
- Continuity is position-only; tangent and velocity continuity are not part of the trail decision.
- The visualizer normalizes wrapped trail sample times before calling engine evaluation, so the engine still receives non-negative finite times.

## Determinism Rules

- Sequence evaluation is direct (`prepared + tGlobal -> result`), with non-negative finite `tGlobal` wrapped before segment lookup.
- Same inputs produce identical outputs.
- Validation failures are explicit; runtime misses are explicit.

## Current Validation Rules

- Sequence cannot be empty.
- Each `durationUnits` must be finite.
- Each `durationUnits` must be strictly positive.

## Future Extension Direction

- Keep contiguous timing as Part 1 base model.
- If sparse timing is needed later, add a new explicit model/type instead of mutating current semantics.
- Keep boundary modes explicit (`jump` now; continuity modes later).
