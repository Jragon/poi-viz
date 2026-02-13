Below is a **single synthesis page** you can drop into the **`/docs/research/`** section of your V2 repo. It is written as a _research + teaching manifesto_, not a spec, and it explicitly integrates **QFT, CAPs, symmetry geometry, hybrid/relationship math, VS3D lessons, and your V1/V2 architectural direction**.

This is meant to be a _living page_ that future blog-style deep dives can link out from.

---

# Toward a Unified Theory of Poi Motion

_A research synthesis for simulation, sequencing, and teaching_

## Why this project exists

Poi has an unusually rich body of informal theory.

Over the years, different authors have tried to answer different questions:

- **What is a pattern, mathematically?** (QFT)
- **How do we assemble patterns from simpler pieces?** (CAPs)
- **Why do certain timing/direction relationships produce clean geometry?** (Symmetry geometry, VTG)
- **How do we classify hybrids and driving styles without mysticism?** (Hybrid / relationship math)
- **How do we actually simulate this on a computer?** (VS3D, various visualizers)

Each of these frameworks is insightful — but incomplete in isolation.

The goal of this simulator is **not** to replace these theories, but to:

1. place them on top of **one shared motion engine**, and
2. allow translation _between_ them, so the same motion can be understood in multiple ways.

If successful, this becomes:

- a **sequencer-first simulator** for exploring motion, and
- a **teaching and research tool** for understanding poi more deeply than any single framework allows.

---

## The core insight: poi motion is relational, not Cartesian

The biggest lesson from V1 (and many earlier tools) is this:

> Encoding poi motion directly as `x(t), y(t)` curves makes sequencing, transitions, and understanding far harder than necessary.

Every successful theory we studied agrees on one thing:

- Poi motion is fundamentally **circular and relational**
- Patterns arise from **relative angular motion** between frames
- Meaning lives in **ratios, phases, and symmetries**, not absolute coordinates

This leads to the architectural foundation of V2.

---

## The V2 foundation: one canonical motion model

### 1. Circular node rig (core engine)

At the lowest level, motion is represented as a **small chain of circular nodes**:

- a _hand node_ (rotation + radius)
- a _head node_ rotating relative to the hand

Everything else — flowers, cateyes, hybrids, CAPs, VTG elements — emerges from:

- angular velocities,
- phase offsets,
- radii,
- and how these change **piecewise over time**.

This aligns with:

- QFT’s harmonic framing,
- CAPs’ compound circles,
- VS3D’s recursive node model,
- and spinner intuition.

### 2. Piecewise-first sequencing

Instead of assuming infinite repetition, **motion is explicitly segmented**.

Each segment has:

- a duration,
- fixed parameters (angular speeds, phases, plane),
- and explicit entry/exit conditions.

This is the key difference between:

- _describing a pattern_, and
- _sequencing patterns into movement_.

All higher-level systems compile **into segments**, never directly into runtime math.

---

## How the major theories fit together

### QFT — _the harmonic lens_

**What it gives us**

- A principled way to think about patterns as interacting angular frequencies
- Clear language for harmonics, phase, symmetry, repetition
- A near-universal descriptive system for steady-state patterns

**What it is not**

- A sequencer
- A boundary-aware system
- A transport model

**Role in V2**

> QFT is a **segment generator and analytical lens**, not the runtime representation.

In practice:

- QFT descriptors compile into node-rig parameters for a segment
- The simulator can _display_ QFT decompositions of any motion
- Users can move freely between “QFT view” and “motion view”

---

### CAPs — _assembly over time_

**What it gives us**

- The idea that complex patterns are **assembled from elementary pieces**
- Explicit use of _partial cycles_ (fractions of repetition)
- A clean separation between harmonic structure and radius (“harmonic vs modulus”)

**What it lacks**

- Explicit continuity contracts
- Open-ended timelines
- Clear transport semantics

**Role in V2**

> CAPs map almost perfectly onto **piecewise sequencing**.

In V2:

- CAP-style descriptors become **segment assembly tools**
- “Division of a cycle” becomes a first-class segment parameter
- CAPs stop being “closed curves” and become _composable motion units_

---

### Symmetry & geometry (Spinning & Geometry)

**What it gives us**

- A geometry-first explanation of why patterns look the way they do
- A direct mapping between **symmetry axes** and **timing/direction relationships**
- A bridge between visual intuition and motion parameters

**What it is not**

- A numeric system
- A transport model
- A generator on its own

**Role in V2**

> Symmetry logic becomes a **constraint and teaching overlay**.

In practice:

- Users can choose a target symmetry
- The simulator proposes compatible arm/poi relationships
- The same motion can be explained geometrically _after the fact_

This is ideal for teaching.

---

### Hybrid / relationship math (Beyond Olive’s Hybrid Math)

**What it gives us**

- A clean way to classify patterns by **pairwise relationships**
- A vocabulary for “driving styles” without mysticism
- Insight into why many patterns feel closely related

**What it lacks**

- Magnitudes (petals, speeds)
- Boundary semantics
- Rich timing (quarters, polyrhythms)

**Role in V2**

> A **derived descriptor layer**, never stored as truth.

In practice:

- The simulator computes a “relation signature” for any segment
- This allows tagging, searching, grouping, and comparison
- It helps explain _why_ two patterns feel similar

---

### VTG and element theory — _transition logic_

**What it gives us**

- A discrete view of timing/direction states
- A powerful explanation of why transitions feel “easy” or “hard”
- A human-friendly map of change points

**What it is not**

- A full motion representation
- A generator for arbitrary patterns

**Role in V2**

> VTG becomes a **transition grammar** layered on top of segments.

Segments define motion; VTG defines:

- which parameter changes are “small”
- where transitions are musically and physically plausible

---

## Why one engine matters (and why this is teachable)

Because all of these systems compile into the same underlying representation, the simulator can:

- show **one motion**
- then explain it as:
  - a QFT decomposition,
  - a CAP assembly,
  - a symmetry configuration,
  - a VTG element,
  - a relationship signature

This is the real teaching breakthrough.

Instead of arguing about which theory is “right”, we can show:

> _They are different coordinate systems on the same motion space._

---

## The simulator as a teaching tool

The long-term vision is not just a visualizer, but a **guided exploration environment**:

- Blog-style research pages for each framework
- Interactive embeds showing:
  - “this is what the math means”
  - “this is how the motion changes if you tweak it”

- Ability to _translate_ between representations live

This modernises older documents by:

- grounding them in a shared engine,
- removing ambiguity around time and phase,
- and letting learners _see_ instead of memorise.

---

## A final constraint (and a guardrail)

The core engine must remain:

- small,
- deterministic,
- and boring.

All beauty lives **above** it.

Every time a higher-level system tries to become “the truth”, it must be pushed back into:

- a generator,
- a descriptor,
- or a teaching lens.

That separation is what makes both sequencing **and** teaching possible.

---

## What comes next

This research layer supports:

- a sequencer-first V2 architecture,
- future 3D extensions (via plane transforms),
- discovery of new relationships by translating between theories,
- and a simulator that teaches _understanding_, not just tricks.

If this works, the simulator isn’t just a tool — it’s a map of the idea space of poi.

And that’s the real ambition here.
