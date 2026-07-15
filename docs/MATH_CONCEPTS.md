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

- Hand `phaseAbs` is an absolute angle within the active local plane frame.
- Head `phaseAbs` is also absolute within that plane frame, rather than relative to the hand angle.
- Relative poi phase is derived when needed: `head.phaseAbs - hand.phaseAbs`.

## Deterministic Evaluation

- Built-in driver poses are evaluated directly from prepared start state and local time.
- No step-by-step integration in core evaluation.
- Circle and point-to-point drivers produce the same pose for identical prepared inputs and time.
- Runtime drivers are an explicitly unsafe exception: callback output, captured state, exceptions, and determinism are caller-owned.

## Segment and Sequence Math

- Segment defines local motion laws and start state.
- Sequence places segments on a global timeline in time units.
- Local time is derived from global time and the segment's prepared timeline interval.

## Boundary Behavior

- Raw engine segments carry explicit start poses, so adjacent segments may jump unless their supplied boundary poses match.
- The authoring compiler derives continuation-segment start poses from the previous endpoint and validates supported atomic plane changes.
- That authored continuity is compile-layer policy, not a silent fixup performed by engine preparation.
- Explicit general-purpose boundary mode metadata remains a future extension.
