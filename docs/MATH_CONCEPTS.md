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

## Body Rig World Coordinates

Body-rig geometry uses normal y-up `Vec3` world coordinates until projection.

- `+X` = the performer's right side, and screen-right in the neutral wall view.
- `+Y` = up.
- `+Z` = forward from the torso toward the viewer/camera, out of the neutral wall plane.
- Neutral torso forward is `+Z`.
- Neutral torso right is `+X`, derived as `cross(worldUp, torsoForward)`.
- Left shoulder is `shoulderGirdleCenter - torsoRight * halfSpan`.
- Right shoulder is `shoulderGirdleCenter + torsoRight * halfSpan`.

Projection is a boundary step. Wall orthographic projection uses `(x, y)`, and canvas drawing flips `y` only at the final pixel transform.

## Body Rig Elbow Convention

The 3D body rig treats elbow bend direction as anatomical state, not a canvas artifact.

- Left native outward is `-torsoRight`.
- Right native outward is `+torsoRight`.
- Elbows prefer to bend forward in `+torsoForward` depth.
- Native outward is secondary and should not override a stable forward-depth pole.
- If forward depth becomes degenerate, native outward is the fallback cue.
- If a 2D-looking pose would require crossing the elbow across the body, the elbow should come forward in `+Z` instead.

## Relative vs Absolute Phase

- Hand phase is absolute in body frame.
- Head phase is also absolute in body frame.
- Relative poi phase is derived when needed: `head.phase - hand.phase`.

## Deterministic Evaluation

- Pose is evaluated directly from `startState + t`.
- No step-by-step integration in core evaluation.
- Same inputs and time must always produce the same pose.

## Segment and Sequence Math

- Segment defines local motion laws and start state.
- Sequence places segments on a global timeline in time units.
- Local time is derived from global time and the segment's prepared timeline interval.

## Boundary Behavior (Part 1)

- Current mode is `jump`.
- Segment transitions are not forced to match position yet.
- Continuity constraints are planned as explicit boundary modes.
