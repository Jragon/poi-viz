# Boundary-Explicit Sequence Model (Part 1)

## Goal

Provide deterministic sequence evaluation over global time with explicit boundary behavior and no silent fixups.

## Scope (Part 1)

- Current source: local 2D pose evaluation with atomic plane metadata (`wall`, `wheel`, `floor`)
- Rig: `body -> hand -> head`
- Current source: plane-local phase per node with `wall` as the default plane
- Sequence timing is contiguous by order (no explicit segment start times in authored spec)
- Future extension: explicit authored boundary modes such as `jump` and `plane-break`

## Core Terms

### Segment

Executable motion interval:

- duration in time units
- optional atomic plane metadata
- hand start pose + hand driver
- head start pose + head driver

### SequenceSpec

Ordered list of executable segments:

- each segment has `durationUnits`
- each segment may have `planeId`
- each segment may have `planeSide`
- future extension: each segment after the first may have `entryBoundary`

There is no authored `startUnit` in `SequenceSpec`.

### PreparedSequence

Validated + derived runtime representation:

- `segments[]` with derived `startUnit` / `endUnit`
- resolved `planeId` on every segment
- optional `planeSide` preserved exactly as authored
- `totalDuration`

`PreparedSequence` is created once via `prepareSequence` and evaluated many times.

## Current Data Shape (Source-Accurate)

```ts
type TimeUnit = number;
type PlaneId = "wall" | "wheel" | "floor";
type PlaneSide = "a" | "b";

type CircleDriver = {
  kind: "circle";
  omega: number;
  radiusProfile?: RadiusProfile;
};

type PointToPointDriver = {
  kind: "point-to-point";
  endPose: RelativeNodePose;
};

type HandDriver = CircleDriver | PointToPointDriver;
type HeadDriver = CircleDriver;

type HandSegmentNodeMotion = {
  startPose: RelativeNodePose;
  driver: HandDriver;
};

type HeadSegmentNodeMotion = {
  startPose: RelativeNodePose;
  driver: HeadDriver;
};

type Segment = {
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  planeSide?: PlaneSide;
  hand: HandSegmentNodeMotion;
  head: HeadSegmentNodeMotion;
};

type SequenceSpec = {
  segments: Segment[];
};

type PreparedSegment = Omit<Segment, "planeId"> & {
  readonly planeId: PlaneId;
  readonly startUnit: TimeUnit;
  readonly endUnit: TimeUnit;
};

type PreparedSequence = {
  readonly segments: readonly PreparedSegment[];
  readonly totalDuration: TimeUnit;
};
```

## Future Boundary Metadata Extension

```ts
type PlaneId = "wall" | "wheel" | "floor";
type PlaneSide = "a" | "b";
type BoundaryMode = "jump" | "plane-break";
type ZeroPointKind = "lobe" | "antilobe" | "antispin" | "stall" | "pendulum" | "authored";

type SegmentEntryBoundary = {
  mode: BoundaryMode;
  zeroPointKind?: ZeroPointKind;
};

type Segment = {
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  planeSide?: PlaneSide;
  hand: SegmentNodeMotion;
  head: SegmentNodeMotion;
  entryBoundary?: SegmentEntryBoundary;
};

type PreparedSegment = Omit<Segment, "planeId"> & {
  readonly planeId: PlaneId;
  readonly startUnit: TimeUnit;
  readonly endUnit: TimeUnit;
};
```

## Public Sequence API (Part 1)

- `validateSequenceStructure(sequence) -> { ok: true } | { ok: false; errors[] }`
- `prepareSequence(sequence) -> { ok: true; prepared } | { ok: false; errors[] }`
- `evalPreparedSequenceAt(prepared, tGlobal) -> EvalPreparedAtResult`
- `samplePreparedSequence(prepared, times[]) -> EvalPreparedAtResult[]`

`EvalPreparedAtResult` is structured:

- success: `{ ok: true, pose, planeId, planeSide?, segmentIndex, tLocal }`
- miss/error: `{ ok: false, reason: "INVALID_TIME" | "NEGATIVE_TIME" }`

## Boundary Semantics

- Non-negative finite global time wraps modulo `totalDuration`.
- Segment intervals are half-open: `[startUnit, endUnit)`.
- Exact segment boundary selects the next segment.
- Exact final boundary (`tGlobal === totalDuration`) wraps to local time `0`.
- Negative time is rejected explicitly.
- Non-finite time is rejected explicitly.

## Atomic Plane Semantics

- Omitted `planeId` resolves to `wall` during preparation.
- A segment's `planeId` describes the local plane context for that segment's 2D motion.
- A segment's optional `planeSide` describes which generic side (`a` or `b`) of the active atomic plane the segment occupies.
- Omitted `planeSide` remains unspecified; the engine does not default it to `a`.
- `planeSide` does not affect local segment evaluation.
- `wall`, `wheel`, and `floor` are atomic planes. A segment does not occupy an in-between plane in this model.
- Authored plane changes are validated by the compile layer from evaluated boundary poses.
- Local segment evaluation remains unchanged.

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
- Engine segment `planeId`, when present, must be `wall`, `wheel`, or `floor`.
- Engine segment `planeSide`, when present, must be `a` or `b`.
- Engine head drivers cannot be `point-to-point`.

## Additional Implemented Validation Rules

- Authored plane changes require the previous end pose hand to be on the source plane's shared-axis cardinal.
- Authored plane changes require the head to be collinear with the hand: relative phase `0` or `PI`.
- `wheel <-> floor` applies an explicit absolute-phase remap while preserving relative phase.

## Future Extension Direction

- Keep contiguous timing as Part 1 base model.
- If sparse timing is needed later, add a new explicit model/type instead of mutating current semantics.
- Keep proposed boundary modes explicit (`jump` / `plane-break` first; continuity modes later).
- Keep future side/crosspoint legality separate from structural validation. Add a pose-dependent boundary validator over prepared/evaluated boundaries rather than overloading `validateSequenceStructure`.
- Continuous plane bends, weaves, toroids, and body-aware 3D paths need separate future models.
