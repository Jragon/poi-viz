# Phase Semantics

## Purpose

Define exactly what `phaseAbs` means for each node so pattern formulas, drivers, and visualization stay consistent.

## Current Source

The current source stores phase as plane-local state. With the default `wall` plane, this is equivalent to the original absolute 2D wall-plane convention.

- `hand.phaseAbs`: hand direction in the active plane frame
- `head.phaseAbs`: poi direction in the active plane frame

Angles are in radians.

- `0` = +X direction
- positive rotation = CCW

## Plane-Break Convention

Use plane-local phase for all nodes. In the default `wall` plane this is equivalent to the original absolute world phase model.

- `hand.phaseAbs`: hand direction in the active plane frame
- `head.phaseAbs`: poi direction in the active plane frame

Angles are in radians.

- `0` = local +X / right-horizon direction
- positive rotation follows the active plane's handedness convention

## Node Position Model

Each node has:

- `radius`
- `phaseAbs` (plane-local; equivalent to the original wall-plane absolute phase when `planeId = "wall"`)

For body origin `(0, 0)`, the active local plane determines how the local polar pose is embedded for projection:

- `handPos = polar(hand.radius, hand.phaseAbs)`
- `headPos = handPos + polar(head.radius, head.phaseAbs)`

## Angular Velocity Semantics

Circle-driver `omega` values are local plane angular velocities:

- `handOmega = d(hand.phaseAbs)/dt`
- `headOmega = d(head.phaseAbs)/dt`

This matches spinner intuition for common patterns:

- extension: `headOmega = handOmega`
- 1-petal inspin (hand 1x): `headOmega = 2 * handOmega`
- 3-petal antispin (hand 1x): `headOmega = -2 * handOmega`

## Relative Quantities (Derived, Not Stored)

Relative poi phase to hand:

- `headRelPhase = wrap(head.phaseAbs - hand.phaseAbs)`

Relative poi angular velocity:

- `headRelOmega = headOmega - handOmega`

These are useful for classification (for example inspin/antispin). Core state stores each node's local phase directly.

## Driver-Specific Motion Semantics

The engine supports driver-specific motion laws.

### Circle Driver

The circle driver evaluates phase directly:

- `phaseAbs = startPhaseAbs + omega * tLocal`
- `radius = radiusProfile(tLocal)` when a circle driver has a time-keyed radius profile
- otherwise `radius = startRadius`

Radius profiles belong to the circle driver. They are segment-local time profiles with an implicit `t = 0` anchor from `startPose.radius`.

Preparation requires finite start phase, `omega`, and duration values, and rejects a circle when `startPose.phaseAbs + omega * durationUnits` would overflow to a non-finite result. This keeps all phase values produced by an accepted built-in circle interval finite.

### Point-To-Point Driver

The point-to-point driver is hand-only in the current source. It stores a polar `endPose`, but evaluation uses local Cartesian interpolation:

1. convert `startPose` and `endPose` to local Cartesian points
2. interpolate each coordinate with the convex form `start * (1 - progress) + end * progress`, where `progress = clamp(tLocal / durationUnits, 0, 1)`
3. convert the interior point back to polar

The convex form avoids the avoidable intermediate overflow of `start + (end - start) * progress` when both finite endpoint coordinates are large. At `progress <= 0`, evaluation returns `startPose` exactly. At `progress >= 1`, evaluation returns `endPose` exactly. This keeps segment boundaries deterministic and avoids floating-point endpoint drift.

Point-to-point `phaseAbs` is the geometric `atan2` of the current local Cartesian point. It is not an unbounded monotonic phase clock, and consumers that require monotonic phase crossing semantics must opt out unless they implement a separate sampled-velocity design.

### Pendulum Driver

The pendulum driver is a deterministic angular oscillator with constant radius. It is deliberately kinematic: amplitude and frequency are authored directly, and the engine does not integrate gravity, mass, energy, drag, or forcing impulses.

For amplitude `A`, cycles per unit `f`, oscillator phase `s`, and local time `t`:

- `phaseAbs = startPhaseAbs + A * (sin(s + 2πft) - sin(s))`
- `radius = startRadius`

Subtracting `sin(s)` makes the segment's `startPose` exact at `t = 0`. `s = 0` starts at the oscillator centre; `s = π/2` starts at a dead point with zero instantaneous angular velocity. A full oscillator cycle contains two apex-to-apex pendulum beats.

Preparation requires `0 < amplitudeRad <= π/2`, positive finite `cyclesPerUnit`, a finite `swingPhaseRad`, and a finite oscillator argument over the segment. Pendulum drivers are accepted only on wall and wheel planes. A head pendulum's inferred centre, `startPhaseAbs - A * sin(s)`, must be local down (`-π/2`, modulo `2π`). Hand pendulums may use another centre so the same primitive can express the upper hand arc in a simple isolated-pendulum composition.

The current driver does not support asymmetric forcing, changing amplitude, radius profiles, stalls, dead-point plane changes, or point isolation. Those require separate contracts rather than implicit behavior in the oscillator.

Authoring stores pendulum amplitude and swing phase in degrees plus frequency in cycles per unit, then compiles them to the engine's radian fields. The driver selector is per node. First-segment head edits keep the explicit start pose consistent with the local-down centre rule; continuation head drivers must remain compatible with their derived continuity boundary. Appending or duplicating a pendulum advances its stored oscillator phase across the source duration.

Swing phase is the phase of the oscillator, not the node's spatial angle. At 0° the oscillator crosses its centre toward increasing spatial angle; 90° is one dead point; 180° crosses the centre in the opposite direction; and 270° is the other dead point. For a head pendulum, the centre is local down, so its explicit segment-start angle must satisfy `start = -90° + amplitude × sin(swing phase)` modulo full turns.

### Runtime Driver

A runtime driver defines its own phase behavior through `evalPose`. Preparation validates the callback's shape but does not run it or inspect its output. Finite phase, continuity, monotonicity, purity, exceptions, and determinism are caller-owned. A consumer must not infer circle semantics from a runtime driver's output, even when its label describes circular motion.

## Atomic Plane Notes

The first plane-break implementation uses three atomic planes:

- `wall`: the current implicit plane and default plane.
- `wheel`: a vertical plane that can share the same up-axis intuition as `wall`.
- `floor`: a horizontal plane with local phase measured around horizontal axes.

The numeric phase can carry across plane breaks, but its world-space embedding depends on the target plane's basis. `wall` and `wheel` are intuitive to compare because both include vertical/up. `floor` still has local phase, but the same number no longer means top/bottom/up/down in the same way.

## Phase Trigger Detection

Visualizer-side trigger features such as the metronome should compare against unwrapped phase values for circle-driven sources.

- local trigger: compare a node's active-plane `phaseAbs`
- relative trigger: compare `head.phaseAbs - hand.phaseAbs`

Use periodic target matching against the unwrapped value rather than wrapping every sample first.
That preserves direction, supports multiple crossings in one frame interval, and keeps boundary handling explicit.

Non-circle sources are unavailable to the phase metronome because they do not provide the constant `omega` contract used for crossing detection. Therefore pendulum, point-to-point, and runtime nodes cannot be absolute sources. An absolute circle-driven head remains available while the hand is pendulum, point-to-point, or runtime; relative head-minus-hand sources require both nodes to use circle drivers.

## Examples

### Example A

- `hand.phaseAbs = 0`
- `head.phaseAbs = 0`
- result: hand points right, poi points right

### Example B

- `hand.phaseAbs = PI`
- `head.phaseAbs = 0`
- result: hand points left, poi points right

### Example C

- `hand.phaseAbs = PI`
- `head.phaseAbs = PI`
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
