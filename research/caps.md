Below is how **“The Math of CAPs” (Zaltymbunk)** fits into your V2 mental model (piecewise-first + circular node rig + sequencer-first).

---

## A) What this document is really about

This doc is trying to formalise a spinner’s intuition that a “pattern” is a **cyclic curve** determined by:

- a **harmonic component** (how many turns / frequency ratios), and
- a **modulus component** (radii/lengths).

Then it introduces **CAPs (Continuous Assembly Patterns)** as _complex patterns built by assembling multiple “elementary patterns” in sequence_, but still cyclic overall.

Key assumption: you can treat lots of poi motion as **compound circles** (shoulder→hand, hand→head).

---

## B) Motion representation model

- Representation: **geometric + harmonic** (compound circular motion), expressed via parameters rather than sampled points.
- Time: **implicit** (cycles/turn counts; “beats” not central).
- Boundaries: **not first-class**; but CAP assembly implicitly introduces _segment boundaries_ (“take only part of the full cycle” using a division parameter).
- Global vs local: mostly **global/cyclic**, but CAPs are a bridge toward **piecewise composition** (serial assembly of elementary patterns).

Classification: **harmonic param model with a proto-piecewise assembly concept**.

---

## C) Mapping to your circular node rig

The document’s core model maps cleanly to a **2-node rig**:

- `O` shoulder, `M` hand, `E` head/extremity.
- Two circular components:
  - shoulder→hand circle: `(Theta1, Rho1)`
  - hand→head circle: `(Theta2, Rho2)`

In your node language:

- `hand` node: `hand.va = Theta1`, `hand.r = Rho1`
- `head` node relative to hand: `head.va = Theta2`, `head.r = Rho2`
- phase/orientation exists but is under-specified in this doc (it gestures at starting position / rotation).

What’s missing/awkward:

- A clear, canonical treatment of **phase reference** and **initial orientation** beyond “other starting position” examples.
- It mixes “earth/audience reference” talk with parameters, but doesn’t turn that into a clean transport concept.

---

## D) Fit with piecewise-first sequencing

Suitability: **High** (conceptually), with one caveat.

Why high:

- CAPs are literally “**elementary patterns assembly**” and explicitly contrast this _serial_ process with “hybrids” as the _parallel_ two-hand process.
- It introduces an explicit **partial-cycle parameter** `d` (“division”) to take only a fraction of a pattern’s full cycle. That is basically “segment duration as a fraction of a cycle.”

Caveat:

- CAPs still want the end result to be cyclic and “pattern-like” (closed), whereas your sequencer wants **open-ended timelines** and **explicit boundaries with constraints**.

Net: this doc strongly supports your “piecewise-first” direction—CAPs are a conceptual ancestor.

---

## E) Time and transport implications

Time is not expressed as “seekable t”; it’s expressed as:

- number of turns (`Theta1`, `Theta2`) per cycle,
- plus fractional cycle `d`.

To make it transport-compatible:

- you choose a segment duration in beats or seconds,
- interpret `Theta` as cycles-per-segment (or cycles-per-beat),
- and treat `d` as duration scaling.

This is compatible with a single transport, but only if you **promote time to first-class** (which your V2 plan already does).

---

## F) Strengths worth importing

1. **Clean separation: harmonic vs modulus**
   - Harmonics (turn counts) + radii/lengths is a very maintainable mental split.

2. **Proto-piecewise vocabulary (`d` division)**
   - Explicit fraction-of-cycle is a nice authoring knob for segments.

3. **Serial vs parallel distinction**
   - CAPs (serial assembly) vs hybrids (parallel two-hand superposition) is a useful conceptual decomposition for your UI later.

4. **Node rig alignment**
   - The O→M→E model is exactly your node chain intuition.

---

## G) Limitations and danger zones

1. **Cyclic obsession**
   - Everything is framed as closed curves; sequencing wants “segments that may not close.”

2. **Weak boundary semantics**
   - `d` exists, but there’s no explicit boundary continuity contract (position/velocity/phase constraints are not formalised).

3. **Feasibility/wrap constraints are hand-wavy for V2**
   - The document lists wrap-dependent feasible `Rho2` fractions (finger wraps etc.).
     That’s interesting pedagogically, but you probably don’t want “body physics/feasibility” to creep into the core engine early.

4. **Reference-frame ambiguity**
   - “earth/audience reference” appears, but without a formal frame transform spec.

---

## H) Recommended role in V2

**Recommended role: segment generator + teaching/analysis overlay.**

- As **core**, it’s too cycle-centric and under-specifies boundaries.
- As a **generator**, it’s excellent: `(Theta1, Theta2; Rho1, Rho2; d)` can emit a segment for your node-rig engine.
- As **teaching/analysis**, it gives you great language: rosettes, cycloids, assembly vs hybrid.

---

## I) Relationship to QFT, VS3D, VTG, V1

- **vs QFT:** very aligned. This doc’s “harmonic component + modulus” is basically the same split QFT leans on, but expressed in a 2-circle compound model.
- **vs VS3D:** strongly compatible. VS3D’s node chain is a generalisation of O→M→E; CAPs correspond to sequencing multiple move-generators.
- **vs VTG:** orthogonal. VTG is transition theory across hand/poi timing states; CAPs are about composing curve segments. VTG could become one family of CAP generators, not the other way around.
- **vs V1 Cartesian parametrics:** this doc is basically a justification for abandoning Cartesian-first thinking: it keeps the representation in **circular primitives** (more local, more composable).

---

## J) Design takeaways

1. **Make “harmonics” and “modulus” first-class in your V2 generator layer** (not necessarily in canonical state).
2. **Adopt `d` (fraction-of-cycle) explicitly as a segment authoring concept**, but rename it to something less cryptic (e.g. `cycleFraction`).
3. **Keep CAP assembly as the conceptual model for your sequencer**: a sequence is literally “elementary pattern segments assembled”.
4. **Do not import feasibility/wrap constraints into core** yet; treat them as optional validation overlays later.

Risks of overfitting:

- forcing everything to be cyclic/closed,
- treating “pattern definitions” as more real than timeline semantics.

---

If you want to go one step deeper next: the doc implicitly defines two important families—**rosettes (equal radii)** and **cycloids (speed-matching condition)**—and those are perfect candidates for _named generators_ that emit node-rig segments (still no code, just a generator spec).
