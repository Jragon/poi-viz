## 2026-04-30: Continuous Loop Trails Are Visualizer Overlay Behavior

Trail continuity is handled in the visualizer, not the engine. Engine sequence evaluation keeps its existing non-negative modulo wrapping and half-open segment semantics.

- Trail loop period is `PreparedMultiRigSequence.maxSequenceDuration`, matching the transport window.
- Automatic trail looping is enabled by default, with an `Off` visualizer toggle.
- Automatic mode wraps only finite trail windows and only when all rigs are polar-continuous at the transport boundary within visual tolerance.
- Continuity means hand and head phase/radius match at `t = 0` and the exact left-limit pose at the transport boundary, modulo whole turns. Tangent/velocity continuity is intentionally not required.
- The exact final boundary is evaluated from the left for continuity checks because normal engine evaluation at `D` wraps to `0`.
- PNG sequence export records and uses the selected trail loop mode so export output matches interactive visualization.

## 2026-05-01: Atomic Plane Breaks POC: Plane Metadata and Projection Adapter

Plane-break support starts with three orthogonal atomic planes and compile-layer boundary validation, not arbitrary 3D motion.

- Atomic plane ids are `wall`, `wheel`, and `floor`.
- Omitted placement `planeId` values resolve to `wall` during sequence preparation.
- `Segment` remains plane-agnostic; plane context belongs to authored segments and engine placements.
- Local pose evaluation remains 2D. Evaluated placements expose resolved `planeId` so visual consumers can project poses through an adapter.
- Projection preference defaults to `auto`: wall-only sequences stay front orthographic, while any non-`wall` placement switches the effective view to tilted orthographic. Display settings can still force flat or tilted projection and adjust yaw/pitch.
- Authored plane changes are valid only when the previous end pose lies on the source plane's shared axis and the head is collinear with the hand.
- `wheel <-> floor` remaps both hand and head by the same absolute phase offset, preserving relative phase.
- Explicit boundary mode fields, zero-point annotations, body-aware weaves, toroids, continuous plane bends, and WebGL remain future work.

## 2026-05-02: Time-Keyed Node Radius Profiles

Radius variation is modeled as an optional per-node profile layered onto the existing circular phase driver.

- `Segment` remains a two-node polar chain; this is not a body-aware arm model.
- The same radius profile mechanism applies to either node: hand radius is from the root/shoulder origin, head radius is from the hand.
- Profile keys are segment-local time values, not normalized fractions. Authored key times must satisfy `0 < t <= durationUnits`.
- `t = 0` is implicit and comes from the node `startPose.radius`; first segments expose that as editable authored start radius, while continuation segments derive it from the previous evaluated end pose.
- Radius interpolation is linear between the implicit start anchor and keyed values. After the final key, the final keyed radius is held through segment end.
- Radius values are nonnegative. Radius `0` is allowed; signed radius is excluded because it is phase-equivalent to a nonnegative radius plus a phase offset.
- The editor should keep the default large-screen segment layout dense. Radius profile rows are progressive per-node controls, not a segment-level path selector.
