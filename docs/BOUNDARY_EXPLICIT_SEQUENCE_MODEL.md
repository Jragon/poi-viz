# Boundary-Explicit Sequence Model

## Goal

Provide deterministic built-in sequence evaluation over global time with explicit boundary behavior and no silent fixups. Runtime drivers are an explicit unsafe exception described below.

## Current Scope

- Local 2D pose evaluation with atomic plane metadata (`wall`, `wheel`, `floor`).
- Conceptual rig chain: `body -> hand -> head`.
- Plane-local phase per node, with `wall` as the default plane.
- Sequence timing contiguous by segment order; authored specifications do not contain segment start times.
- Explicit general-purpose boundary modes such as `jump` and `plane-break` remain a future extension.

## Core Terms

### Segment

An executable motion interval containing:

- duration in time units;
- optional atomic plane and display metadata;
- hand start pose and driver;
- head start pose and driver.

### SequenceSpec

An ordered list of executable segments. A segment has `durationUnits` and may have `planeId`, `planeSide`, and `behindBody`. There is no authored `startUnit` in `SequenceSpec`.

### PreparedSequence

A validated, cloned, and derived runtime representation containing:

- `segments[]` with derived `startUnit` and `endUnit`;
- a resolved `planeId` on every segment;
- optional `planeSide` and `behindBody` preserved exactly when supplied;
- `totalDuration`.

`PreparedSequence` is created once through `prepareSequence` and evaluated many times. The accepted structure is a deeply frozen snapshot, so later mutation of caller-owned input cannot change evaluation. Runtime callback functions remain callable and are retained by reference.

## Current Data Shape

```ts
type TimeUnit = number;
type PlaneId = "wall" | "wheel" | "floor";
type PlaneSide = "a" | "b";

type RelativeNodePose = {
  phaseAbs: number;
  radius: number;
};

type RadiusProfileKey = {
  t: TimeUnit;
  radius: number;
};

type RadiusProfile = {
  kind: "time-keyed";
  keys: RadiusProfileKey[];
};

type CircleDriver = {
  kind: "circle";
  omega: number;
  radiusProfile?: RadiusProfile;
};

type PointToPointDriver = {
  kind: "point-to-point";
  endPose: RelativeNodePose;
};

type DriverEvalContext = {
  tLocal: TimeUnit;
  durationUnits: TimeUnit;
};

type RuntimeDriver = {
  kind: "runtime";
  label: string;
  evalPose: (startPose: RelativeNodePose, context: DriverEvalContext) => RelativeNodePose;
};

type HandDriver = CircleDriver | PointToPointDriver | RuntimeDriver;
type HeadDriver = CircleDriver | RuntimeDriver;

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
  behindBody?: boolean;
  hand: HandSegmentNodeMotion;
  head: HeadSegmentNodeMotion;
};

type SequenceSpec = {
  segments: Segment[];
};

type PreparedSegment = Readonly<Omit<Segment, "planeId">> & {
  readonly planeId: PlaneId;
  readonly startUnit: TimeUnit;
  readonly endUnit: TimeUnit;
};

type PreparedSequence = {
  readonly segments: readonly PreparedSegment[];
  readonly totalDuration: TimeUnit;
};

type RigSequenceEntry = {
  rigId: string;
  sequence: SequenceSpec;
};

type MultiRigSequence = {
  rigs: RigSequenceEntry[];
};
```

The public TypeScript interfaces are convenient for in-process construction. Preparation does not trust those static types at runtime: both preparation entry points accept `unknown` and defensively decode required fields.

## Future Boundary Metadata Extension

The following is proposal material, not current source:

```ts
type BoundaryMode = "jump" | "plane-break";
type ZeroPointKind = "lobe" | "antilobe" | "antispin" | "stall" | "pendulum" | "authored";

type SegmentEntryBoundary = {
  mode: BoundaryMode;
  zeroPointKind?: ZeroPointKind;
};

type SegmentWithEntryBoundary = Segment & {
  entryBoundary?: SegmentEntryBoundary;
};
```

## Public Preparation and Evaluation API

- `validateSequenceStructure(sequence: unknown) -> { ok: true } | { ok: false; errors[] }`
- `prepareSequence(input: unknown) -> { ok: true; prepared } | { ok: false; errors[] }`
- `evalPreparedSequenceAt(prepared, tGlobal) -> EvalPreparedAtResult`
- `samplePreparedSequence(prepared, times[]) -> EvalPreparedAtResult[]`
- `prepareMultiRigSequence(input: unknown) -> { ok: true; prepared } | { ok: false; errors[] }`
- `evalPreparedMultiRigSequenceAt(prepared, tGlobal) -> EvalMultiRigAtResult`
- `samplePreparedMultiRigSequence(prepared, times[]) -> EvalMultiRigAtResult[]`

`EvalPreparedAtResult` is structured:

- success: `{ ok: true, pose, planeId, planeSide?, behindBody?, segmentIndex, tLocal }`;
- invalid input time: `{ ok: false, reason: "INVALID_TIME" | "NEGATIVE_TIME" }`.

Prepared multi-rig state contains ordered prepared rig entries and their `maxSequenceDuration`. Successful evaluation returns a record keyed by the exact rig IDs. Rig IDs have no semantic restriction beyond being unique strings; result construction avoids object-prototype key hazards for values such as `"__proto__"`.

## Boundary Semantics

- Non-negative finite global time wraps modulo `totalDuration`.
- Segment intervals are half-open: `[startUnit, endUnit)`.
- An exact segment boundary selects the next segment.
- The exact final boundary (`tGlobal === totalDuration`) wraps to local time `0`.
- Negative time is rejected explicitly.
- Negative zero is treated as sequence start.
- Non-finite time is rejected explicitly.

## Atomic Plane and Display Metadata

- Omitted `planeId` resolves to `wall` during preparation.
- A segment's `planeId` describes the local plane context for its 2D motion.
- Optional `planeSide` identifies generic side `a` or `b` of the active plane.
- Omitted `planeSide` remains unspecified; the engine does not default it to `a`.
- Optional `behindBody` is boolean metadata for consumers.
- Neither `planeSide` nor `behindBody` changes local segment evaluation.
- `wall`, `wheel`, and `floor` are atomic planes; a segment cannot occupy an in-between plane.
- The authoring compile layer validates supported plane changes from evaluated boundary poses.

## Visualizer Trail Overlay

Trail rendering may use continuity-aware wraparound at the transport boundary as visual overlay behavior. This does not change engine evaluation semantics.

- The trail loop period is the prepared multi-rig `maxSequenceDuration`, matching the transport window.
- In automatic mode, finite trail windows wrap only when every rig's hand and head polar phase and radius match between `t = 0` and the exact left-limit pose at the transport boundary, modulo whole turns and within visual tolerance.
- Continuity is position-only; tangent and velocity continuity are not part of the trail decision.
- The visualizer normalizes wrapped trail sample times before calling engine evaluation, so the engine receives non-negative finite times.

## Determinism and Failure Rules

- Built-in sequence evaluation is direct (`prepared + tGlobal -> result`).
- Circle and point-to-point drivers produce identical outputs for identical prepared inputs and times.
- Preparation snapshots and deeply freezes accepted data so caller mutation cannot alter built-in results.
- Validation failures and invalid evaluation times are returned explicitly.
- Failure to find a segment after successful preparation is an internal invariant violation and throws.

### Unsafe Runtime Driver Exception

`RuntimeDriver` is the lab flexibility escape hatch. Preparation checks only that `label` is a non-empty string and `evalPose` is a function. It does not execute the callback or validate its return value.

The runtime-driver caller owns:

- output shape and numeric validity;
- purity and determinism;
- mutation and captured external state;
- thrown exceptions and other callback side effects.

Runtime drivers are allowed on hand and head nodes. Their presence deliberately removes the built-in determinism and explicit-failure guarantees for that callback path; it does not weaken validation of surrounding declarative data.

## Current Validation Rules

Preparation validates execution-critical fields and ignores unrelated properties. It does not coerce or repair invalid values.

### Sequence Structure and Timing

- Input must be a non-array object with a `segments` array.
- The segment list must be non-empty and every entry must be an object.
- Every segment must contain hand and head motion objects with object-shaped start poses and drivers.
- Each `durationUnits` must be a finite number greater than zero.
- Derived cumulative duration must remain finite and each prepared interval must advance beyond its previous endpoint.

### Poses and Built-In Drivers

- Every `phaseAbs` and radius must be finite; radii must be non-negative.
- Circle `omega` must be finite.
- A circle's `startPose.phaseAbs + omega * durationUnits` must remain finite.
- A radius profile must be `{ kind: "time-keyed", keys: [...] }`.
- Profile key times must be finite, greater than zero, no greater than segment duration, and strictly increasing.
- Profile key radii must be finite and non-negative.
- A point-to-point `endPose` receives the same phase and radius validation as a start pose.
- Point-to-point is supported only on the hand node. Circle and runtime drivers are supported on both nodes.
- Unknown or malformed driver kinds are rejected.

### Metadata and Multi-Rig Input

- `planeId`, when present, must be `wall`, `wheel`, or `floor`.
- `planeSide`, when present, must be `a` or `b`.
- `behindBody`, when present, must be boolean.
- Multi-rig input must be an object with a non-empty `rigs` array of object entries.
- Every `rigId` must be a string and unique by exact string equality.
- Every nested sequence must pass sequence preparation; nested errors are returned on the corresponding rig entry.

## Additional Authoring Validation

The authoring compile layer applies policy above engine preparation:

- plane changes require the previous end-pose hand to be on the source plane's shared-axis cardinal;
- plane changes require the head to be collinear with the hand, with relative phase `0` or `PI`;
- `wheel <-> floor` applies an explicit absolute-phase remap while preserving relative phase;
- continuation segments derive their start poses from the previous evaluated endpoint.

These rules do not silently change raw `SequenceSpec` input passed directly to engine preparation.

## Future Extension Direction

- Keep contiguous timing as the current base model.
- If sparse timing is needed, add a new explicit model instead of mutating current semantics.
- Keep proposed boundary modes explicit (`jump` and `plane-break` first; continuity modes later).
- Keep future side and crosspoint legality separate from structural validation. Add a pose-dependent boundary validator over prepared or evaluated boundaries rather than overloading `validateSequenceStructure`.
- Continuous plane bends, weaves, toroids, and body-aware 3D paths require separate future models.
