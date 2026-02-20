# Boundary-Explicit Sequence Model (Part 1)

## Goal

Build a deterministic poi simulation engine that evaluates rig pose from time in abstract units, with sequence composition on top.

## Scope (Part 1)

- 2D plane only
- Rig: `body -> hand -> head`
- Relative angular motion supported
- Hand path driver starts with circle
- No auto-fixing transitions
- Sequence continuity not enforced initially (segments may jump)

## Core Terms

### Rig Pose

State of all rig nodes at a time:

- body position (fixed origin in Part 1)
- hand state (position / phase / radius as defined by hand path driver)
- head relative phase + radius
- derived head world position / absolute angle

### Segment Template

Reusable motion definition (no absolute start time):

- start pose (or start phase state)
- node drivers + params
- no placement timing baked in

### Segment Placement

Sequence-level placement of a segment template:

- `startUnit`
- `durationUnits`
- optional overrides (for example, start phase override)

### Sequence

Ordered set of segment placements evaluated over global time units.

### Boundary Mode

Part 1:

- `jump` only (no continuity guarantee)

Future:

- `position_continuous`
- `velocity_continuous`

### HandPathDriver

Function that computes hand path state from start state + local time.

## Data Shape (Suggested)

```ts
type Units = number;
type Angle = number;

type Vec2 = { x: number; y: number };

type RigStartPose = {
  handPhase: Angle;
  handRadius: number;
  headRelPhase: Angle;
  headRadius: number;
};

type HandPathCircleParams = {
  omega: number; // phase rate per unit
};

type HandPathDriverKind = "circle"; // extend later

type SegmentTemplate = {
  id: string;
  startPose: RigStartPose;
  handPath: {
    kind: HandPathDriverKind;
    params: HandPathCircleParams;
  };
  headOmegaRel: number;
};

type SegmentPlacement = {
  segmentId: string;
  startUnit: Units;
  durationUnits: Units;
  startPoseOverride?: Partial<RigStartPose>;
};

type SequenceSpec = {
  segments: SegmentPlacement[];
  boundaryMode: "jump";
};
```

## Function Set (Part 1)

- `evaluateHandPathCircle(startPose, params, tLocal) -> { handPhase, handRadius, handPos }`
- `evaluateRigPose(template, resolvedStartPose, tLocal) -> Pose2D`
- `evaluateSegmentAt(placement, template, tGlobal) -> Pose2D`
- `evaluateSequenceAt(sequence, templates, tGlobal) -> Pose2D`
- `sampleSequence(sequence, templates, times[]) -> TraceRow[]`
- `resolvePlacementStartPose(placement, template) -> RigStartPose`
- `validateTemplate(template) -> errors[]`
- `validateSequence(sequence, templates) -> errors[]`

Useful utility:

- `endPoseOfPlacement(...)` (for future continuity checks)

## Determinism Rules

- Evaluation is direct (`state + t -> pose`), not incremental stepping.
- No integration drift dependence on frame/sample rate.
- Same templates + placements + time => identical output.

## Continuity Strategy

- Part 1: no continuity solving (`jump`)
- Part 2: enforce boundary by endpoint constraint:
  - require `endPose(prev) == startPose(next)` within epsilon
- Part 3: optional solve helpers (phase/rate fit), explicit and deterministic

## Segment Identity Clarification

Same pattern with different start phase should not require duplicating logic.

Use:

- `SegmentTemplate` = motion law
- `SegmentPlacement` = timing + start-pose override

This keeps pattern reuse high and avoids combinatorial duplication.
