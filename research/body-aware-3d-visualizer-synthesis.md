# Body-Aware 3D Poi Visualizer Synthesis

Date: 2026-05-01

## Problem statement

The current V2 system is good at deterministic wall-plane flowers: a body origin,
a hand node, a head node, circular drivers, explicit segment durations, and a 2D
canvas projection. That is a strong base, but it currently describes a very
specific slice of poi: arms-extended planar motion with almost no body.

The next leap is not merely "add z". The next leap is to represent how poi
motion lives in a spinner's personal space: front plane, back plane, side
planes, wheel/floor/wall orientations, shoulder and hip zones, inside and
outside lanes, crossing/twist degrees, reels, weaves, wraps, body tracers,
toroids, stalls, and collisions or near-misses around the body.

The goal should be a visualizer that can show both the curve and the move:

- where the hand goes,
- where the head goes,
- which plane the motion is in,
- which body zone it occupies,
- what relationship the poi has to the arms/body,
- where the natural transition points are,
- and why one pattern is related to another.

This document proposes a spatial architecture for that goal.

## Core thesis

Keep the runtime model minimal, deterministic, and segment-first. Add body-aware
3D as a layered spatial interpretation, not as a physics engine and not as one
giant parametric equation.

The right mental model is:

```text
local planar motion
  -> embedded into an explicit plane frame
  -> attached to a body-relative anchor/zone
  -> optionally constrained by body volumes and arm lanes
  -> rendered through one or more cameras/projections
  -> explained by overlays: QFT, CAPs, beat graphs, symmetry, relation signatures
```

Drex's math shows that flowers, third-order motions, body tracers, weaves, and
toroids can be described by layered sine/cosine oscillators. Mel's body tracing
framework shows that body movement can be decomposed into reels at named body
positions and timing graphs. Rev's spherculist writing shows that inside/outside,
inswing, introversion, inversion, twist degree, and crossover degree are not
minor decorations; they are a topology of the arms relative to the body.

The synthesis is: build a local oscillator engine, then build a body-space
topology around it.

## Source-derived constraints

### From Drex

Drex gives the strongest mathematical foundation for pattern families.

Important imports:

- A flower is handpath oscillator plus head oscillator.
- Petal/lobe count is a frequency-ratio effect, not a named trick primitive.
- Third-order motions are extra centers of rotation, either physical or virtual.
- Body tracers and weaves are not just "more flowers"; they add depth, often via
  a z oscillation or plane bend.
- Toroids are about rotation of the poi plane relative to the handpath.
- Composite patterns force piecewise equations and expose the weakness of
  cycle-first math.
- Lobes and antilobes are better transition anchors than the ambiguous word
  "petal".

Drex is less useful as a direct runtime format. His equations are excellent for
classification and generation, but they bake in coordinate preferences,
complete-cycle bias, and body-agnostic axes. In V2, those equations should live
as generators and overlays.

### From Mel's Body Tracing Framework

Mel gives the missing anatomical grammar.

Important imports:

- The torso zone can be modeled as a body cross.
- A reel is the primitive for wall-plane body tracing: a single poi moving
  between front and back planes, one rotation in each plane.
- Each hand has six major reel positions: high native, low native, high
  non-native, low non-native, high back, low back.
- Two-hand reel positions form a 6 by 6 matrix.
- Reels combine into weaves and mills depending on whether the hands occupy the
  same side or opposite sides.
- Timing is best represented by beat graphs, not by trick names.
- Weaves and mills have unison, chasing, and counter timing types.
- Wraps are adjacent reel combinations without empty rotations; they have their
  own timing families and a three-beat loop structure.
- Layering/form matters when both poi occupy close lanes at the same time.

This is exactly the kind of structure the visualizer should show. It is not
enough to render a head trail. The visualizer should render the body cross, reel
lanes, active front/back plane, and beat graph simultaneously.

### From Rev's Spherculist Manifesto

Rev gives the topological vocabulary for body interaction.

Important imports:

- Degrees are positions of arm twist, not static properties of a whole pattern.
- Beats alone are insufficient once patterns include twist, inswings,
  introversions, inversions, and inside planes.
- Outside/inside plane facing is distinct from outswing/inswing.
- Inswings pass between the arms and can be used as local insertions inside
  larger weave patterns.
- Introversions are simultaneous inswings entering from opposite points.
- Inversions are consecutive inswings entering from the same plane and point.
- Degree of twist and degree of crossover can diverge.
- Pre/post crossover distinctions matter for the same nominal inversion.

This argues strongly for a body-aware topology layer. A realistic visualizer
must eventually know whether the poi is outside both arms, between the arms,
inside one arm and outside another, or passing through a particular arm gate.
That cannot be recovered from the 2D head trail alone.

### From QFT, CAPs, symmetry, hybrids, V1, VS3D

These files converge on several guardrails:

- QFT is a thinking/generator layer, not runtime truth.
- CAPs provide a useful assembly vocabulary and a cycle-fraction knob.
- Symmetry is a constraint and explanation layer, not core state.
- Hybrid math provides relation signatures and driving-style labels.
- V1 proves Cartesian-first motion is brittle for sequencing.
- VS3D proves recursive rigs and recipes are powerful, but also shows why hidden
  fit/refit behavior and UI/runtime coupling should be avoided.

The recommendation is therefore conservative: preserve V2's deterministic
sequence model and add spatial interpretation in explicit layers.

## Three architecture options

### Option A: Full 3D parametric equations

Represent every 3D move directly as x(t), y(t), z(t), using Drex-style equations
or custom parametric curves.

Benefits:

- Fast path to impressive 3D curves.
- Toroids and weaves can be plotted from closed forms.
- Easy to import math papers as equations.

Risks:

- Sequencing returns to V1's core problem: boundaries are external to the curve.
- Body interaction is not first-class.
- The hand/head rig relationship can become obscured.
- Users get curves, but not moves.
- It becomes hard to ask "which body zone is this in?" or "which arm gate did it
  pass through?"

Use this only as a derived plotting/export mode or as a quarantined generator
family.

### Option B: Continuously rotating 3D rig everywhere

Promote the engine to a general 3D recursive rig immediately: body, shoulder,
elbow, hand, grip, head, plane normal, twist, bend, quaternions.

Benefits:

- Expressive.
- Closer to VS3D's power.
- Can model toroids and plane bends natively.

Risks:

- Too much model too soon.
- Invariants become harder to see and test.
- Current 2D behavior may be obscured by a broad refactor.
- Body topology and authoring semantics still need to be designed separately.
- It invites a silent solver because authors will not want to specify every
  orientation manually.

This is tempting, but it is too large as the next foundation.

### Option C: Planar segments embedded in body space

Keep each motion segment internally planar. Add explicit plane frames,
body-relative anchors, zone/lane metadata, and boundary contracts. Use 3D
projection and body overlays for visualization. Add continuously rotating plane
segments only for families that truly need them, such as toroids.

Benefits:

- Preserves current deterministic engine direction.
- Matches spinner cognition: "this part is wall plane, this part goes behind,
  this crosses into wheel plane."
- Makes Mel's body tracing framework directly representable.
- Gives obvious UI affordances: plane picker, body-zone picker, beat graph,
  front/back toggle.
- Allows QFT/CAPs/Drex equations to compile into ordinary segments.
- Keeps body collision/inside/outside as validation overlays instead of hidden
  runtime physics.

Risks:

- Some truly continuous 3D moves will need a special extension.
- Plane transitions must be designed carefully.
- It may under-represent fluid plane bending at first.

Recommendation: choose Option C as the main path. Add Option A and B features
only as generators or extensions.

## Proposed system model

### 1. Local motion layer

This is the direct descendant of the current V2 engine.

Current shape:

```text
Segment
  hand.startPose.phaseAbs/radius + circle driver omega
  head.startPose.phaseAbs/radius + circle driver omega
```

Future local shape should remain similarly small:

```text
LocalPlanarSegment
  duration
  handPath channel
  headAroundHand channel
  optional extra local channels
  boundary policy
```

Important change: name the local frame. The current model calls phase
"absolute world phase" because the world is only one 2D plane. In 3D, phase must
be local to a plane frame. This can be introduced without changing the core
evaluation logic immediately by adding an adapter layer.

Do not make pattern names core state. "Flower", "weave", "toroid", "wrap",
"cateye", and "inversion" are generators, classifications, or teaching labels.

### 2. Plane frame layer

A plane is not a renderer setting. It is motion context.

Proposed type concept:

```text
PlaneFrame
  id
  origin: Vec3
  u: Vec3        // local phase axis 0 or local right
  v: Vec3        // local phase axis quarter-turn or local up
  normal: Vec3
  handedness
  label
```

Canonical planes should include:

- front wall plane,
- back wall plane,
- left side wall plane,
- right side wall plane,
- wheel plane left/right,
- floor plane high/low,
- buzzsaw plane,
- custom plane.

For authoring, the important part is not the linear algebra. The important part
is that the visualizer can draw the active plane as a translucent sheet, label
its axes, and show the trail projected into it.

### 3. Body frame layer

The body should be a reference frame first, an obstacle second, and an avatar
third.

Proposed body model:

```text
BodyFrame
  root
  shoulders: left/right points
  hips: left/right points
  head point
  torso volume
  arm gate volumes or lines
  front/back/left/right axes
```

The minimal body can be a stick/capsule model:

- torso capsule or rounded box,
- shoulder line,
- hip line,
- head circle/sphere,
- optional upper arm and forearm capsules.

Do not start with full IK. The first job is not to make a human move perfectly.
The first job is to give all poi motion a body-relative coordinate system.

### 4. Body zones and reel slots

Add Mel's six positions as a formal body-cross vocabulary.

For each hand:

```text
ReelSlot
  level: high | low
  side: native | nonNative | back
  hand: left | right
  anchor: BodyAnchor
  frontPlane: PlaneFrame
  backPlane: PlaneFrame
  transitionLine: Vec3 or body-relative line
```

This enables a body tracing generator:

```text
ReelDescriptor
  hand
  slot
  direction
  timingPhase
  durationBeats
```

Then:

- a weave is two reels on the same side,
- a mill is two reels on opposite sides,
- a wrap is adjacent reels without empty rotations,
- a cosmo/meltdown is a three-reel traversal.

This is more useful than trying to encode "3-beat weave" as a monolithic curve.
The visualizer can show the active slot and the next slot.

### 5. Beat graph layer

Mel's beat graphs should become an authoring and explanation panel.

The visualizer should display:

- time vertically or horizontally,
- front and back plane lanes,
- high/low axes,
- native/non-native/back side markers,
- per-hand colored traces,
- transition points as dots,
- current transport cursor.

Beat graphs are not runtime. They are a readable projection of the segment
schedule. But they are essential for designing weaves, wraps, mills, and body
tracing.

The novel addition: link beat graph nodes to 3D space. Hovering a point in the
beat graph should highlight the corresponding body plane, hand position, head
position, and transition gate in the 3D view.

### 6. Arm topology layer

Rev's degrees/inswings/inversions need their own topology model.

Suggested descriptors:

```text
ArmTopologyState
  twistDegree: integer
  twistDirection: cw | ccw | neutral
  crossoverDegree: integer
  facing: outside | inside
  swingLane: outswing | inswingLeftArm | inswingRightArm | betweenArms
  leadHand: left | right | none
  entryPoint: top | bottom | side | none
  prePostCrossover: pre | post | none
```

This layer is not needed for first 3D flowers, but it is needed before the
visualizer can honestly represent inversions, introversions, and body-aware
inside moves.

The key insight is that this is topological, not geometric. It asks which gates
the poi/hand pass through, not only what coordinates they occupy.

### 7. Constraint and validation layer

Body interaction needs explicit validation, not silent correction.

Useful constraint families:

- position continuity at segment boundaries,
- phase continuity at segment boundaries,
- tangent/velocity continuity where required,
- hand stays in selected body zone,
- head avoids torso/head volume unless contact/wrap mode is declared,
- tether does not pass through forbidden body volume,
- left/right poi layering order is consistent at close passes,
- plane transition occurs only at allowed transition gates,
- arm topology change is legal for the declared move family.

Diagnostics should be visual:

- collision volume turns red,
- failed boundary point pulses,
- beat graph transition is marked invalid,
- a text diagnostic names the violated invariant.

No automatic fixups in runtime. If a generator solves or adjusts something, it
must be a compile-time action with visible output.

### 8. Projection/rendering layer

The visualizer should support multiple simultaneous views:

- 3D perspective camera,
- front orthographic,
- side orthographic,
- top orthographic,
- active-plane 2D projection,
- body-cross diagram,
- beat graph.

The current 2D canvas can remain valuable as the active-plane projection. A 3D
renderer can be added as an additional consumer of evaluated poses.

Recommended render objects:

- body skeleton/volumes,
- active plane sheets,
- hand/head positions,
- tether segment,
- hand and head trails,
- projected shadows onto canonical planes,
- transition gates,
- lobe/antilobe markers,
- beat graph cursor.

For 3D, Three.js is the practical renderer. But the data path should remain
renderer-agnostic:

```text
prepared sequence + transport time
  -> local pose
  -> spatial pose in body frame
  -> render adapters
```

## Novel synthesis: the Body-Space Graph

The core new abstraction I recommend is a Body-Space Graph.

The Body-Space Graph is a typed graph of places and gates around the spinner.
It is not a skeleton and not a curve. It is the map that motion moves through.

Nodes are body-relative motion zones:

- front high left,
- front low left,
- front high right,
- front low right,
- back high,
- back low,
- left side high/low,
- right side high/low,
- buzzsaw center,
- floor high/low,
- custom zones.

Edges are transition gates:

- front-to-back reel transition,
- side-to-side crossover,
- high-to-low vertical wrap,
- inside-arm inswing,
- outside-arm outswing,
- plane rotation gate,
- stall gate,
- toroid bend gate.

Each edge carries constraints:

- allowed hands,
- allowed poi direction/timing,
- required twist/crossover degree,
- allowed plane frames,
- collision risk volumes,
- preferred boundary phase.

Then a move is not just a segment. A move is a path through the Body-Space
Graph plus local oscillator parameters for each edge.

Examples:

```text
wall-plane flower
  graph path: front-low-native stays in same node
  local motion: hand circle + head harmonic

reel
  graph path: front-low-native -> back-low-native -> front-low-native
  local motion: one rotation per plane

waist wrap
  graph path: low-left reel edge + adjacent low-right reel edge, no empty edge
  local motion: three-beat loop

body tracer
  graph path: front petal gate -> back petal gate -> front petal gate
  local motion: flower harmonic with depth phase

inversion
  graph path: outside lane -> inswing gate -> inside lane -> inswing gate
  topology: consecutive inswings, same plane/entry point
```

This graph gives the visualizer a language for body interaction without turning
the engine into biomechanics.

## How major move families fit

### Wall-plane flowers

Current support is already strong. The next additions should be overlays:

- active plane frame,
- lobe/antilobe markers,
- handpath trail separate from head trail,
- QFT/harmonic label,
- relation signature label,
- boundary candidates at cardinals and lobes.

### Custom hand paths

Custom hand paths should be introduced before full 3D complexity.

Start with generator families:

- circle,
- ellipse,
- line,
- polygonal arc,
- flower handpath,
- sampled/path-authored handpath.

The head can still be a circular oscillator around the hand. This unlocks body
tracing, CAPs, stalls, and more expressive hand movement without needing a full
body model immediately.

Critical invariant: if the hand path is not circular, head orientation must be
defined in a named frame. There are at least three modes:

- world/plane absolute head phase,
- hand-tangent-relative head phase,
- hand-normal-relative head phase.

These must not be conflated.

### Front/back plane body tracers

Drex models body tracers with a flower plus z oscillation. Mel models them as
front/back reel structure. Combine both:

- Use Drex's harmonic model for the visible curve family.
- Use Mel's front/back slots to anchor which parts of the motion are in front or
  behind.
- Use explicit transition gates where the motion crosses between front and back.

This allows a body tracer to be shown as:

- a 3D head trail,
- a projected wall-plane flower,
- a front/back plane occupancy timeline,
- and a body collision/clearance view.

### Weaves and mills

Do not model a weave only as `x=sin(dt), y=cos(dt), z=sin(t)`. That plots a
shape but does not explain the move.

Represent weaves and mills as synchronized reel descriptors:

```text
WeaveDescriptor
  leftReelSlot
  rightReelSlot
  sideRelation: sameSide | oppositeSide
  timing: unison | chasing | counter
  directionPair: TS | SS | TO | SO
  emptyRotations
  form/layering
```

Compile this into explicit segments. The 3D view shows the body/planes; the beat
graph shows timing; the local trail shows the familiar weave shape.

### Wraps

Wraps are a perfect early win because Mel gives them a clear structure: adjacent
reels without empty rotations, commonly a three-beat loop with six half-beat
steps.

Add wrap descriptors after reels:

```text
WrapDescriptor
  firstReelSlot
  secondReelSlot
  timing: closed | halfClosed | linked | halfOpened | open
  directionPair
  verticalMode?: true
```

The visualizer should show where the shared front or back rotation occurs and
whether the hands close, half-close, link, or open.

### Inversions and introversions

These should wait until arm topology exists. Rendering the head trail alone will
mislead users because the defining property is how poi pass between/around arms.

First milestone:

- draw simplified arm capsules,
- define outside/inside lanes,
- detect inswing gates,
- label degree of twist and crossover.

Then introversions and inversions can be represented as graph paths through arm
gates, with Rev-style descriptors attached.

### Toroids

Toroids need a special plane-rotation extension.

Drex's distinction maps well:

- isobend: plane stays locked in a synchronous relation to handpath,
- antibend: plane rotates opposite handpath,
- probend: plane rotates same direction but faster than handpath.

Proposed segment extension:

```text
RotatingPlaneSegment
  baseHandPath
  planeFrameAtStart
  planeRotationAxis
  planeOmega
  headPhaseWithinPlane
  headOmegaWithinPlane
  bendType: isobend | antibend | probend
```

This is a narrow exception to the planar-segment rule. It should be introduced
only after fixed plane frames and body-relative rendering are solid.

## What to add to the system

### Phase 1: Spatial adapter, no engine rewrite

Add a renderer-side adapter:

```text
RelativeRigPose + SpatialRigContext -> SpatialRigPose
SpatialRigPose + CameraProjection -> CartesianRigPose
```

New concepts:

- Vec3,
- PlaneFrame,
- BodyFrame,
- SpatialRigContext,
- SpatialRigPose,
- projection functions.

Keep `evalSegment` unchanged. This proves the data pipeline with low risk.

Deliverables:

- render current wall-plane flowers in a 3D scene,
- show body origin/shoulders/torso,
- show active front plane,
- allow camera switching,
- keep existing 2D canvas as active-plane projection.

Validation:

- projected 3D front-plane output matches current 2D cartesian output within
  tolerance,
- transport and trail behavior unchanged,
- no engine sequence semantics change.

### Phase 2: First-class plane frames

Add plane metadata at the sequence/visualizer level, then later at segment level.

Deliverables:

- segment can declare wall/front/back/side plane context,
- trails can be colored by plane,
- visualizer can display front/back/side projections,
- boundary diagnostics can mention plane changes.

Validation:

- known wall-plane sequences remain identical,
- a side-plane sequence projects correctly in side view,
- final-boundary behavior remains explicit.

### Phase 3: Custom hand paths

Add generator-level hand path families without changing core runtime more than
necessary.

Deliverables:

- line handpath,
- ellipse handpath,
- sampled path preview,
- separate hand trail controls,
- handpath editor or seed fixtures.

Validation:

- fixed-radius circular hand paths reproduce existing behavior,
- non-circular hand paths produce deterministic samples,
- boundary contracts fail explicitly when entry/exit mismatches occur.

### Phase 4: Body tracing reels

Add Mel-style body-cross model and reel descriptors.

Deliverables:

- six reel slots per hand,
- front/back plane visualization,
- reel generator,
- two-beat weave/mill generator,
- beat graph panel.

Validation:

- generated unison/chasing/counter examples match expected timing offsets,
- left/right mirrored examples produce mirrored body-space paths,
- beat graph cursor matches transport pose.

### Phase 5: Wraps and body path assemblies

Add adjacent reel assembly.

Deliverables:

- wrap generator,
- timing families: closed, half-closed, linked, half-opened/open as applicable,
- vertical wrap handling,
- plane/layering visual diagnostics.

Validation:

- three-beat wrap loops close when declared closed,
- D-wrap timing names flip as expected when positions are opposite-side,
- invalid adjacent-reel combinations fail compilation.

### Phase 6: Arm topology and inside moves

Add outside/inside lanes and twist degree descriptors.

Deliverables:

- simplified arm capsules/gates,
- outswing/inswing detection,
- degree of twist/crossover overlay,
- introversion/inversion descriptors.

Validation:

- known 3-beat and 5-beat weave degree sequences classify correctly,
- inswing insertions can be marked in the timeline,
- invalid arm-gate transitions are diagnosed.

### Phase 7: Toroids and rotating planes

Add rotating-plane segments as a specialized extension.

Deliverables:

- isobend/antibend/probend generators,
- plane-normal trail visualization,
- toroid gallery,
- head-on/top/side projections.

Validation:

- generated lobe counts match Drex relationships,
- phase offsets place grace beats where expected,
- projection views reveal expected triangle/square/star families.

## UI ideas

### Main 3D workspace

The default screen should show the actual tool, not a landing page:

- central 3D body-space viewport,
- compact transport controls,
- timeline/segment strip,
- plane/body/beat graph panels,
- layer toggles.

### Plane stack panel

List active planes as rows:

```text
front wall   visible active trail-color red
back wall    visible inactive trail-color blue
right side   visible inactive trail-color green
floor        hidden
custom A     hidden
```

Clicking a plane should align the camera to it.

### Body-space graph panel

Show a simplified body cross with nodes and gates. The current segment lights up
its node/edge path. This is the bridge between spinner vocabulary and 3D math.

### Beat graph panel

Use Mel's graph style as a research/authoring tool. It should be synchronized to
transport, not a static image.

### Explanation panel

Given the current segment, compute and show:

- harmonic ratio,
- lobe/antilobe count if applicable,
- relation signature,
- plane frame,
- body slot,
- continuity status,
- active constraints.

This should be derived from state, not authored as truth.

## Data model sketch

This is intentionally conceptual, not final TypeScript.

```text
SpatialSequence
  rigs: SpatialRigSequenceEntry[]
  body: BodyFrameSpec

SpatialRigSequenceEntry
  rigId
  sequence: SequenceSpec              // existing local sequence
  spatial: SpatialSegmentContext[]     // same placement count or explicit mapping

SpatialSegmentContext
  plane: PlaneFrameRef
  bodyAnchor: BodyAnchorRef
  bodyZone?: BodyZoneRef
  topology?: ArmTopologyDescriptor
  constraints?: SpatialConstraint[]
  overlays?: DerivedOverlayHints

SpatialRigPose
  hand: Vec3
  head: Vec3
  tether: Segment3
  plane: PlaneFrame
  bodyZone?: BodyZoneRef
```

At first, `SpatialSegmentContext` can live entirely in visualizer/demo fixtures.
Only promote it into core when tests prove the shape.

## Boundary semantics for 3D

The existing boundary model is good: half-open intervals, explicit wrapping,
and no silent fixups. Keep that.

For spatial segments, add optional boundary contracts:

```text
BoundaryContract
  position: jump | match
  phase: jump | match | preserveRelative
  tangent: ignore | matchDirection | matchVelocity
  plane: same | changeAtGate | rotateAroundAxis | jump
  bodyZone: same | adjacent | explicit
  topology: preserve | explicitChange
```

The important point is not the exact enum names. The important point is that a
plane/body/topology change is declared and validated.

## Classification overlays

Add classifiers incrementally.

### Harmonic classifier

Detects:

- hand/head angular velocity ratios,
- inspin/antispin,
- lobe/antilobe count,
- closure period.

### Relation signature classifier

Detects:

- same/split phase between hands,
- same/opposite direction between hands,
- same/opposite phase between heads,
- same/opposite direction between heads,
- hand/head driving style where meaningful.

### Body tracing classifier

Detects:

- reel slot occupancy,
- weave/mill relation,
- unison/chasing/counter timing,
- wrap timing family.

### Topology classifier

Detects:

- outside/inside facing,
- outswing/inswing,
- twist degree,
- crossover degree,
- introversion/inversion candidates.

These overlays make the visualizer teach. The engine remains small.

## Failure modes to avoid

### Hidden solvers

VS3D's fit/refit/realign approach is powerful, but dangerous if it silently
changes intent. Any solver should be explicit, deterministic, and logged.

### One equation to rule them all

Drex's generalized equation is inspiring, but the project should not chase a
single universal runtime equation. It will become opaque and brittle.

### Body as decorative avatar

A rendered person is not body-aware poi. Body awareness means zones, planes,
gates, lanes, constraints, and topology.

### Pattern names as state

If a segment stores "weave" as truth, the model will drift. Store parameters and
contexts; derive names.

### Continuous 3D too early

Most teaching and authoring value comes from explicit planes and body-relative
segments. Full rotating-plane/toroid support can come later.

## Recommended next concrete step

Build the 3D spatial adapter first.

Problem statement:

The visualizer cannot reason about body planes while all evaluated poses are
Vec2 positions in an implicit wall plane.

Options:

A. Rewrite engine poses as Vec3 immediately.
B. Keep engine Vec2 and add a projection-only 3D renderer.
C. Add an adapter from existing relative poses to Vec3 using an explicit
PlaneFrame and BodyFrame.

Recommendation:

Choose C. It proves the spatial architecture without risking current engine
semantics. It also makes the eventual migration clearer: current 2D output
becomes one projection of a spatial pose, not the only pose.

Validation plan:

- Existing tests pass unchanged.
- New tests prove front-plane projection equals current `toCartesianRigPose`.
- Side-plane and back-plane fixtures produce expected signs/projections.
- Rendering shows body frame, active plane, hand, head, tether, trails.

Migration impact:

- No source-breaking engine change at first.
- Visualizer gains a new spatial path alongside current cartesian rendering.
- Future segment metadata can be introduced fixture-by-fixture.

## Long-term vision

The best poi visualizer should let a user view one movement through many
coordinate systems at once:

- as a 3D body-space motion,
- as a local plane curve,
- as a hand/head rig,
- as a beat graph,
- as a harmonic ratio,
- as a body tracing path,
- as a relation signature,
- as a topology of arms and lanes.

The deep idea is not that any one theory wins. The deep idea is that each
theory is a projection of the same motion object.

The current V2 engine has the right temperament for this: deterministic,
piecewise, explicit boundaries, no silent fixups. The next step is to give that
engine a body-space map.

Once body-space exists, every later feature becomes easier:

- flowers become plane-local harmonic objects,
- body tracers become front/back graph paths,
- weaves become synchronized reels,
- wraps become adjacent reel assemblies,
- inversions become arm-gate topology,
- toroids become rotating plane segments,
- teaching becomes a matter of switching overlays.

That is the route to a visualizer that does more than draw poi. It can explain
poi.
