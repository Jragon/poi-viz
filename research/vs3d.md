**A) Core Motion & Coordinate Model**
VS3D models each prop as recursive spherical offsets (`r`, `a`, `b`) through a chain, then composes them into world pose during render and spin evaluation (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:21`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:448`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:515`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d-render.js:100`).

- `body`: gross locomotion frame.
- `pivot`: body-relative displacement/pivoting.
- `helper`: extra intermediate offset for complex path shaping.
- `hand`: handle anchor.
- `grip`: grip offset/orientation staging before head.
- `head`: prop endpoint.
- `twist`: axial rotation scalar, applied after head orientation (not in `NODES` array) (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:21`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d-render.js:124`).

Why this works: relative links let compound motion be assembled from simple circular/linear components instead of single giant parametric equations (also explicitly described in `/Users/rory/code/notwork/visual-spinner-3d/details.html:32`, `/Users/rory/code/notwork/visual-spinner-3d/details.html:35`, `/Users/rory/code/notwork/visual-spinner-3d/details.html:68`).

Relevance to your 2D wall-plane V2:

- Cleanly maps: `hand/head` relative math, per-node polar-like motion, solver-based continuity.
- Probably optional in V2 core: `body/pivot/helper/grip` unless you need walking/displacement or advanced transitions immediately.
- 3D-only pressure: `b` bearing, arbitrary plane normals, `bent`, axial `twist`.
- For sequencer-first V2: full 6-node chain is likely excessive as a base representation. Keep a minimal 2D chain and allow optional expanded rig layers.

---

**B) Move Model vs Sequence Model**
In code, a “move” is a partially specified node-moment object with defaults and duration in beats (`Move`, `resolve`, `solve`, `spin_node`) (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:462`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:952`).

- Parameters support position/velocity/acceleration style endpoints (`a/a1`, `r/r1`, `va/va1`, `vr/vr1`, etc.), linear mode via `spin=0` or linear fields.
- Sequences are arrays of moves; playback selects move by cumulative beat ticks and loops (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:515`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1307`).
- Continuity is enforced by `fit`, `refit`, `realign`, `chain`; this is constraint propagation plus fallback heuristics (“kludging”) (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:995`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1045`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1285`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1466`).

Assessment:

- Fundamentally: VS3D is a fitted move-list system, not a true timeline/segment sequencer.
- Strength: compact move authoring and expressive transitions for spinner semantics.
- Cost: timing/structure is implicit in arrays and beat math, not explicit timeline objects.
- Scrubbing/partial playback/nesting: possible but awkward. `goto` loops on shortest prop length across all props (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1524`), which is bad for heterogeneous track lengths and modern transport expectations.

---

**C) Recipes as Translation Layer**
Recipes are generator functions registered in `MoveFactory` (`flower`, `ccap`, `pendulum`, `isolation`, `toroid`, `snake`) and expanded into beat-segment move arrays (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d-moves.js:81`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1412`).

- Spinner vocabulary maps to math fields (`petals`, `spin`, `mode`, `bend`, `harmonics`, `orient`, `entry`).
- Defaults are layered via `MoveFactory.defaults + recipe defaults + user args`.
- Many HTML demos build UI around recipe selection, then set `entry/orient/plane/direction` and `nofit` (`/Users/rory/code/notwork/visual-spinner-3d/demo.html:191`, `/Users/rory/code/notwork/visual-spinner-3d/demo.html:294`, `/Users/rory/code/notwork/visual-spinner-3d/toroids.html:127`).

Assessment:

- Recipes are excellent as a translation/generation layer.
- They should not be the core runtime model in your V2.
- Your “optional overlays/pattern generators” idea is the right direction.
- Mistake to avoid: letting recipe assumptions leak into transport/serialization as canonical data.

---

**D) Time, Beats, and Transport**
Timebase internals:

- `TICKS=360`, `MEASURE=4`, `BEAT=90`; beats are quarter-turn-ish unit (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:28`).
- Motion advancement is tick-based with `SPEED` scaling in kinematic formulas (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:614`).
- `Player.play()` uses `setTimeout` + fixed tick increment by `rate`; `animate()` uses RAF with rounded frame delta (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1551`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1564`).

Assessment:

- Not a strict single transport abstraction. Clocking is partly engine, partly page-level control choice, partly external video sync tools (`/Users/rory/code/notwork/visual-spinner-3d/mp4.html:24`, `/Users/rory/code/notwork/visual-spinner-3d/youtube.html:23`).
- Time semantics leak into UI and app pages heavily (controls, manual `rate/speed`, timecoder pages).
- V2 lesson: enforce one transport owner with explicit timeline units, deterministic seek, and independent render sampling.

---

**E) Rendering & UI Coupling**
Rendering:

- Current scripts provide a Three.js renderer only (`ThreeRenderer`) plus model builders (`poi/staff/hoop/fan/buugeng`) (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d-render.js:19`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d-buugeng.js:66761`).
- Multi-view is done by multiple renderer instances bound to same player state (`/Users/rory/code/notwork/visual-spinner-3d/toroids.html:48`).

Coupling:

- Core script (`vs3d.js`) includes runtime and DOM UI widgets (`Controls`, `Overlay`, `TimeCoder`) (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1648`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1711`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1773`).
- Demos directly mutate prop/move structures and call `refit()` manually (`/Users/rory/code/notwork/visual-spinner-3d/demo.html:301`, `/Users/rory/code/notwork/visual-spinner-3d/stacking.html:1065`).
- `details.html` documents an older widget/2D+Phoria architecture not matching current scripts (`/Users/rory/code/notwork/visual-spinner-3d/details.html:132`).

Conclusion:

- Avoid embedding UI controls/timecoder primitives inside core math/runtime module.
- Keep: lightweight wrapper pattern (`Player` + pluggable renderer), multi-camera idea, overlays as external consumers.
- Dated for modern SPA: global mutable objects, DOM imperative control wiring, page-specific orchestration logic.

---

**F) Limitations and Bugs as Design Lessons**
Documented and code-observed issues:

- Rigid props, no tangles (`/Users/rory/code/notwork/visual-spinner-3d/details.html:198`).
- Motion model, not physics (`/Users/rory/code/notwork/visual-spinner-3d/details.html:201`).
- No body model (`/Users/rory/code/notwork/visual-spinner-3d/details.html:204`).
- Historical phase/export mismatch and long-duration concerns (`/Users/rory/code/notwork/visual-spinner-3d/details.html:186`, `/Users/rory/code/notwork/visual-spinner-3d/details.html:189`).
- Plane-break fit brittleness and fallback kludges (`/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1025`, `/Users/rory/code/notwork/visual-spinner-3d/scripts/vs3d.js:1045`).

Tradeoff judgment:

- Acceptable for V2: no physics in core, no body model in core.
- Dangerous in sequencer-first: implicit fit magic, hidden fallback behavior, long-duration under-tested math, per-page time ownership.

Guardrails for V2:

- Deterministic continuity contracts (no silent kludge fallback).
- Explicit compile/validate stage for segments.
- Hard invariants and diagnostics for plane/frame transitions.
- Transport-level duration and seek tests for long segments.
- Canonical serialization independent of UI generators.

---

**G) Concrete V2 Takeaways**

1. Ideas worth stealing

- Relative node composition for complex circular motion.
- Solver-based endpoint completion from sparse user input.
- Recipe vocabulary as user-facing generator layer.
- Multi-view renderer consumption of one runtime pose stream.
- Beat-friendly domain language for spinner UX (as UI language, not core timing primitive).

2. Ideas to avoid

- Move-array-as-timeline with implicit looping/shortest-track truncation.
- Core module mixing math, transport, DOM controls, and serialization.
- “Best effort” continuity fallback that mutates intent.
- Global mutable state and page-specific orchestration logic.
- Recipe-generated data treated as canonical source of truth.

3. Mapping table

| VS3D concept                         | V2 equivalent                                                   |
| ------------------------------------ | --------------------------------------------------------------- |
| `Prop` recursive chain               | Minimal 2D rig (hand/head core), optional extended rig plugin   |
| `Move` object with kinematic fields  | Timeline segment spec (typed, validated, explicit in/out state) |
| `fit/refit/realign/chain`            | Compile-time continuity solver with deterministic failure modes |
| Recipe system (`flower`, etc.)       | Optional pattern generator layer producing segments             |
| `Player` tick/rate loop              | Single transport service (play/pause/seek/scrub/loop regions)   |
| `ThreeRenderer` builders             | Renderer adapters subscribed to transport sampled state         |
| `Controls/Overlay/TimeCoder` in core | UI package/modules outside core runtime                         |
| `bent/twist`                         | Optional 3D plane-embedding extension                           |
| Legacy widget/docs mismatch          | Versioned API/docs tied to build artifacts                      |
| VTG-like pattern sets                | UI overlays/generator presets, not runtime core                 |

4. Explicit recommendations

- Recursive node chains in V2: yes, but only a minimal 2D subset in core; full chain as extension.
- “Moves” first-class: only as compiled segment primitives inside a sequencer timeline, not as the top-level authoring model.
- Pattern generators: keep out of core math/runtime; place in optional UI/generator layer that emits canonical timeline segments.
