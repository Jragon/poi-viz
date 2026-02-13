# FOUNDATIONS — V2 Poi Simulator

## 1. Executive synthesis

Collectively, these documents are attempts to answer a single question from different angles: _what is the smallest set of abstractions that actually explains poi motion without collapsing into either folk terminology or opaque mathematics?_ CAPs, QFT, hybrid math, geometric symmetry, and parametric formalisms are not competing theories so much as partial projections of the same underlying structure.

Across authors, several ideas survive translation intact:

- Poi motion is fundamentally **periodic, relational, and relative**, not absolute.
- Meaningful structure emerges from **phase relationships** between rotating components.
- Most named patterns are not primitives but **steady-state solutions** of simpler systems.
- Human understanding relies on _chunking_ motion into cognitively stable units, whether called beats, degrees, petals, lobes, or segments.

QFT-style thinking emerges as the most unifying abstraction because it treats poi motion as a **field of coupled oscillators** observed through different reference frames. It explains why symmetry, harmonics, inspin/antispin, hybrids, and geometric figures recur across systems without privileging any single coordinate system. Crucially, it separates _how humans reason about motion_ from _how motion must be represented computationally_.

The collective failure mode of the corpus is also clear: every framework that treats the _cycle_ as the atomic unit eventually breaks when asked to describe sequencing, transitions, stalls, or partial phrases. This is the gap V2 explicitly fills.

---

## 2. Shared conceptual primitives

### Phase

**Plain language:** Where you are within a rotation.
**Across authors:** Used inconsistently—sometimes absolute angle, sometimes beat index, sometimes hand-crossing state.
**V2 interpretation:** Phase is a continuous scalar per oscillator, always defined relative to a declared reference frame and transport time. Phase has no semantics on its own.

### Frequency / harmonic

**Plain language:** How fast something rotates relative to something else.
**Across authors:** Expressed as beat counts, ratios, degrees, or integer multipliers.
**V2 interpretation:** Frequency is a signed scalar mapping transport time to phase. Ratios define relationships; integers are conveniences, not requirements.

### Symmetry

**Plain language:** Parts of the motion repeat under reflection or rotation.
**Across authors:** Treated as geometric property, teaching heuristic, or classification rule.
**V2 interpretation:** Symmetry is an _analytic property_ of evaluated motion, never encoded directly in runtime state.

### Relative rotation

**Plain language:** One thing spins relative to another.
**Across authors:** Hand vs poi, poi vs poi, plane vs plane.
**V2 interpretation:** All rotation is relative. Absolute rotation does not exist in the engine.

### Plane

**Plain language:** The flat surface a motion lives in.
**Across authors:** Often implicit; sometimes body-relative, sometimes global.
**V2 interpretation:** A plane is an explicit object with orientation and transform. Motion is always planar internally.

### Reference frame

**Plain language:** What you’re measuring motion against.
**Across authors:** Frequently abused or left unstated.
**V2 interpretation:** Every segment declares its reference frames. No silent defaults.

### Continuity / nexus points

**Plain language:** Moments where motion naturally changes.
**Across authors:** Cardinals, crossings, cusps, lobes, grace beats.
**V2 interpretation:** Nexus points are candidate segment boundaries. Continuity is enforced or broken explicitly.

---

## 3. Motion representation taxonomy

### Harmonic (QFT)

**Good at:** Explaining relationships, predicting symmetry, generating families.
**Breaks down:** Sequencing, partial cycles, intent.
**Role:** Thinking layer and generator.

### Geometric (symmetry, loci)

**Good at:** Visual reasoning, teaching, discovery.
**Breaks down:** Time, causality, dynamics.
**Role:** Analytic overlay.

### Node-relative circular motion

**Good at:** Runtime evaluation, extensibility, composability.
**Breaks down:** Human intuition without overlays.
**Role:** Canonical engine model.

### Symbolic / notational (CAPs, VTG)

**Good at:** Communication, pedagogy, memory.
**Breaks down:** Precision, ambiguity resolution.
**Role:** UI and teaching layer.

### Parametric math functions

**Good at:** Exact curves, proofs, export.
**Breaks down:** Cognitive load, editing, sequencing.
**Role:** Derived artifact, never source of truth.

No single representation is sufficient. V2 exists to allow clean switching between them.

---

## 4. Why QFT is the best _thinking layer_ (but not the runtime)

In poi terms, QFT represents motion as interacting oscillators whose observable form depends on phase alignment, frequency ratios, and frame choice. This matches how spinners actually reason: counting, mirroring, offsetting, and recombining rhythms.

It is cognitively efficient because:

- It compresses complexity into ratios and signs.
- It explains families instead of instances.
- It tolerates abstraction without visualisation.

Its assumptions are also clear:

- Periodicity and steady-state behavior.
- Infinite or repeatable cycles.
- Smooth continuity.

These assumptions make QFT unsuitable as a runtime format. It should **describe or generate segments**, not define them. Once motion becomes piecewise, transitional, or expressive, QFT must yield to explicit segment models.

---

## 5. Mapping QFT → V2 canonical engine

**Pipeline:**

QFT descriptor
→ piecewise segment specification
→ circular node rig parameters
→ time-evaluable motion
→ optional analytic reconstruction

**Fixed at compile time:**

- Segment boundaries
- Node topology
- Plane embedding

**Variable at runtime:**

- Transport time
- Phase accumulation

**Validation:**

- Happens at segment boundaries
- Enforces continuity rules
- Rejects ambiguous mappings

There is no silent coercion. If a QFT idea cannot be expressed as segments, it is invalid for V2.

---

## 6. Circular node rig as the canonical pose model

**Minimal nodes:**

- Hand
- Head

**Optional extensions:**

- Elbow / virtual generators
- Multi-head props

**Allowed to express:**

- Relative angular motion
- Radius
- Phase

**Must not encode:**

- Pattern names
- Semantics
- Teaching intent

Node-relative circular motion is the correct substrate because it matches physical constraints, composes cleanly, and remains interpretableching to 3D without changing its internal logic.

---

## 7. Piecewise-first sequencing and transitions

Across documents, authors rely on natural breakpoints without naming them as such. V2 makes this explicit.

**Natural boundaries:**

- Cardinals
- Symmetry axes
- Anti-spin cusps
- Velocity extrema

**Rules:**

- Every segment has explicit boundaries
- Continuity is declared, not inferred
- Incompatible segments fail compilation

There is no automatic fitting or smoothing.

---

## 8. Planes and early 3D thinking

V2 adopts a strict model:

- Motion is planar internally
- Planes are explicit objects
- Segments embed into planes
- Plane transitions occur only at nexus points

3D motion is a sequence of planar segments plus plane transforms. This scales better than full 3D parametrics and matches how spinners actually conceptualise space.

---

## 9. Relationship to existing frameworks

- **QFT:** Generator and analytic lens
- **CAPs:** Sequencing vocabulary, not runtime
- **VTG:** Teaching overlay
- **Symmetry geometry:** Discovery and classification
- **VS3D:** Visualisation tool, not architecture
- **V1 Cartesian system:** Rejected as core; retained only as derived output

---

## 10. Teaching and documentation implications

Structure the research/blog layer as:

- One page per framework
- Each page includes explanation, simulator embeds, and translations

The goal is _translation_, not conversion.

---

## 11. Underlying math engine recommendations

- **Canonical state:** Node rig + plane + segment-local phase
- **Time:** Single deterministic transport
- **Evaluation:** Pure functions of time
- **Determinism:** No hidden state, no sampling drift
- **Math functions:** Always derived from motion, never authoritative

---

## 12. How to start speccing V2 (practical plan)

1. Write segment, node, plane, and transport specs
2. Define validation rules
3. Prototype planar sequencing with plane transitions
4. Add QFT generators later
5. Avoid cycle-first assumptions, implicit frames, and silent coercion

**UNCONFIRMED:** formal treatment of stalls and non-smooth time warps remains open.
