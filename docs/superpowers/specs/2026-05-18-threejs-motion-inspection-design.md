# Three.js Motion Inspection Design

**Status:** Approved for planning

## Problem Statement

The existing Three.js debug experiment proves that current engine world poses can drive a real 3D renderer, but it is still weak as an inspection tool. It lacks free view control, lacks world-space trails, and treats planes as generic helpers rather than readable motion-reference surfaces anchored to the same origin as the engine outputs.

The next slice should improve motion readability without changing engine semantics, introducing a body solver, or widening into a full character-rendering project.

## Goals

1. Make 3D motion easier to inspect during playback.
2. Keep the engine origin canonical in the 3D scene.
3. Show active planes as readable low-opacity colored sheets centered at the canonical origin.
4. Add orbit and zoom controls without allowing pan.
5. Keep geometry decisions deterministic and testable outside Three.js where practical.

## Non-Goals

1. No engine coordinate-model change.
2. No full 3D stick figure in this slice.
3. No body-root recentering separate from engine origin.
4. No pan controls.
5. No trail ribbons, mesh tubes, fading-by-age, or other presentation-heavy trail effects.

## Options Considered

### Option A: Inspectability-first

Add orbit + zoom controls, world-space trails, and low-opacity origin-centered plane sheets while keeping the body representation minimal.

**Pros**

1. Best fit for the immediate goal of reading motion clearly.
2. Lowest implementation risk.
3. Keeps the scene understandable and the tests focused.

**Cons**

1. Still reads as a debug tool rather than a body renderer.

### Option B: Balanced debug body

Add orbit + zoom, trails, origin-centered plane sheets, and a minimal 3D body scaffold in the same slice.

**Pros**

1. Better spatial context than pure markers.
2. Begins the path toward a body-aware renderer.

**Cons**

1. Mixes inspection improvements with body-design ambiguity.
2. Increases failure surface for the first follow-up slice.

### Option C: Body-first

Prioritize a procedural 3D body render and keep trail work secondary.

**Pros**

1. Stronger visual payoff.

**Cons**

1. Poor fit for the stated goal of inspecting motion clearly.
2. Delays the simplest improvements that make debugging easier.

## Recommended Option

Choose Option A.

This keeps the next slice narrow and useful. The renderer remains a faithful view over existing engine output, and the new behavior improves scene readability without introducing a second coordinate contract or a larger body-rendering dependency.

## Approved Decisions

1. The canonical scene origin remains the current engine origin.
2. The first camera-control slice supports orbit and zoom only.
3. Pan is explicitly disabled.
4. Active planes render as low-opacity colored sheets centered at origin.
5. Plane-sheet radius is approximately 1.5 world units.
6. Plane-sheet visibility is toggleable.
7. Full 3D stick figure work is deferred.

## Design

### Scope

This slice extends the existing Three.js debug experiment into a motion-inspection view. It adds origin-locked orbit controls, world-space head and hand trails, and toggleable colored plane sheets centered at origin. It does not change engine behavior, does not change playback semantics, and does not add a full body rig.

### Architecture

Keep the current split of responsibilities:

1. The page owns UI state and playback wiring.
2. A pure helper layer derives renderer-facing scene data from engine outputs.
3. The Three.js canvas owns Three scene objects, controls, and synchronization.
4. The engine and authoring model remain unchanged.

The new helper layer should continue to return plain data rather than Three.js objects. That keeps the geometry and filtering logic deterministic, easy to test, and independent from rendering internals.

### Coordinate Contract

The experiment uses engine origin as the canonical world origin. No body-centered recentering pass is added in this slice.

This means the plane sheets are centered at origin because that is the current canonical reference point for the scene, not because a new body-root abstraction has been introduced. If a future body rig is added, it must either share that origin or introduce its own explicit mapping layer rather than silently redefining the scene contract.

### Scene Behavior

#### Trails

Each rig renders two world-space trails:

1. Hand trail
2. Head trail

These trails should be derived from deterministic playback/world-pose data rather than from live Three.js object positions. The first pass keeps trail rendering intentionally simple: fixed sampling, thin line geometry, rig-matched coloring, and no aging/fading effects.

#### Plane Sheets

Each active plane can render as a low-opacity colored square sheet centered at origin with an approximate radius of 1.5 world units. Plane orientation follows current plane conventions:

1. `wall`
2. `wheel`
3. `floor`

These sheets are orientation aids only. They are not collision surfaces, not solver inputs, and not moving objects. Their purpose is to make it easier to see which plane a motion segment currently inhabits.

#### Camera Controls

Camera interaction is limited to orbit and zoom. Orbit target stays locked to origin. Pan is disabled.

The scene should also provide a reset path back to the default inspection angle so the user can recover quickly after rotating into an awkward view. If controls fail to initialize, the scene should fall back to the existing static camera behavior rather than breaking playback.

### UI

The experiment page should add explicit toggles for:

1. Trails
2. Plane sheets

Existing helper toggles should remain distinct from the new plane-sheet toggle so the user can choose between abstract debug helpers and the new low-opacity sheet visualization.

### Error Handling

Error handling remains narrow and explicit:

1. Renderer initialization failure continues to surface through the existing fallback error path.
2. Orbit-control initialization failure degrades to the static camera rather than breaking the scene.
3. Empty or partial rig data produces empty trail output instead of repair logic or guessed values.

## Testing And Validation

Testing should focus on pure scene helpers, not Three.js internals.

1. Add tests for trail helper output shape, deterministic ordering, and empty-state behavior.
2. Add tests for plane-sheet orientation, color mapping, radius, and active-plane filtering.
3. Expand page-level tests only enough to cover new toggles and any simple derived labels.
4. Avoid brittle tests that assert on Three.js implementation details.

Acceptance criteria:

1. The Three.js debug route still loads and plays the existing debug sequence.
2. Orbit and zoom work.
3. Pan does not work.
4. Reset returns the scene to the default inspection view.
5. Active planes can render as low-opacity origin-centered sheets and can be toggled off.
6. Hand and head trails render in 3D and remain stable through playback.
7. Lint, typecheck, tests, and manual browser verification all pass.

## Risks And Tradeoffs

1. Trails can become visually noisy if sample density is too high; the first slice should prefer clarity over completeness.
2. Plane sheets can dominate the scene if opacity or scale is too aggressive; default values should stay conservative.
3. Orbit controls improve inspection but also introduce a new interaction seam that needs graceful fallback behavior.

## Migration Impact

1. No public engine API changes.
2. No sequence-format changes.
3. No authoring-model changes.
4. The slice adds renderer-side helper code, tests, and UI toggles only.

## Follow-On Work

Likely next follow-up after this slice:

1. Minimal 3D body/root marker or torso scaffold.
2. More expressive trail presentation if the simple lines prove insufficient.
3. Explicit camera presets if manual orbit alone is not enough.