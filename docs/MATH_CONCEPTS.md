# Math Concepts (Quick Reference)

This is a short reference for core math ideas used by the engine.

## Angles and Units

- Angles are in radians.
- Time is in abstract units (`TimeUnit`), not tied to seconds yet.
- Angular velocity is radians per time unit.

## Polar Coordinates

- A 2D point can be represented by radius + angle.
- Radius is distance from an origin.
- Angle is direction from the origin.

## Rig Frames

- `body -> hand -> head` is a parent-child chain.
- Hand pose is measured relative to body origin.
- Head pose is measured relative to hand.
- Child world position = parent world position + child local offset.

## Relative vs Absolute Phase

- Hand phase is absolute in body frame.
- Head phase is relative to hand.
- Head absolute phase = hand phase + head relative phase.

## Deterministic Evaluation

- Pose is evaluated directly from `startState + t`.
- No step-by-step integration in core evaluation.
- Same inputs and time must always produce the same pose.

## Segment and Sequence Math

- Segment defines local motion laws and start state.
- Sequence places segments on a global timeline in time units.
- Local time is derived from global time and segment placement.

## Boundary Behavior (Part 1)

- Current mode is `jump`.
- Segment transitions are not forced to match position yet.
- Continuity constraints are planned as explicit boundary modes.
