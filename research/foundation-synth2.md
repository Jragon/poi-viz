## 1. Executive synthesis

These documents are collectively trying to do one thing: **compress poi motion into a small set of invariants** so that patterns can be generated, compared, taught, and transitioned without drowning in Cartesian detail. Across authors, the surviving “shared truth” is that **poi is circular + relational**: patterns arise from **relative angular motion** (between frames/nodes), and their “meaning” lives in **ratios, phases, and symmetries**, not in absolute coordinates.

The corpus implicitly splits into two layers:

- **Thinking layers (human-friendly coordinate systems):**
  - QFT/harmonics (ratios, phases, superposition)
  - Symmetry/geometry constraints (axes, remarkable points, same-time/split-time)
  - Hybrid relation fingerprints (pairwise parity relations, driving styles)
  - VTG element theory as transition grammar

- **Runtime/engineering reality (what must exist to sequence deterministically):**
  - a single canonical engine that can **compile** those thinking layers into **piecewise segments** with explicit boundaries and evaluation semantics

Why QFT-style thinking emerges as the most unifying abstraction: because it’s the only lens that (a) explains steady-state families compactly, (b) composes naturally (“add another harmonic”), and (c) bridges to CAPs’ explicit “harmonic vs modulus” split cleanly. But it is also systematically _overconfident about repetition and closure_ (steady-state bias), so it belongs in **generators/analysis**, not in the runtime segment format.

Bottom line recommendation (firm): **V2’s canonical engine is a piecewise timeline of circular node-rig segments**, and everything else is a compiler view / generator / descriptor over that.

---

## 2. Shared conceptual primitives

Below are the primitives that recur across the corpus, how authors abuse them, and the **single V2 interpretation** you should standardise.

### Phase

- Plain meaning: “where you are on a rotation cycle” (an angle on the unit circle).
- Abuse modes:
  - treated as “time” (hybrid parity: same vs opposite)
  - treated as “starting position / orientation” without specifying the reference frame (CAPs examples imply this but don’t formalise it)

- **V2 interpretation:** phase is _always_ an **angle in a named frame**, for a named node/channel, at a boundary time. Phase is never “time” and never “pattern identity” by itself.

### Frequency / harmonic (turn counts)

- Plain meaning: “how many rotations per unit time,” often expressed as turn-count ratios.
- Abuse modes:
  - assumes cycles are the fundamental object (CAPs: patterns “must be cyclic”)
  - treats “one beat = one cycle” as implicit normalisation (hybrids parity grid)

- **V2 interpretation:** frequency is **cycles-per-segment in transport time units** (beats or seconds), chosen at compile-time for a segment. CAPs’ “Theta” becomes generator input; runtime stores angular velocity (or equivalent) per node per segment.

### Symmetry

- Plain meaning: invariant structure under rotation/reflection (axes, repetition).
- Abuse modes:
  - conflates “draw a square/triangle” (human intention) with “here are the constraints that guarantee that” (math spec missing)

- **V2 interpretation:** symmetry is a **constraint/diagnostic overlay** that can _propose_ constraints for a segment or _evaluate_ a segment’s output. It is never stored as core truth.

### Relative rotation (between frames/nodes)

- Plain meaning: motion is best expressed as chained rotations (shoulder→hand, hand→head).
- Abuse modes:
  - some systems hide the chain in derived channels (V1 needed “circle speed” patches to recover intuition)

- **V2 interpretation:** relative rotation is the **canonical pose substrate**: a node rig where the head rotates relative to the hand, etc.

### Plane

- Plain meaning: “which 2D plane the motion is happening in” (wall/wheel/floor).
- Abuse modes:
  - treated as implicit camera orientation or a renderer setting (common tool pitfall; VS3D “bent/twist” suggests late binding)

- **V2 interpretation:** plane is a **first-class segment attribute**: a segment is planar internally; 3D is embedding + plane transforms.

### Reference frame

- Plain meaning: which coordinate system you’re measuring in (earth/audience vs body/hand).
- Abuse modes:
  - CAPs references “earth/audience reference” but doesn’t specify transforms formally

- **V2 interpretation:** explicitly name frames in the spec: `plane_frame`, `hand_frame`, `node_local`. Frame transforms must be explicit and testable.

### Continuity points / nexus points

- Plain meaning: seam locations where segments join; also “natural” points for transitions (cardinals, cusps, symmetry points).
- Abuse modes:
  - “best effort” continuity that silently mutates intent (VS3D warning)

- **V2 interpretation:** boundaries are **typed contracts**, validated at compile time; solver allowed only as an explicit, deterministic compilation step with failure modes.

---

## 3. Motion representation taxonomy

### Harmonic (QFT lens)

- Good at: describing steady-state families via frequency ratios + phase offsets; explaining “why petals happen”; decomposing motion.
- Breaks down at: transitions, non-repeating phrases, boundary semantics (“start here, end there, with this continuity”).
- V2 role: **generator + analysis view**, never canonical runtime.

### Geometric / symmetry constraints

- Good at: selecting timing/direction relationships that guarantee visible symmetries; teaching.
- Breaks down at: numeric completeness (won’t give exact speed ratios/petal counts); can leak embodiment/gravity talk.
- V2 role: **constraint generator + overlay**.

### Node-relative circular motion (rig substrate)

- Good at: composability, segment-local reasoning, sequencing, deterministic evaluation.
- Breaks down at: human naming (“what trick is this?”) and higher-level pattern identity (needs overlays).
- V2 role: **canonical runtime**.

### Symbolic / notational systems (CAPs, VTG)

- CAPs good at: splitting motion into harmonic vs modulus; providing compact generator parameters; introduces partial-cycle vocabulary (`d`) that maps directly to segmentation.
- CAPs breaks at: cyclic obsession + weak boundary contracts + reference-frame ambiguity.
- VTG good at: transition grammar; describing “easy/hard” changes as discrete relation flips.
- VTG breaks at: cannot replace motion representation (it’s not a trajectory model).
- V2 role: CAPs = generator/teaching; VTG = transition overlay.

### Parametric math functions (Cartesian-first)

- Good at: smooth continuous generation, compact equations, analysis.
- Breaks down at: sequencing becomes “solve coefficients” instead of “compose movement units”; boundaries become post-hoc; continuity becomes fragile external machinery.
- V2 role: derived reconstruction view only (from canonical motion), not authored truth.

---

## 4. Why QFT is the best thinking layer (but not the runtime)

QFT is best understood here as: **a frequency-ratio + phase-offset language for steady-state circular motion**—a coordinate system on motion-space that makes families, symmetries, and equivalences legible.

Why it’s cognitively efficient:

- It matches what spinners perceive: “how fast is the hand vs head,” “where are the cusps,” “what symmetry does this lock into.”
- It allows “addition” (superposition-ish thinking): add a harmonic, adjust a phase, get a new family.

Its baked-in assumptions (must be quarantined):

- **Periodicity / infinite repetition**: QFT treats patterns as if closure is the norm.
- **Boundary amnesia**: it doesn’t specify what happens at the moment of switching patterns.

Firm V2 rule: QFT descriptors should **compile into segments**; they should not _be_ segment truth.

---

## 5. Mapping QFT → V2 canonical engine

Pipeline (conceptual, compile-time vs runtime separation):

**QFT descriptor (compile-time input)**
→ **piecewise segment specification (compile-time artifact)**
→ **circular node rig parameters (runtime truth)**
→ **time-evaluable motion (runtime evaluation under single transport)**
→ **optional analytic reconstruction / descriptors (post-hoc overlays: QFT view, symmetry labels, relation signature)**

Be explicit about what lives where:

- Fixed at runtime (canonical state):
  - segment duration
  - per-node radii
  - per-node angular velocity (or equivalent)
  - per-node phase at segment start
  - plane embedding

- Variable at compile-time (inputs/constraints):
  - desired harmonic ratios (petal count families)
  - desired symmetry class
  - desired relation signature / driving style
  - desired boundary continuity contract

- Validation points:
  - compile-time: boundary contracts + plane transitions + “constraint satisfiable?”
  - runtime: deterministic evaluation only (no “fix-ups”)

This is the explicit inversion of the V1 failure mode where sequencing leaked into coefficient-solving and patches.

---

## 6. Circular node rig as the canonical pose model

Minimum required nodes (canonical):

- **Hand node**: rotation + radius in the plane frame
- **Head node**: rotation + radius **relative to hand**

Optional extension nodes (plugin-level, not required for V2 core):

- intermediate grip points, tether knots, staff endpoints, etc. (VS3D-style recursive chains), but only if they compile down to the same evaluation contract.

What nodes are allowed to express:

- kinematic parameters (angles/velocities/radii), and plane embedding.

What nodes must _not_ encode:

- “this is a flower / cateye / extension” (those are overlays/generator labels), consistent with “derived descriptor, never stored as truth.”

Why this substrate wins (hard claim):

- It makes boundaries native and sequencing structural, whereas Cartesian-first makes boundaries external and transitions math-heavy.
- It matches CAPs’ O→M→E compound-circle model directly (hand/head chain).
- It aligns with VS3D’s rig insight but avoids VS3D’s “move-array timeline” and “best effort continuity” pitfalls.

---

## 7. Piecewise-first sequencing and transitions

Across the corpus, authors rely on piecewise structure even when they don’t name it:

- CAPs explicitly introduces “take only part of the full cycle” via `d` (division), which is basically a segment fraction.
- Symmetry geometry treats assemblies (square as multiple segments) with configuration changes between segments.
- V1 post-hoc continuity propagation demonstrates the pain of not making boundaries first-class.

Translate into explicit V2 rules:

### Segment boundaries (always explicit)

Each segment has:

- duration
- plane embedding
- per-node params (radii, angular velocities, start phases)
- entry/exit pose

### Boundary constraints (compile-time contracts)

- Position continuity: required (unless explicitly “teleport” segment)
- Tangent continuity: optional policy (choose per boundary)
- Phase continuity: optional policy (choose per node)

### Failure modes (no silent “fit magic”)

- If constraints cannot be satisfied: compilation fails with diagnostics (don’t mutate author intent). This is explicitly the anti-VS3D “best effort fallback that mutates intent” stance.
- If solver is used (fit/refit/realign analogue), it is a deterministic compile step with explicit policy selection.

UNCONFIRMED but likely important: the “natural transition points” (cardinals/cusps) should be formalised as **candidate boundary selectors** for compilation and UI snapping, rather than implicit “good taste.” (This is consistent with your V1 experience where seam behaviour had to be inferred/solved.)

---

## 8. Planes and early 3D thinking

Synthesis to adopt (firm):

- Motion is **planar internally** (segment-local truth).
- A **plane is an explicit object** in segment schema, not renderer state.
- 3D motion is **a sequence of planar segments + plane transforms**.

This matches the “bent/twist as optional 3D extension” idea in VS3D, but you should invert it: plane is first-class in V2 core, while full 3D rig chains remain optional.

Plane transitions:

- Must occur at explicit **nexus points** (segment boundaries), never mid-segment.
- Must declare the transform: either
  1. rotate plane frame around a line of intersection constraint (nexus line), or
  2. snap to canonical planes (wall/wheel/floor) with explicit orientation metadata.

Reason this scales better than full 3D parametrics: it preserves **segment locality + determinism** and keeps the teaching overlays meaningful (“this is wall-plane extension”) instead of dissolving into opaque 3D curves.

---

## 9. Relationship to existing frameworks

### QFT

- Contributes: harmonic lens, phase/ratio thinking; descriptive universality for steady-state.
- Cannot replace: sequencing, boundaries, transport semantics.
- Lives in V2 as: generator + analysis view.

### CAPs

- Contributes: explicit O→M→E node chain alignment; harmonic vs modulus separation; partial-cycle knob (`d`).
- Cannot replace: boundary continuity contract; non-cyclic sequencing; clear frame conventions.
- Lives in V2 as: segment generator + teaching overlay.

### VTG

- Contributes: transition grammar; discrete timing/direction state thinking.
- Cannot replace: numeric motion representation.
- Lives in V2 as: transition overlay and constraint language over segment boundaries.

### Symmetry-based geometry

- Contributes: constraint picker by symmetry class; assemblies as piecewise rule-changes; “remarkable points” overlay idea.
- Cannot replace: numeric derivation (petal counts/speeds), transport model.
- Lives in V2 as: generator + teaching overlay.

### VS3D

- Contributes: node chain idea; solver-based endpoint completion; recipes as generator vocabulary; “one runtime pose stream → many renderers.”
- Cannot replace: clean separation of math/transport/ui; determinism without silent fixups.
- Lives in V2 as: cautionary architecture + optional generator layer patterns, not canonical truth.

### V1 Cartesian parametric system

- Contributes: deterministic engine/test discipline; beat-domain transport separation; useful invariant vocabulary (`head = arm + rel`).
- Cannot replace: sequencer-first authoring without heavy constraint solving; boundaries and transitions are structurally awkward.
- Lives in V2 as: “what not to rebuild,” plus a source of invariants/tests.

---

## 10. Teaching and documentation implications

Strategy: one page per framework, but each page is explicitly a **translation guide** into the canonical segment/node/plane model.

Suggested research/blog section layout (each page includes “sim inserts”):

1. **FOUNDATIONS** (this doc): the canonical engine + compilation pipeline.
2. **QFT lens**: harmonic ratios + phase offsets; “compile to segment”; “decompose any segment back into QFT view.”
3. **CAPs lens**: Theta/Rho as generator parameters; `cycleFraction` (renamed `d`) as segment duration scaling; “assembly over time.”
4. **Symmetry geometry lens**: pick symmetry → propose constraints → compile; “remarkable points” as tracked-point overlays.
5. **Hybrid relation lens**: compute relation signatures; driving styles as UI navigation/tags.
6. **Transitions (VTG-like)**: boundary grammar; why some changes are small/large; diagnostic tooling.

Each page must show:

- one canonical motion clip
- the framework’s view of it
- how to go back (constraints/generator params)

That “single motion, many coordinate systems” idea is the core teaching differentiator.

---

## 11. Underlying math engine recommendations

Hard recommendations, aligned with the corpus:

### Canonical state

- **A segment-local rig state**, not a global parametric function.
- Store: per-node radii + angular velocities + start phase, plus plane embedding.

### Time representation

- A single transport that supports play/pause/seek/scrub/loop regions.
- Beat-domain is valid and musically aligned (V1 proved this), but must be explicitly separated from pose semantics.

### Evaluation

- Deterministic evaluation of segment-local state under the transport timebase.
- No runtime “continuity fixing.”

### Determinism preservation

- All solvers are compile-time only, deterministic, and policy-selected.
- Labels/classifications (symmetry class, relation signature, driving style) are computed from evaluated state with explicit tolerances to avoid flicker.

### “Math functions derived from motion, not vice versa”

This is the direct inversion of V1’s control-topology trap: don’t force authoring to be coefficient solving; derive analytic descriptions afterwards.

---

## 12. How to start speccing V2 (practical plan)

1. **Write docs first**
   - `/research/FOUNDATIONS.md` (this) as the canonical model + compile pipeline.
   - `/research/CONVENTIONS.md`: phase-zero + handedness + plane frames + sign conventions (explicitly fix the “phase reference ambiguity” CAPs/hybrids warn about).
   - `/research/BOUNDARIES.md`: boundary contract types, solver policies, diagnostics (anti-“best effort”).

2. **Define schemas next (conceptually, no code yet)**
   - Segment schema: duration, plane, node params, entry/exit pose, boundary contract.
   - Node schema: hand/head minimal, extension nodes optional.
   - Plane schema: wall/wheel/floor plus arbitrary plane frame.
   - Transport schema: single timebase, deterministic sampling.

3. **Prototype early (architecture validation prototypes, not features)**
   - A minimal segment compiler that can ingest:
     - a QFT-style descriptor (ratio + phase) → emits one segment
     - a CAPs descriptor `(Theta1, Theta2; Rho1, Rho2; cycleFraction)` → emits one segment

   - A boundary validator that can fail loudly with diagnostics.

4. **Defer (on purpose)**
   - Embodiment/feasibility/wrap constraints: CAPs includes hand/finger wrap feasibility lists; treat as teaching/optional validation later, not core.
   - Rich 3D node chains: keep as extension after planes + transitions are solid.
   - Any attempt to make hybrid relation math a “second truth” about state (must stay derived).

5. **Architectural mistakes to avoid (explicitly backed by corpus)**
   - Reintroducing hidden derived channels that obscure authored intent.
   - Letting transport/playback rules leak into pose definitions.
   - Multiple competing continuity policies without explicit selection.
   - “Best effort” continuity fallback that mutates intent (VS3D pitfall).

UNCONFIRMED (flag to resolve early): a single, repo-wide convention for **phase-zero direction and handedness** across wall/wheel/floor, such that “same/opposite” relation signatures are stable and CAPs/QFT generators don’t disagree. (The corpus repeatedly gestures at this problem without giving a complete shared convention.)
