# Quarter timing article handoff spec

This is a handoff spec for the current wall-plane timing article and the next 3D timing article. It is not user-facing article copy. The next agent should use it as the implementation and editorial boundary.

## Source articles

- Current article: [quarter-timing-direction.md](quarter-timing-direction.md)
- Next article: [quarter-time-3d.md](../quarter-time/quarter-time-3d.md)
- Stall-graph notation article: [qt-stall-graph.md](qt-stall-graph.md)

## Current status

The wall-plane timing demo is implemented. Do not redesign it unless a concrete problem is found.

The current demo provides:

- four timing choices: `Same`, `R +¼`, `Split`, and `L +¼`;
- two direction choices: `Same direction` and `Opposite directions`;
- one shared circular orbit;
- one wall-height graph;
- one shared animation clock;
- a moving playhead and coloured graph markers;
- a small Pause/Play control;
- no time slider;
- timing and direction changes restart at the beginning of the cycle;
- direction changes reverse the route around the circle but do not change the wall-height graph;
- responsive sizing for mobile and desktop.

Relevant implementation files:

- [HandedQuarterTimingFigure.vue](../../components/figures/timing/HandedQuarterTimingFigure.vue)
- [PoiOrbitDiagram.vue](../../components/figures/timing/PoiOrbitDiagram.vue)
- [PhaseWaveDiagram.vue](../../components/figures/timing/PhaseWaveDiagram.vue)
- [timingMath.ts](../../components/figures/timing/timingMath.ts)
- [OffsetWavesFigure.vue](../../components/figures/timing/OffsetWavesFigure.vue)
- [TimingDirectionMatrixFigure.vue](TimingDirectionMatrixFigure.vue)
- [wallPlaneTimingPatterns.ts](wallPlaneTimingPatterns.ts)

## Current article: purpose

Teach that timing and direction are separate properties of two circular poi motions on the wall plane.

The article should move through this sequence:

1. Start with familiar same/split timing and same/opposite direction.
2. Define timing through recurring events, especially the bottom/downbeat.
3. Reframe timing as an offset around one cycle.
4. Show the four useful quarter-step offsets.
5. Use the interactive circle/wave demo to connect the orbit to the graph.
6. Apply the same four relationships to a four-petal diamond antispin.
7. Introduce the stall graph as a compact checkpoint notation.
8. Show the same four offsets with both same and opposite directions.
9. Link to the 3D article.

Do not expand this article into a general treatment of 3D, hybrids, polyrhythms, or full lobe/antilobe theory.

## Timing terminology

Use downbeat order as the stable meaning of the quarter labels:

- `Same`: both downbeats happen together.
- `R +¼`: the right downbeat leads the left by one quarter-cycle.
- `Split`: downbeats are separated by half a cycle.
- `L +¼`: the left downbeat leads the right by one quarter-cycle.

“Leading” describes the order of the recurring downbeat event. It does not mean that one poi is spatially ahead around the circle. This distinction matters when the poi travel in opposite directions.

Direction is independent:

- same direction means both poi travel the same way around their circles;
- opposite direction means one route is reversed;
- direction does not change the downbeat timing definition.

Keep the implementation and article examples aligned with this convention. The raw graph phase offset may look reversed because the left downbeat is used as the internal reference; the public label must describe which hand leads.

## Interactive demo behaviour

The figure should remain visually simple and explanatory rather than becoming a general-purpose explorer.

### Required behaviour

- Keep one shared orbit and one graph side by side on larger screens.
- Stack the orbit and graph on narrow screens.
- Let both diagrams use the available width while keeping the orbit visually smaller than the wider graph.
- Keep the graph large enough for the `top`, `centre`, and `bottom` labels to be readable.
- Keep the existing cyan/pink left/right visual language.
- Show the orbit direction arrows/labels.
- Show the graph playhead and the current height of each poi.
- When the graph markers coincide, retain the split-colour marker treatment.
- Reset the animation to time zero when timing or direction changes.
- Respect reduced-motion preferences by starting paused.
- Keep Pause/Play available for animated content.
- Do not reintroduce a time slider unless the teaching goal changes.

### Teaching point

The graph is the vertical coordinate of the circular motion unfolded over time. It is not a second pattern.

At any instant:

- the orbit shows where each poi is around the circle;
- the graph dot shows that same poi’s vertical position;
- the bottom of the circle maps to the bottom of the graph;
- the top of the circle maps to the top of the graph;
- changing direction changes the route around the circle but leaves the height graph unchanged.

The graph cannot distinguish clockwise from counter-clockwise travel because it only shows one coordinate. This is intentional and is the reason the demo establishes that direction is not part of timing.

### Maths explanation

Keep the maths lightweight. The intended explanation is:

- circular motion can be represented with two coordinates, for example $x = \sin(\theta)$ and $y = \cos(\theta)$, depending on the chosen zero point;
- the graph shows only the vertical coordinate $y$ over time;
- a quarter-cycle timing change shifts the wave by one quarter of its period, equivalent to $\pi/2$;
- reversing the direction changes the angle progression but does not change the anchored vertical trace because $\cos(-\theta) = \cos(\theta)$.

Do not turn this into a trigonometry tutorial. The animation should carry most of the explanation.

## Current article editorial tasks

These are copy/editorial tasks, not automatic prose rewrites:

- Replace the remaining placeholder text in the interactive figure caption.
- Keep the title consistent with the figure’s actual purpose. “Circle Timing vs wave” is acceptable as a working title; a later copy pass can choose the final capitalization and wording.
- Change the offset-wave paragraph’s figure reference to `offset-waves`, not `familiar-timing`.
- Explain why quarter offsets are useful: quarter-turns land on cardinal axes, form a four-state cycle, and match the four cardinal checkpoints of the diamond antispin.
- Explain that the four-petal diamond antispin reaches outward cardinal checkpoints once per quarter-cycle.
- Correct the terminology around lobe and antilobe. They are velocity-relationship terms, not synonyms for inspin and antispin. The outward tips in this example are antilobe checkpoints.
- Keep the stall graph link pointing to `/lab/qt-stall-graph`.
- Describe the stall graph as six cardinal rows: `F`, `U`, `R`, `D`, `L`, `B`. Each column is a quarter-step/beat. Adjacent cardinal marks define a quarter arc; opposite pairs are invalid.
- Keep mixed-plane discussion in the 3D article.
- Keep the hybrid/polyrhythm section deferred. Unequal frequencies should not be casually presented as a polyrhythm.
- Preserve the author’s voice and do a separate spelling/grammar pass rather than silently rewriting it during component work.

## Stall graph relationship

The current article only introduces the stall graph. The deeper editor and notation live in [qt-stall-graph.md](qt-stall-graph.md).

The timing/direction matrix should remain the primary comparison figure:

- one row for same direction;
- one row for opposite directions;
- four offsets per row;
- codec-backed patterns;
- one selected shared preview;
- no separate redundant offset-cycle figure.

The four public labels must remain in this order:

1. `Same`
2. `R +¼`
3. `Split`
4. `L +¼`

## Next article: timing in 3D

Working source: [quarter-time-3d.md](../quarter-time/quarter-time-3d.md). Route: `/lab/quarter-time-3d`.

### Purpose

Extend the timing discussion from one wall plane to simple atomic 3D plane combinations without pretending that the engine supports arbitrary continuous 3D motion.

The article should explain that timing is still a relationship between recurring events, while the two poi may travel through different planes or use different plane routes.

### Existing foundation

The article already has:

- a `PatternCell` introduction demo;
- `QuarterTimeExplorer`;
- elementary quarter arcs;
- wall, wheel, and floor plane options;
- same-time and quarter-time availability checks;
- generated visualizer sequences;
- optional stick-figure display.

Relevant implementation files:

- [quarter-time-3d.md](../quarter-time/quarter-time-3d.md)
- [QuarterTimeExplorer.vue](../quarter-time/QuarterTimeExplorer.vue)
- [elementaryQuarterTime.ts](../quarter-time/elementaryQuarterTime.ts)
- [QuarterTimeJournalPage.vue](../quarter-time/QuarterTimeJournalPage.vue)
- [ATOMIC_PLANE_BREAKS.md](../../../../docs/ATOMIC_PLANE_BREAKS.md)

Do not replace the current explorer with a second unrelated editor. Improve or clarify it only where the article’s teaching sequence requires it.

### Suggested teaching sequence

1. Begin with a concrete 3D demo.
2. Remind the reader that same/split relationships can be understood through shared axes.
3. Define quarter time in 3D as the hands occupying different axes at the corresponding checkpoints, producing a right-angle relationship.
4. Explain that wall, wheel, and floor are orthogonal atomic planes.
5. Let the reader select a quarter arc for each hand.
6. Let the reader select plane and timing options.
7. Show which combinations are available and why.
8. Explain that front/back constraints can make some arcs unavailable in a selected plane.
9. Connect the selected endpoints to the stall-graph/cardinal notation.
10. Defer more complex plane-changing cycles and Infinite-L relationships to a later article if they need more theory.

### 3D terminology and constraints

Use the existing engine meanings:

- `wall`, `wheel`, and `floor` are atomic plane identifiers;
- the six cardinals are `F`, `U`, `R`, `D`, `L`, `B`;
- adjacent cardinal pairs define a quarter arc and therefore determine the plane;
- opposite pairs describe a half-circle and are not valid quarter arcs;
- plane changes are discrete boundary events, not continuous bends through arbitrary 3D space;
- timing remains an authored/event relationship, not an implicit auto-correction.

Do not add QFT/CAP/VTG theory to the runtime or claim that the 3D article proves a general theory of all poi motion.

### 3D interactive demo requirements

- Preserve deterministic sequence generation.
- Preserve explicit selected plane, arc, timing, and preview state.
- Keep unavailable arcs visibly disabled rather than silently correcting them.
- If a plane change invalidates the current arc, choose a valid default explicitly and make the resulting selection visible.
- If a timing mode is unavailable for a plane/arc combination, disable it and explain why through the control state/title.
- Keep left/right styling distinct and consistent.
- Keep the preview compact enough that the article does not become a wall of canvas.
- Use the existing body-rig/visualizer adapters; do not redefine engine motion in the article component.

### Open questions for the 3D article

These should be decided during the next article pass rather than invented in the current wall-plane article:

- whether “quarter time” should remain the public term or be paired with a more precise event/axis description;
- whether same/split/quarter labels are sufficient for mixed-plane cases;
- how much of Infinite-L, same-L, and split-L terminology belongs in the introduction;
- whether plane-changing complete loops need a separate article;
- whether a later figure should show one loop staying planar and another changing planes while preserving a checkpoint relationship.

## Explicit non-goals

Do not do these as part of this handoff:

- no arbitrary 3D paths;
- no continuous plane bends;
- no body-aware topology in the engine;
- no auto-correction solver;
- no new runtime timing model;
- no hybrid/polyrhythm article inside the wall-plane article;
- no compatibility aliases or deprecated APIs;
- no silent fixups for invalid cardinal transitions.

## Validation and completion

For the current article/demo:

- timing labels and codec order agree;
- same/opposite direction changes only the orbit route;
- the graph remains a height graph;
- responsive layout is readable on narrow and wide screens;
- no time slider is present;
- reduced-motion behaviour remains usable;
- timing figure tests pass;
- lint, typecheck, tests, build, and `git diff --check` pass.

For the next 3D article:

- existing elementary-quarter-time tests continue to pass;
- plane/arc availability remains explicit and deterministic;
- generated previews match the selected controls;
- no engine boundary rules are implemented inside Vue components;
- the article and implementation terminology remain aligned.

## Recommended agent workflow

1. Read this spec and both source articles.
2. Inspect the current diff before editing; the author may have changed prose or captions manually.
3. Finish current-article copy tasks separately from component changes.
4. Do not alter the interactive timing design unless a test or visible issue requires it.
5. Work on the 3D article only after the wall-plane article terminology is settled.
6. Validate the current article and 3D explorer independently.
7. Report unresolved terminology or editorial decisions rather than guessing.
