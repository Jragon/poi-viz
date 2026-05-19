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
- Omitted segment `planeId` values resolve to `wall` during sequence preparation.
- `Segment` owns duration and plane context; authored segments compile to engine segments.
- Local pose evaluation remains 2D. Evaluated segments expose resolved `planeId` so visual consumers can project poses through an adapter.
- Projection preference defaults to `auto`: wall-only sequences stay front orthographic, while any non-`wall` segment switches the effective view to tilted orthographic. Display settings can still force flat or tilted projection and adjust yaw/pitch.
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

## 2026-05-06: Generic Plane-Side Metadata

Body-tracing side concepts start as generic engine metadata, not Mel/body vocabulary in runtime.

- `PlaneSide` values are `a` and `b`.
- `Segment.planeSide` is optional and remains optional through preparation/evaluation; the engine does not default it to `a`.
- `planeSide` is valid for every atomic plane.
- Local segment evaluation remains unchanged. Side offsets are visualization-layer choices, not engine pose behavior.
- Trail continuity compares `planeSide` so visual loop wrapping does not hide side-state boundaries.
- Authoring controls and authored document compile support are deferred.
- Crosspoint and side-transition legality is future engine boundary-validation work. Keep it separate from structural sequence validation and do not implement it in Vue components.

## 2026-05-06: Self-Contained Engine Segments

Engine `Segment` is the executable interval. The `SegmentPlacement` wrapper is removed rather than kept as a compatibility alias.

- `Segment` owns `durationUnits`, optional `planeId`, optional `planeSide`, and the hand/head node motion.
- `SequenceSpec.segments` and `PreparedSequence.segments` are flat segment arrays.
- `prepareSequence` derives `startUnit` and `endUnit` onto prepared segments and resolves omitted `planeId` to `wall`.
- `planeSide` remains optional and is only included in evaluated/world pose metadata when authored.
- This avoids a hollow wrapper type and lets segments execute independently in tests, experiments, and visualizer code.

## 2026-05-06: Body Rig World-Space Convention

Body-rig geometry uses normal y-up `Vec3` coordinates until projection, with projection and canvas conversion kept as explicit boundary steps.

- `+X` is the performer's right side and screen-right in the neutral wall view.
- `+Y` is up.
- `+Z` is forward from the torso toward the viewer/camera, out of the neutral wall plane.
- Neutral torso basis derives `torsoRight` as `cross(worldUp, torsoForward)`, so `worldUp = +Y` and `torsoForward = +Z` produce `torsoRight = +X`.
- The body rig's anatomical elbow policy prefers forward depth first and native-side outward only as a secondary cue.
- Left native outward is `-torsoRight`; right native outward is `+torsoRight`.
- Native-side correction must not pull the elbow backward or inject a vertical snap near horizontal full extension; if a 2D projection would make that tempting, the elbow comes forward in `+Z` instead.

## 2026-05-10: Low Common Cosmo Beat Graph Side Metadata

Mel-style low common cosmo in the poi beat graph is represented with authored per-row side metadata, not runtime body-tracing state.

- `PoiBeatRow.planeSide` is optional. Center rows default to side `a`; non-center rows default to side `b`.
- BTB is derived per node as side differing from that lane default. No BTB state machine is required for phase-one graph rendering.
- `center-side-switch` is a first-class interval kind for center-to-center side changes. It renders as a solid rounded arc.
- Non-`center-side-switch` connectors render dotted when either endpoint is derived BTB.
- Moving a graph row to another lane clears authored side so lane moves do not accidentally preserve BTB intent. Side toggling is an explicit second click on the selected node.
- A `lane-switch -> center-side-switch -> lane-switch` chain compiles as a compiler-local keyed runtime hand path: entry lane -> mirrored BTB-adjacent non-center lane -> exit lane. The mirrored point lands at the midpoint of the center-side-switch interval.
- All compiled cosmo segments remain on `planeId: "wall"`; `planeSide` changes segment metadata only. Plane-normal side offsets remain later visualization work.

## 2026-05-06: Driver-Specific Options and Hand Point-To-Point

Driver selection owns the motion law and that driver's options.

- Circle drivers own `omega` and optional time-keyed `radiusProfile`.
- Generic node-level `radiusProfile` is removed from engine and authored document shapes.
- Point-to-point is a hand-only engine driver in this slice; head drivers remain circle-only.
- Point-to-point stores a polar `endPose` to match the existing pose model, but evaluates by local Cartesian interpolation between start and end points.
- Endpoint evaluation is exact: `progress <= 0` returns `startPose`, and `progress >= 1` returns `endPose`.
- Point-to-point output phase is geometric `atan2`, not a monotonic clock. Metronome hand and relative sources opt out while hand point-to-point is active; absolute head sources remain available.
- Authored point-to-point controls are deferred. Engine-to-authored round-trip fails explicitly for point-to-point rather than losing endpoint data.
- A temporary localStorage migration maps old authored `node.radiusProfile` fields to `node.driver.radiusProfile`; remove after 2026-05-27.

## 2026-05-19: Humanoid Body Rig Solver Migration

Decision: migrate body rendering to a solver-first humanoid rig contract centered on `BodyRigPose.skeleton` and `BodySkeletonFrame`.

Rationale: 2D and 3D consumers need one deterministic solved skeleton rather than separate shoulder, pelvis, and elbow heuristics. The shared contract exposes semantic humanoid joints, segment descriptors, orientation cues, support-pose metadata, and solver diagnostics without renderer-specific mesh state.

Consequences:

- `BodySkeletonFrame` is the renderer-agnostic body pose contract for 2D and 3D adapters.
- Semantic joints include chest, pelvis center, clavicles, shoulders, elbows, hands, hips, knees, feet, neck, and head center.
- `canonicalPatternSpace` owns canonical wall-plane origin/unit-radius normalization; wheel and floor projections import that normalization instead of recomputing plane-local body scale.
- Shoulder-girdle solving exposes lift, protraction, retraction, lateral travel, overhead ambiguity, and limit diagnostics per side.
- `BodyHumanoidRenderer` renders simple torso, pelvis, and head volumes plus skeletal segment capsules and hand-only joint nodes.
- No old aliases, legacy compatibility layers, or deprecated body-rig field names are part of the migrated contract.

Validation: body-rig, visualizer, and lab tests cover the migrated skeleton contract, canonical pattern space, shoulder diagnostics, and renderer adapter behavior. Completion requires `pnpm test`, `pnpm typecheck`, `pnpm lint`, and a stale-term documentation search.
