## Beyond Olive’s Hybrid Math → V2 mental model mapping

(Interpreting the “provided research document” as **Beyond Olive’s Hybrid Math** by AlienJon.)

---

## A) What this document is really about

This is a proposal for a **relationship-first** description of poi patterns: instead of naming “hybrids” as special cases, treat everything as **binary relations** between moving parts (hands and poi) in a simplified “configuration space.”

The goal is to make hybrids less mystical by:

- normalising patterns to **unit circle, one-beat** forms (so you can compare patterns as “the same kind of thing”),
- then classifying them via a small set of **pairwise relations** (same/opposite orientation; same/opposite phase).

Assumptions:

- Mostly planar circular motion (implicitly “spin plane”).
- Timing reduced to **same vs opposite** (no quarter-time, polyrhythm yet).
- Embodiment is partially acknowledged (vectors “through the hand” / “through the head”), but not mechanically constrained.

---

## B) Motion representation model

**Model type:** _symbolic / relational classifier_ sitting on top of circular motion.

- Motion isn’t represented as a full time function; it’s represented as **labels derived from relations**.
- Time is **implicit** (phase parity only: same/opposite).
- Boundaries are not first-class (it’s describing steady patterns rather than segments).
- It leans global: “one-beat unit circle” as the canonical comparison frame.

---

## C) Mapping to your circular node rig

Your rig primitives: (hand node) → (head node), with radii, angular speeds, phases.

This doc’s primitives map like this:

- “Vector through the hand, away from pivot” ≈ **hand node angle phase reference** (a direction-bearing vector).
- “Vector through the head, away from pivot” ≈ **head node angle phase reference**.
- “Orientation (spin) same/opposite” ≈ sign of angular velocity (or relative sign between two nodes).
- “Phase (timing) same/opposite” ≈ phase difference ∈ {0, π} (mod 2π), ignoring other offsets.

The doc enumerates relations across these pairs: Lhand↔Lpoi, Rhand↔Rpoi, Lpoi↔Rpoi, Lhand↔Rhand, plus cross relations Lhand↔Rpoi and Rhand↔Lpoi.

**What fits naturally**

- This is basically a **derived “pattern fingerprint”** you can compute from your state: signs + phase parity across key pairs.

**What’s missing / awkward**

- It doesn’t encode magnitudes (e.g. petals/head speed ratios) except indirectly via the “one-beat” normalisation.
- It deliberately ignores richer timing (quarter offsets, non-integer ratios), which your engine will definitely need.

---

## D) Fit with piecewise-first sequencing

**Suitability: Medium (as a descriptor), Low (as a segment model).**

- As a segment model: it doesn’t specify _how_ angles evolve; only _how they relate_ in a symmetric steady pattern.
- As a piecewise descriptor: it can be used to **label each segment** and define constraints (“segment must satisfy relation set X”).

Where it helps sequencing:

- It gives you a clean way to detect “we are in a driving style family” and reason about transitions in terms of relation flips.
- But it doesn’t provide a continuity solver or boundary semantics.

---

## E) Time and transport implications

Time is treated as **phase parity** (same vs opposite), and “one beat = one cycle” framing.

Compatibility with single transport:

- Fine, because this isn’t a transport system; it’s metadata derived from state.
- You can compute these relations at any transport time `t` or per-segment canonical pose.

Main limitation: it assumes steady repetition; it doesn’t tell you what to do mid-transition.

---

## F) Strengths worth importing

1. **Relations-as-configuration-space** framing: a useful mental model for “why these look related.”
2. A compact set of **pairwise relations** that go beyond the usual “hand vs hand” and “poi vs poi,” by adding cross relations.
3. The “unit circle one-beat” normalisation lens, which tends to make families of patterns clearer (at least pedagogically).
4. The “driving styles” table for **same-hand vs same-poi relationships**:
   - [0,0]=extension, [0,1]=isolation, [1,0]=vertical cat eye, [1,1]=horizontal cat eye

That “driving styles” bit is directly UI-friendly.

---

## G) Limitations and danger zones

- **Binary timing is too coarse**: it explicitly postpones quarter-time and polyrhythms.
- Risk of “classification drift”: your engine uses continuous angles; mapping to {same/opposite} needs tolerances and conventions, or you’ll get flickery labels near boundaries.
- It’s not a generator: it won’t produce parameters like head speed ratios, petals, radii.
- It gestures at extensibility (stalls, linear, compound timings) but doesn’t define the extension mechanism.

**Core warning:** don’t let this become a second competing “truth” about state. It should be derived, not stored.

---

## H) Recommended role in V2

**Descriptive / analytical overlay** (plus optional UI navigation aid).

Concretely:

- Compute a **relation signature** from any state (or segment).
- Use it to:
  - label segments (“this is extension/isolation/cat-eye family”),
  - filter/search/organise pattern libraries,
  - constrain generators (“emit any segment matching signature S plus petal count N”).

Not recommended as:

- canonical internal representation,
- primary generator (too under-specified),
- transition solver.

---

## I) Relationship to existing frameworks

**Vs QFT**

- QFT is a _generative/representational_ language for shapes over time (harmonics, phase, amplitude).
- This doc is a _classifier_ based on parity relations.
- They’re complementary: QFT can generate; this can label the generated result.

**Vs VS3D**

- VS3D gives a rig + move/time system.
- This gives a way to describe _what kind of coordination_ a move exhibits (a tag system for “configuration space symmetry”).

**Vs VTG**

- VTG is an explicit transition theory for element switching and hand timing/direction.
- This doc is more abstract: relations across more pairs (including cross-hand/poi).
- VTG is operational; this is taxonomic.

**Vs your V1 Cartesian parametric**

- V1 tries to directly encode trajectories; this doc tries to encode **relationships** that stay stable across many trajectories.

---

## J) Design takeaways for V2

### 1) Concrete design rules

- Treat “driving style” and “relation signature” as **computed descriptors**, never stored as canonical state.
- Define a stable phase-reference convention (your earlier “phase 0 confusion” problem): relation classifiers will explode without it.
- Make tolerance/quantisation explicit (when is phase “opposite”?).

### 2) What this pushes you to do earlier

- Formalise the **taxonomy layer**: a small module that takes a state/segment and returns:
  - pairwise relation bits,
  - named driving style tags (extension/isolation/cat-eye).

- Decide which pair relations matter for V2 sequencing use-cases (you may not want all a–f initially).

### 3) Risks of overfitting to this model

- You end up trying to force rich motion (quarter offsets, polyrhythms, plane changes) into a binary grid and losing expressiveness.
- You accidentally bake “unit-circle one-beat” assumptions into core, making non-normalised segments awkward.

---

If you tell me which doc you actually want analysed next (Spinning & geometry vs Math of CAPs vs Spherculist Manifesto), I’ll run the same A–J mapping for that one.
