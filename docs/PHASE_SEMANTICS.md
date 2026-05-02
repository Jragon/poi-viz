# Phase Semantics (Part 1)

## Purpose

Define exactly what `phase` means for each node so pattern formulas, drivers, and visualization stay consistent.

## Current Part 1 Source

The current source stores phase as plane-local state. With the default `wall` plane, this is equivalent to the original absolute 2D wall-plane convention.

- `hand.phase`: hand direction in the active plane frame
- `head.phase`: poi direction in the active plane frame

Angles are in radians.

- `0` = +X direction
- positive rotation = CCW

## Plane-Break Convention

Use plane-local phase for all nodes. In the default `wall` plane this is equivalent to the original absolute world phase model.

- `hand.phase`: hand direction in the active plane frame
- `head.phase`: poi direction in the active plane frame

Angles are in radians.

- `0` = local +X / right-horizon direction
- positive rotation follows the active plane's handedness convention

## Node Position Model

Each node has:

- `radius`
- `phase` (plane-local; equivalent to the original wall-plane absolute phase when `planeId = "wall"`)

For body origin `(0, 0)`, the active local plane determines how the local polar pose is embedded for projection:

- `handPos = polar(hand.radius, hand.phase)`
- `headPos = handPos + polar(head.radius, head.phase)`

## Angular Velocity Semantics

All `omega` values are local plane angular velocities:

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

These are useful for classification (for example inspin/antispin). Core state stores each node's local phase directly.

## Atomic Plane Notes

The first plane-break implementation uses three atomic planes:

- `wall`: the current implicit plane and default plane.
- `wheel`: a vertical plane that can share the same up-axis intuition as `wall`.
- `floor`: a horizontal plane with local phase measured around horizontal axes.

The numeric phase can carry across plane breaks, but its world-space embedding depends on the target plane's basis. `wall` and `wheel` are intuitive to compare because both include vertical/up. `floor` still has local phase, but the same number no longer means top/bottom/up/down in the same way.

## Phase Trigger Detection

Visualizer-side trigger features such as the metronome should compare against unwrapped phase values.

- local trigger: compare a node's active-plane `phase`
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
- world-space 3D interpretation would require an explicit plane frame

Mitigation:

- keep conversion helpers from day one:
  - `headRelPhase = wrap(headPhase - handPhase)`
  - `headPhase = wrap(handPhase + headRel)`

This keeps refactor risk low if internals change later.
