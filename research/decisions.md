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
- Authoring controls and authored document compile support were added on 2026-07-15; new segments
  write side `a` explicitly while imported legacy omission is preserved.
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
- Point-to-point is a hand-only engine driver in this slice; head drivers were circle-only at the time. Runtime head drivers superseded that restriction on 2026-07-15, while point-to-point remains hand-only.
- Point-to-point stores a polar `endPose` to match the existing pose model, but evaluates by local Cartesian interpolation between start and end points.
- Endpoint evaluation is exact: `progress <= 0` returns `startPose`, and `progress >= 1` returns `endPose`.
- Point-to-point output phase is geometric `atan2`, not a monotonic clock. Metronome hand and relative sources opt out while hand point-to-point is active; absolute head sources remain available.
- Authored point-to-point controls are deferred. Engine-to-authored round-trip fails explicitly for point-to-point rather than losing endpoint data.
- A temporary localStorage migration mapped old authored `node.radiusProfile` fields to `node.driver.radiusProfile`, with a removal target of 2026-05-27. It was removed on 2026-07-15 without a compatibility fallback; invalid legacy snapshots now fall back to seed data and are overwritten on persistence.

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

## 2026-07-15: Defensive Preparation with an Explicit Unsafe Runtime Escape Hatch

Engine preparation is the runtime trust boundary for declarative sequence input. Runtime drivers remain deliberately unsafe so lab evaluators can express motion that does not fit built-in drivers.

- `prepareSequence` and `prepareMultiRigSequence` accept `unknown` and defensively decode execution-critical structure.
- Decoding remains semi-flexible: unrelated properties are ignored, while missing, malformed, non-finite, negative, overflowing, or non-advancing execution data is rejected with structured errors.
- Built-in circle and point-to-point drivers receive numeric and semantic validation. Circle phase range and time-keyed radius profiles are checked across the segment contract.
- Runtime drivers are allowed on hand and head nodes. Preparation validates only a non-empty label and callback shape; callback output, purity, captured state, exceptions, and determinism are caller-owned.
- Successful preparation returns a cloned, deeply frozen snapshot. Runtime callback functions are retained by reference and remain callable.
- Point-to-point interpolation uses the convex Cartesian form `start * (1 - progress) + end * progress` to avoid avoidable subtraction overflow while preserving exact endpoints.
- Multi-rig IDs must be strings and unique by exact equality. Otherwise arbitrary string IDs are supported, including object-prototype names, and evaluated records are constructed without prototype-key assignment hazards.

The deterministic engine guarantee now applies explicitly to built-in drivers. Code using runtime drivers must treat that path as unsafe rather than relying on validation to make it declarative or pure.

## 2026-07-15: Quarter-Time Stall Patterns Use a Canonical Codec and Continuous Graph Layouts

Quarter-time stall patterns are authored as serializable lab data and identified by a compact,
versioned codec such as `q1.4.URDL.RDLU`.

- Pattern data contains beat count and optional left/right cardinal tracks. `_` is an unfinished
  beat and `-` is an absent hand. Editor selection, visibility, and layout are not pattern data.
- The editor defaults to one continuous horizontal, left-to-right timeline with internal scrolling
  and fixed cardinal labels. Vertical rendering remains available as a view preference.
- The fit-to-card full-pattern rendering is the canonical thumbnail for selection and saved-pattern
  surfaces. It remains recognizable for patterns longer than 22 beats.
- Wrapped multi-staff rendering is rejected. It fragments the continuous cycle without adding
  enough value for either editing or article comparison.
- Article examples are backed directly by codecs rather than requiring semantic pattern names.
- This remains lab notation and compilation behavior; it does not add quarter-time concepts to the
  engine runtime.

## 2026-07-15: Reproducible V2 Verification and Expired Migration Removal

The supported V2 toolchain and verification gates are explicit:

- Node.js 22 is pinned by `.node-version` and `package.json`.
- pnpm 10.34.5 is pinned by `packageManager` and both V2 GitHub Actions workflows.
- Clean CI and deployment installs use `pnpm install --frozen-lockfile`.
- `pnpm typecheck` uses `vue-tsc --noEmit`, so TypeScript and Vue single-file components are checked.
- Pull requests and pushes to `main` run lint, Vue-aware typecheck, tests, and build.

The expired authored radius-profile localStorage migration is removed. Backward compatibility and preservation of invalid legacy snapshots are not requirements: if no valid stored documents remain, the authoring library restores seed documents and persists the current snapshot shape.

## 2026-07-15: Canonical Standing Body and Coupled Planted Turn

The body policy is independent of avatar measurements. `BodyRigDimensions` defines one canonical
human target scaled so the maximum hand-overlap circle has radius one; a loaded VRM measures only its
own scale and retargeting constraints.

- World torso search has an 80-degree ceiling.
- Pelvis yaw is capped at 40 degrees and prefers 45 percent of the requested turn.
- Chest twist relative to the pelvis is capped at 45 degrees.
- The deterministic allocation uses the feasible intersection of those limits; it does not introduce
  a history-dependent animation state or iterative full-body solver.
- Hips and knees are rebuilt from the solved skeleton while feet remain at their neutral support
  points. Both the main canvas and 3D/VRM adapters consume that same solved skeleton.
- Canonical thigh and shin ratios are `0.82` and `0.765` of arm reach. The combined `1.585` ratio
  corrects the previous short-legged standing body while retaining a small planted-knee bend.

Validation uses fixed far-side targets to require non-zero pelvis yaw, greater chest yaw, exact planted
feet, preserved limb lengths, and successful bilateral hand reach where physically feasible.

## 2026-07-15: Explicit Authoring Side and Legacy Display Default

Engine semantics remain unchanged: omitted `Segment.planeSide` is unspecified and stays omitted through
preparation and evaluation. Defaults belong to consumers, not the runtime engine.

- New authoring documents, tracks, appended segments, and duplicates write side `a` explicitly.
- The editor exposes A/B on every segment and compile/import round-trips explicit values without
  inventing metadata for imported legacy omissions.
- The visualizer treats omission as side `a` only while calculating display offsets. Its default
  plane-normal separation is `0.12` world units.
- Display fallback does not add `planeSide` to world/evaluated pose metadata, so loop continuity and
  engine behavior remain inspectable and unchanged.

## 2026-07-15: Aurora as the Visual VRM Default

Aurora replaces the stylized VRM 1.0 constraint sample as the lab's visual default. Aurora is a VRM
0.x asset exported by Polygonal Mind with embedded CC0 metadata and a complete humanoid mapping.

- Runtime posing continues through `three-vrm` normalized bones; no Aurora raw bone names enter the
  body solver or adapter contract.
- The existing measured rest-basis correction handles the avatar's source coordinate convention and
  maps it onto engine `+X/+Y/+Z` semantics.
- The official VRM 1.0 constraint sample stays checked in as the loader/constraint regression fixture.
- An asset contract test parses the shipped GLB metadata and fails if required humanoid mappings or
  the declared model identity disappear.
- VRM 1.0 remains the preferred format for future Blender exports, but format conversion is not a
  prerequisite for using a structurally valid VRM 0.x asset through the normalized API.

## 2026-07-15: Playback Yaw Continuity and Palm-Centred POI Attachment

The static body solve remains a pure function of the current hand targets. That is useful for tests and
fixed pose inspection, but an opposed continuous hand circle has equally valid left- and right-facing
torso solutions. Independent per-frame minimization can therefore bounce between branches.

- `BodyRigMotionSolver` is a display-layer chronological adapter, not an engine feature. It adds an
  explicit cost for departing from the previously accepted torso yaw and resets when playback moves
  backwards or the sequence changes.
- The main visualizer, 3D debug renderer, and VRM lab all use that adapter during playback; fixed pose
  cases keep the stateless solve.
- POI hand coordinates now mean palm centres for a loaded VRM. The adapter measures the index/middle/
  ring knuckle line and uses its midpoint from the wrist as the palm centre; sparse humanoid mappings
  deliberately fall back to the wrist rather than inventing an offset.

## 2026-07-21: Unified Source Pattern Registry with Explicit Save

Saved patterns are application-level source documents, not compiled engine sequences. The registry
supports three incompatible source kinds: authoring documents, stall-graph drafts, and beat graphs.

- One global selected pattern drives the main visualizer, Three.js debug visualizer, and VRM visualizer.
- Each editor accepts only its own source kind. Incompatible registry entries remain visible but are
  disabled. An editor with an incompatible global selection loads its existing default source.
- Editors use deep-cloned working copies. Editing does not write the registry. Save overwrites the
  loaded source record; Save As creates a new record and selects it globally.
- Runtime drivers are compiler-created behavior and are never persisted. Beat-graph sources are
  persisted so their runtime callbacks can be recreated by the compiler.
- Registry entries own displayed names, descriptions, folders, and selection. Authoring's legacy
  name and description fields are kept synchronized at registry persistence boundaries so there is
  one canonical value in practice. Folder deletion is rejected while patterns or child folders
  remain inside.
- Stored snapshots are accepted atomically: duplicate identities, broken or cyclic folder links,
  invalid sources, and dangling selections reject the snapshot instead of silently dropping or
  relocating records. Save cannot replace a pattern with an incompatible editor source kind.
- Persistence starts in a single versioned localStorage snapshot. JSON import/export and a bundled
  Git catalogue remain future extensions of the same JSON-compatible shape.
- Existing authoring localStorage data is migrated once into the registry without retaining a second
  active authoring library or deleting the old storage key.

## 2026-07-22: Compact Pattern Registry UI

The registry is a small application-wide utility rather than a full-screen browser on desktop.

- Desktop uses a compact, body-level teleported floating panel so it remains above navigation and
  sticky editor columns. Mobile uses the same component as a full-viewport, non-draggable panel.
- Folders expand inline in one tree. Pattern and folder management actions live behind click-operated
  row menus; the permanent management toolbar is removed.
- Editor pages default to a checked `Compatible patterns only` filter. Visualizer pages omit the
  filter because all source kinds are displayable there. Search, keyboard navigation, and
  drag-and-drop remain out of scope.
- App-level controls are compressed to a pattern-name opener, explicit Save, and Save As actions.

## 2026-07-22: Pendulum Is a Built-In Kinematic Oscillator with Lab-Owned Compositions

Pendulum motion is represented by a serializable deterministic built-in driver rather than a runtime callback or gravity simulation.

- The driver stores `amplitudeRad`, `cyclesPerUnit`, and `swingPhaseRad`, and evaluates `startPhaseAbs + amplitudeRad * (sin(swingPhaseRad + 2π * cyclesPerUnit * tLocal) - sin(swingPhaseRad))` at constant radius.
- Preparation requires amplitude in `(0, π/2]`, positive finite frequency, a finite oscillator phase and phase range, and a wall or wheel segment plane. Floor-plane pendulums are rejected.
- A head pendulum must be centred on local down. A hand pendulum may be centred elsewhere because the upper hand arc is required by the simple fixed-midpoint isolated-pendulum composition.
- The engine driver is kinematic, not a gravity, energy, drag, or forced-oscillator integrator. A complete oscillator cycle contains two apex-to-apex pendulum beats.
- The wall-plane pendulum lab owns ordinary, extended, simple isolated, same-time, quarter-time, mirrored, and extendulum presets. Same-time, quarter-time, and mirrored use extended pendulums on both poi. Extendulum locks one hand circle to one head oscillator cycle, or two apex-to-apex downswings. These are compositions of existing node drivers, not additional engine laws.
- Production authoring exposes a per-node circle/pendulum driver selector and the pendulum's amplitude, cycles-per-unit, and swing-phase controls. Pendulum authoring data is explicit and serializable; there are no segment-level composition presets. Appended and duplicated pendulum segments advance oscillator phase to preserve continuity.
- The pattern registry exposes the seven lab compositions as bundled saved authoring documents. This is an application-level conversion into ordinary authored node drivers, not an authoring-core dependency on lab theory or a new runtime motion law. Registry version 2 merges these examples once into existing version 1 libraries and then treats them as normal editable/deletable saved entries.
- Stalls, dead-point plane changes, forcing impulses, point isolations, and radius modulation remain deferred.

Validation: engine tests cover deterministic landmarks, exact segment starts, dead-point behavior, numeric domains, head centre, and plane restrictions. Lab tests prepare every preset on wall, verify the isolated preset's fixed tether midpoint, require extended timing pairs, and assert the extendulum frequency ratio.

## 2026-07-22: Beat-Graph Crosspoints Are Derived Interval Semantics

Beat-graph rows remain the authored source of truth. A plane-side crosspoint is derived by the
beat-graph compiler when adjacent resolved row sides differ; it is not an authored row, an engine
fixup, or visualizer geometry.

- Lane motion and plane-side motion are independent interval properties.
- Every A/B transition crosses at exactly 50 percent of its interval.
- A crosspoint at `x = 0` is illegal. A left/right crosspoint is legal only when the poi points
  outward on that body side.
- The compiler emits a resolved analysis plan and separate physical-legality diagnostics. It does
  not silently repair illegal graphs, and structural compilation diagnostics remain distinct.
- High, mid, and low are compiler-derived crosspoint levels. A direct high-to-low or low-to-high
  side transition crosses at mid.
- Plane A/B widths and continuous display depth remain visualizer properties. They do not enter the
  beat graph or its legality rules.
- Wrap legality is validated as single-hand behavior for left/right hands and inward/outward flow;
  two-hand combinations and cycle rotations are not separate oracle cases.
- Reel legality follows the same single-hand policy. Native, non-native, and back positions are
  checked at high and low for both flows; flow changes rotation direction while phase keeps the
  crosspoint orientation outward.
