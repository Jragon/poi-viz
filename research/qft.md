Below is a **design-level analysis of QFT as a candidate core abstraction**, mapped deliberately onto your V2 goals (piecewise-first, circular node rig, sequencer-first). This is grounded in the uploaded QFT primer PDF by Drexler/Cushing , but framed as architecture, not notation pedagogy.

---

## A) QFT mental model (distilled)

**What QFT fundamentally represents**

QFT represents poi motion as a **quantised angular field**: instead of continuous curves, motion is decomposed into a finite sequence of angular states sampled around a circle. Each state captures:

- _where_ the poi is pointing (angular position),
- _how_ it is moving (direction of travel),
- _relative to what_ (hand vs body frame).

The core move is not “draw a curve”, but **advance through angular states under fixed harmonic relationships**.

In plain terms:
QFT says _“poi motion is the interaction of a small number of rotating frames with fixed frequency ratios, observed at discrete phase steps.”_

**Basis functions in poi terms**

The effective basis functions are:

- **Uniform circular rotation** (hand path)
- **Relative circular rotation** (poi around hand)
- **Harmonic ratios** between those rotations (e.g. 1:1, 2:1, 3:1)
- **Phase offsets** between frames

Everything else (flowers, cateyes, triquetras) emerges from combinations of these.

This is Fourier-like not because it decomposes arbitrary curves into sines, but because **complex motion is expressed as sums of circular motions with different frequencies and phases**.

**Degrees of freedom exposed**

QFT exposes, implicitly or explicitly:

- Angular position (discrete, modulo 8 in the primer)
- Direction of rotation (sign)
- Frequency ratio (poi beats per hand beat)
- Phase offset between frames
- Radius (hand path size)
- Frame of reference (body-centric vs hand-centric)

Notably absent by default:

- Absolute time units
- Explicit segment boundaries
- Plane orientation (assumed, not parameterised)

**Assumptions about continuity and periodicity**

QFT assumes:

- Motion is **periodic or quasi-periodic**
- Patterns repeat cleanly after an integer number of beats
- Continuity is implicit between samples (shortest arc, no teleport)

This is a powerful assumption for _patterns_, but dangerous for _sequencing_.

---

## B) QFT as a motion representation

**How QFT describes motion over time**

QFT does not describe time continuously. It describes **ordered phase steps**. Time is implicit:

- One step ≈ one subdivision of a beat
- Duration exists only insofar as patterns repeat

You can reconstruct time by assigning a tempo, but QFT itself is **phase-first, not time-first**.

**Global vs local**

QFT is fundamentally **global**:

- A QFT description typically encodes a _whole cycle_
- Meaning emerges from the full loop, not from individual steps

Local reasoning (“what happens between t=1.2s and t=1.5s?”) is not native.

**Where infinite repetition is assumed**

- Harmonic ratios assume steady rotation
- Direction resolution relies on continuity across the loop
- “Out of resolution” cases explicitly acknowledge limits of discrete sampling

**Fit to piecewise-first systems**

QFT does **not naturally encode boundaries**.

However, it is _segment-friendly_ if you reinterpret:

- One QFT cycle → one segment
- Transitions → explicit boundary conditions between cycles

Conclusion:
QFT is not a timeline model, but it can **emit well-behaved cyclic segments** suitable for a piecewise system.

---

## C) Mapping QFT → node-based rig

This is where QFT shines for you.

**Direct mappings**

| QFT concept      | Node-rig equivalent          |
| ---------------- | ---------------------------- |
| Hand rotation    | `hand.a(t)`                  |
| Poi rotation     | `head.a(t)` relative to hand |
| Harmonic ratio   | `va_head / va_hand`          |
| Hand path radius | `hand.r`                     |
| Poi length       | `head.r`                     |
| Phase offset     | initial `a` offsets          |

In other words:
A QFT flower is exactly **two angular velocity fields in a parent/child node relationship**.

**What is straightforward**

- Harmonics → angular velocity ratios
- Discrete states → sampled evaluation
- Relative frames → node parenting

**What is awkward**

- Direction resolution (`n` cases) does not map cleanly to continuous velocity
- Discrete 8-point quantisation is pedagogical, not architectural
- QFT notation mixes _state_ and _derivative_ (position vs direction)

**What requires conventions**

- Choosing continuous vs snapped angles
- Interpolating between QFT steps
- Defining entry/exit conditions between segments

Design insight:
Treat QFT as **constraints on node velocities and phases**, not as literal step tables.

---

## D) QFT across multiple planes

**Implicit plane assumptions**

The primer assumes a single plane (usually wall or wheel). Plane is _context_, not data.

**Extending QFT**

There are three clean options:

1. **Per-plane QFT**
   QFT defines motion in a local 2D plane. Planes are applied as transforms.
2. **Plane as slow-varying parameter**
   Plane orientation changes over time (meta-motion).
3. **Piecewise plane switching**
   Each segment has its own plane.

**Commutativity**

Harmonics commute poorly with plane switching mid-cycle. They commute cleanly if:

- Plane is constant per segment
- Plane changes only at segment boundaries

**Recommendation for V2**

- QFT lives strictly in **local 2D**
- Plane selection is a **segment-level transform**
- Plane changes are explicit piecewise operations

---

## E) QFT → time-based, parameterised space

A viable conceptual pipeline:

1. **QFT descriptor**
   Harmonic ratios, phases, radii, cycle length
2. **Segment compilation**
   Choose:
   - duration (seconds or beats)
   - sampling resolution

3. **Boundary conditions**
   Entry angle, exit angle, continuity requirements
4. **Runtime evaluation**
   Transport time → phase → node angles → world pose

Key point:
QFT parameters are **constant over a segment**, not globally mutable.

This aligns perfectly with your piecewise-first architecture.

---

## F) Pain points and limitations

**Cognitive**

- QFT becomes opaque beyond 2–3 interacting harmonics
- Direction resolution debates reveal ambiguity
- Poor intuition for non-cyclic transitions

**Computational**

- Discrete sampling creates aliasing unless smoothed
- “Shortest path” assumptions hide intent
- High harmonics magnify numerical noise

**Where it breaks down**

- Entry/exit transitions
- Asymmetric or non-periodic motion
- Long heterogeneous sequences

**Why spinners use VTG / recipes**

Because QFT is **descriptive**, not **narrative**. It explains what a pattern _is_, not how to _move through_ patterns.

---

## G) QFT as core vs overlay

**Recommendation**

QFT should **not** be the canonical runtime representation.

Best role in V2:

> **A generator and analytical layer that emits piecewise node-rig segments with explicit timing and boundaries.**

Why:

- Your sequencer needs explicit time, not implicit phase
- Your transport needs deterministic seek
- Your transitions need contracts, not harmonic hope

QFT becomes a _pattern compiler_, not the VM.

---

## H) Relationship to V1, VS3D, VTG

**QFT vs V1 Cartesian parametrics**

- QFT: relational, harmonic, compact
- V1: absolute, curve-centric, brittle

QFT explains _why_ you introduced circle speed.

**QFT vs VS3D**

- VS3D implements QFT-like thinking implicitly (node chains, relative angles)
- QFT provides the **theoretical spine VS3D lacks**
- VS3D’s weakness (implicit fits) is exactly where QFT must stop

**QFT vs VTG**

- VTG describes _transitions_
- QFT describes _steady-state structure_

They are complementary, not competing.

---

## I) Design takeaways for V2

**Rules informed by QFT**

1. Motion = interacting angular fields, not curves
2. Harmonics belong inside segments, not across timelines
3. Relative frames are first-class

**What QFT encourages early**

- Circular node rig
- Phase-centric thinking
- Explicit frequency ratios

**What QFT must not dominate**

- Transport
- Sequencing
- State mutation
- UI language

**Risks of overfitting**

- Designing everything as cycles
- Hiding boundary logic
- Treating harmony as continuity guarantee

---

### Bottom line

QFT is **the right mental model**,
**the wrong runtime**,
and **the perfect segment generator**.

Used this way, it sharpens your V2 instead of constraining it.
