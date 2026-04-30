## 2026-04-30: Continuous Loop Trails Are Visualizer Overlay Behavior

Trail continuity is handled in the visualizer, not the engine. Engine sequence evaluation keeps its existing non-negative modulo wrapping and half-open segment semantics.

- Trail loop period is `PreparedMultiRigSequence.maxSequenceDuration`, matching the transport window.
- Automatic trail looping is enabled by default, with an `Off` visualizer toggle.
- Automatic mode wraps only finite trail windows and only when all rigs are polar-continuous at the transport boundary within visual tolerance.
- Continuity means hand and head phase/radius match at `t = 0` and the exact left-limit pose at the transport boundary, modulo whole turns. Tangent/velocity continuity is intentionally not required.
- The exact final boundary is evaluated from the left for continuity checks because normal engine evaluation at `D` wraps to `0`.
- PNG sequence export records and uses the selected trail loop mode so export output matches interactive visualization.
