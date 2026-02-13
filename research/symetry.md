## A) What this document is _really_ about

This is a **symmetry-first way of thinking about spinning**, where you start from a _target geometric form_ (segment / triangle / square / assemblies), identify its **symmetry point/axes**, and then choose **arm + poi rotation configurations** that naturally realise that symmetry. It’s less “name the trick” and more “what symmetries does this drawing have, and what spinning configuration matches them?”.

Core intent: _use geometry as the generator_, then derive spinning choices from symmetry.

---

## B) Motion representation model

**Type:** geometric + symbolic + configuration rules (not harmonic, not Fourier-like).

- Motion isn’t encoded as a formula; it’s encoded as:
  1. a **path/shape** you want the hands to trace, and
  2. a **rule table** that maps symmetry type → “what arms do” + “what poi timing/direction do”.

- Time is **implicit** (“same time” vs “split time”, sometimes “1/x time”) rather than an explicit segment timeline.
- Boundaries are partly implicit (e.g., “segment to another” inside an assembly suggests _piecewise_ rotation config changes).

**Verdict:** it’s _conceptual scaffolding_, not a core computational representation.

---

## C) Mapping to your circular node rig

### What maps cleanly

- **Hand node**: “hands draw the form” is directly your hand-path node (radius + phase).
- **Head node**: “poi rotate…” corresponds to your head’s angular velocity and phase relative to the hand.
- **Element-like timing/direction**: the document’s “same direction / opposite direction” and “same time / split time” are exactly the discrete relationship layer you already built intuition for.

### What’s missing / abstract

- It doesn’t define _numbers_ (speeds, petal counts) directly; it defines **constraints** on relative timing/direction that _tend to_ produce the intended symmetry.
- It doesn’t define a canonical coordinate frame (it’s “drawing-based”), so you’d need conventions for:
  - what counts as “vertical axis” in your wall-plane coordinates,
  - what “beginning on two opposite points” means as an initial phase pair.

### Lossy part

- “Draw triangles/squares/assemblies” is _a human intention_; your rig can represent it, but only once you choose the discrete sampling/segment boundaries.

---

## D) Fit with piecewise-first sequencing

**Suitability: HIGH** (as a _generator/constraint system_ for segments), **LOW** (as canonical runtime math).

Why high: it explicitly suggests **changing rotation configuration per sub-shape** in an assembly (“square seen as four segments… config changes from a segment to another”). That’s basically “piecewise constraints along a path.”

Why low: it doesn’t specify a transport-friendly timeline model; you still need your segment compiler/validator to turn “segment A uses rule X” into exact oscillator parameters.

---

## E) Time and transport implications

- Time language is qualitative: **same time vs split time**, **1/x time**, “point to point”, “linear hybrid”.
- This is compatible with a single transport _if_ you treat these as **segment recipes** that compile into deterministic params, rather than something evaluated directly.

So: compatible, but only through your “compile → evaluate” pipeline.

---

## F) Strengths worth importing (“steal this”)

1. **Symmetry classifier as UX**
   Let users pick a target symmetry (double / central / vertical / horizontal / diagonal) and have the UI propose the relationship constraints automatically. The doc literally provides rule examples (see next section).

2. **Assemblies imply piecewise rule changes**
   This is a clean conceptual bridge from “pattern” to “sequence of constraints”.

3. **“Remarkable points” idea**
   It suggests swapping which point on the prop you “track” (head vs centre vs another point) to get semi/total isolation variants. That’s a _great overlay_ on a node rig.

---

## G) Limitations and danger zones

- **Not numerically complete**: it won’t tell you the exact head speed ratios needed to get a 4-petal vs 3-petal; it tells you symmetry-compatible coordination. You still need QFT/recipe-style numeric derivation elsewhere.
- **Gravity / embodiment leaks**: it acknowledges some figures aren’t feasible “because gravity doesn’t allow us…” across props. That’s a reminder this isn’t a physics model, but also that feasibility constraints aren’t encoded here.
- **“Point to point” randomness** doesn’t mesh with deterministic sequencing unless you treat it as a procedural generator with a seed.

---

## H) Recommended role in V2

**Recommended role: segment generator + teaching/analysis overlay.**

- **Not** canonical core representation.
- **Yes** as: “Given a drawn form + symmetry type, generate candidate arm/poi relation constraints, then compile into exact segment params.”

This aligns with your rule: higher-level spinner language stays optional and must not leak into core.

---

## I) Relationship to existing frameworks (QFT / VS3D / VTG / V1)

### vs QFT

- QFT is **numeric/harmonic** (“what function produces this motion?”).
- This doc is **geometric/symmetry** (“what coordination produces this symmetry?”).
  They complement: QFT can fill in _the numbers_ once symmetry/structure is chosen.

### vs VS3D

- VS3D is a **rig + move list + solver continuity**.
- This doc is a **constraint picker**: choose relation constraints based on symmetry.
  You could imagine VS3D-style “recipes”, but driven by symmetry classification rather than named tricks.

### vs VTG

- VTG is **transition theory between discrete arm/poi timing states**.
- This doc is **why those states create certain symmetries** in drawn forms.
  It’s basically a different lens on the same discrete relationship space.

### vs V1 Cartesian parametrics

- V1: “encode the curve directly.”
- This: “encode the symmetry/coordination that yields the curve.”
  Much better fit for sequencing because it naturally becomes “segments with different coordination rules.”

---

## J) Design takeaways (rules for V2)

1. **Make “symmetry constraints” first-class overlay objects**
   A small typed descriptor like: `{symmetry: vertical | horizontal | central | double, handPath: polygon/segment/… , assemblyPieces: [...] }` that compiles into your canonical segment params.

2. **Exploit assemblies as explicit segment boundaries**
   If an assembly is “four segments”, treat it as 4 segments with potentially different relation modes.

3. **Add a “tracked point” switch (head vs centre) as a visual mode**
   Don’t bake isolation into core math; make it a rendering/rig overlay (“remarkable points”).

4. **Guardrail: don’t let symmetry logic become the only truth**
   Symmetry is a helpful constraint system, but your engine should still be able to represent “ugly” motions that don’t map cleanly to a symmetry label.

5. **Sequencer implication**
   This document quietly argues for your piecewise-first direction: “rotation configuration changes from a segment to another.”
   That’s basically a spec for “compile constraints per segment, then validate continuity”.

---

### A concrete nugget (rule table you can reuse)

The doc gives example mappings from symmetry → poi timing/direction choices:

- “Double effect”: both hands draw the same thing; poi rotate same direction, same time.
- “Central symmetry”: hands start on opposite points; poi rotate same direction in split time.
- “Vertical symmetry axis”: hands use vertical axis; poi rotate opposite direction, same time.
- “Horizontal symmetry axis”: hands use horizontal axis; poi rotate opposite direction, split time.

That’s extremely close to your VTG-element grid—just expressed from the _geometry outward_ rather than the _timing inward_.

If you want the next step, the useful move is to turn that rule table into a **tiny “symmetry overlay spec”** that compiles into your canonical segment state (without changing engine math).
