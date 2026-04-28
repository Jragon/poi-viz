# Phase Semantics (Part 1)

## Purpose

Define exactly what `phase` means for each node so pattern formulas, drivers, and visualization stay consistent.

## Part 1 Decision

Use absolute world phase for all nodes.

- `hand.phase`: hand direction in world frame
- `head.phase`: poi direction in world frame

Angles are in radians.

- `0` = +X direction
- positive rotation = CCW

## Node Position Model

Each node has:

- `radius`
- `phase` (absolute)

For body origin `(0, 0)`:

- `handPos = polar(hand.radius, hand.phase)`
- `headPos = handPos + polar(head.radius, head.phase)`

## Angular Velocity Semantics

All `omega` values are world angular velocities:

- `handOmega = d(hand.phase)/dt`
- `headOmega = d(head.phase)/dt`

This matches spinner intuition for common patterns:

- extension: `headOmega = handOmega`
- 1-petal inspin (hand 1x): `headOmega = 2 * handOmega`
- 3-petal antispin (hand 1x): `headOmega = -2 * handOmega`

## Relative Quantities (Derived, Not Stored)

Relative poi phase to hand:

- `headRelPhase = wrap(head.phase - hand.phase)`

Relative poi angular velocity:

- `headRelOmega = headOmega - handOmega`

These are useful for classification (for example inspin/antispin), even though core state is absolute.

## Phase Trigger Detection

Visualizer-side trigger features such as the metronome should compare against unwrapped phase values.

- absolute trigger: compare a node's world `phase`
- relative trigger: compare `head.phase - hand.phase`

Use periodic target matching against the unwrapped value rather than wrapping every sample first.
That preserves direction, supports multiple crossings in one frame interval, and keeps boundary handling explicit.

## Examples

### Example A

- `hand.phase = 0`
- `head.phase = 0`
- result: hand points right, poi points right

### Example B

- `hand.phase = PI`
- `head.phase = 0`
- result: hand points left, poi points right

### Example C

- `hand.phase = PI`
- `head.phase = PI`
- result: hand points left, poi points left

## Why This Decision Now

Pros:

- easier authoring and mental model
- direct mapping to "what direction is poi pointing now"
- easier early debugging and plotting

Costs:

- parent-child rig composition is less natural than relative-state engines
- deeper multi-node expansion may prefer relative internals later

Mitigation:

- keep conversion helpers from day one:
  - `headRelPhase = wrap(headAbs - handAbs)`
  - `headAbs = wrap(handAbs + headRel)`

This keeps refactor risk low if internals change later.
