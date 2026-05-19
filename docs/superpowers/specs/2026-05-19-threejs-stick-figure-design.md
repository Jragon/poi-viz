# Three.js Stick Figure Design

**Status:** Approved for planning

## Problem Statement

The current Three.js motion inspection view proves that world-space playback can drive a useful 3D scene, but it still lacks the body context that makes the 2D projected visualizer easy to read. The viewer can lose front/back orientation, torso intent, and arm/body relationship because the scene currently shows rig points and trails without a full procedural body.

The next slice should add a deterministic, simulator-facing 3D stick figure that reuses the existing body solve, stays honest about what the runtime actually knows, and creates a shared body representation that can later feed both 3D and 2D rendering.

## Goals

1. Add a full procedural 3D stick figure to the Three.js simulator-facing visualizer.
2. Keep the existing body-rig solve as the pose source of truth for this slice.
3. Introduce a normalized internal skeleton frame that is renderer-agnostic and future bone-compatible.
4. Make front/back orientation readable during playback, scrubbing, and free camera inspection.
5. Preserve planted feet and deterministic support-pose behavior.
6. Create a path for the 2D overlay to consume the same normalized body frame later.
7. Keep the slice small enough that it does not widen into mesh import, skinning, or full-body IK work.

## Non-Goals

1. No imported humanoid mesh support in this slice.
2. No skinning, bind-pose asset mapping, or retargeting.
3. No full internal bone hierarchy or armature runtime yet.
4. No locomotion, stepping, or dynamic foot placement.
5. No silent visual corrections that diverge from solver output.
6. No body-aware solver rewrite beyond what is needed to expose normalized skeleton outputs.

## Options Considered

### Option A: Direct render adapter

Render Three.js meshes directly from the existing solved body frame without introducing a shared normalized skeleton contract.

**Pros**

1. Shortest implementation path.
2. Lowest up-front abstraction cost.

**Cons**

1. Couples the renderer directly to solver output details.
2. Makes later 2D and 3D convergence harder.
3. Gives no stable seam for a future bone-compatible layer.

### Option B: Normalized internal skeleton contract

Keep the current body solve authoritative, but convert its output into a small shared skeleton frame before rendering.

**Pros**

1. Best fit for the current 3D visualizer goal.
2. Keeps solver behavior and rendering concerns separate.
3. Creates a reusable contract for future 2D back-porting.
4. Leaves a clean upgrade path toward bone-like transforms later.

**Cons**

1. Adds an extra data-shaping layer now.
2. Requires explicit decisions about joint naming, segment metadata, and orientation cues.

### Option C: Full bone-oriented scene graph now

Introduce a full internal bone hierarchy and local-transform scene graph before the first simulator-facing 3D body pass.

**Pros**

1. Strongest long-term fit for mesh import and skinning.
2. Makes later attachment and armature features more direct.

**Cons**

1. Too large for this slice.
2. Forces premature decisions about bind pose, axes, constraints, and import mapping.
3. Slows down the immediate simulator-body goal.

## Recommended Option

Choose Option B.

This keeps the next slice grounded in the existing body solver while creating the stable renderer-facing contract that the current codebase does not yet have. It is the narrowest option that still supports the likely future path: shared 2D/3D body representation first, bone-compatible transforms later, imported mesh support after that.

## Approved Decisions

1. This slice targets Three.js only; the current 2D view is acceptable as-is for now.
2. The new 3D body is simulator-facing, not just a debug helper.
3. The body uses a full procedural figure: head, torso, arms, pelvis, and legs.
4. Limb rendering uses capsule limbs plus sphere joints.
5. Front/back readability uses torso-oriented cues first, with a chest stripe plus a minimal head-front cue.
6. Feet remain planted in this slice.
7. The renderer should consume a normalized internal skeleton frame rather than solver output directly.
8. The normalized skeleton frame should be explicit enough that future 2D rendering can reuse it.
9. The normalized skeleton frame should be designed to be bone-compatible later, but a full bone runtime is deferred.

## Design

### Scope

This slice adds a full procedural 3D stick figure to the existing Three.js simulator/inspection scene. It does not change playback semantics, sequence semantics, or the current engine coordinate contract. It reuses the current body-rig solve, normalizes that pose into a renderer-agnostic skeleton frame, and renders that frame with simple Three.js primitives.

The figure should read as an intentional simulator body, not as scaffolding. It should still remain visibly procedural and technical rather than character-like.

### Architecture

Keep the split of responsibilities narrow and explicit:

1. The existing body solve remains the authoritative source of pose truth for this slice.
2. A new shared skeleton-frame builder converts solved body output into named joints, segment descriptors, and orientation cues.
3. A Three.js body renderer consumes only that normalized skeleton frame and owns primitive creation and updates.
4. The page/canvas integration layer wires playback state into the body renderer without changing transport behavior.

This keeps rendering concerns out of the solver and prevents Three.js object structure from becoming an implicit body contract.

### Shared Skeleton Frame

The core new contract should be a renderer-agnostic body frame that is explicit enough for both current rendering and later upgrades.

It should include:

1. Joint positions for head, neck, chest center, pelvis center, left and right shoulders, elbows, hands, hips, knees, and feet.
2. Segment descriptors that name parent and child joints, radius, and render class.
3. Orientation metadata for torso forward, head forward, and chest-stripe direction.
4. Support-pose metadata that makes planted feet and neutral lower-body state explicit.
5. Dimensions or render sizing inputs needed by downstream renderers.

The important constraint is that this frame is not Three.js-specific. A 3D renderer can consume it as capsules and spheres. A future 2D renderer can project it. A later mesh layer can translate it into bone-like transforms.

### Scene Behavior

The 3D body should update every playback frame from the normalized skeleton frame.

#### Body Shape Language

1. Arms and legs render as capsules.
2. Major joints render as spheres.
3. The head renders as a sphere.
4. The torso and pelvis use simple procedural volumes or bridge segments only as needed to preserve readability; they should not imply a full anatomical mesh.

#### Orientation Cues

Front/back readability should come primarily from torso orientation.

1. The torso carries a visible chest stripe that points forward.
2. The head carries a smaller secondary front cue.
3. Neutral poses should still read clearly from common camera angles.
4. These cues are orientation aids, not expressive facial features.

#### Support Pose Rules

1. Feet remain planted.
2. Lower body remains an explicit support pose, not locomotion.
3. Torso and hips may rotate only as far as the normalized skeleton builder can justify from solved pose data.
4. If the pose is underdetermined, the body should prefer the neutral support pose over guessed motion.

### Error Handling And Boundary Behavior

The renderer must stay honest about what is known.

1. If the existing body solve reports best-effort or clamped results, the 3D body renders that result directly.
2. No visual repair layer should silently change arm placement, feet, or torso behavior.
3. Missing or partial rig data should degrade to explicit empty/no-body output rather than guessed pose reconstruction.
4. If Three.js body-render initialization fails, the page should fail through the existing renderer error path instead of introducing custom fallback semantics.

### 2D Back-Port Path

This slice does not rewrite the current 2D overlay, but it should deliberately prepare for that follow-on.

The desired future state is:

1. The body solve produces a shared normalized skeleton frame.
2. The 3D renderer consumes it directly.
3. The 2D overlay later projects the same frame instead of maintaining separate body-layout logic.

This reduces drift between the visualizers and keeps body semantics in one place.

### Future Upgrade Path

The normalized skeleton frame should make the next levels of fidelity plausible without forcing them into this slice.

Likely progression:

1. Procedural 3D body renderer from shared skeleton frame.
2. Shared 2D and 3D body rendering contract.
3. Bone-compatible transform layer derived from the same frame.
4. Imported humanoid mesh mapping against that contract.
5. Richer torso, hip, and arm constraints or IK once the asset contract exists.

This means the current design should avoid hard-coding Three.js-only assumptions into the body contract.

## Testing And Validation

Testing should focus on deterministic body-frame derivation first and rendering behavior second.

1. Add unit tests for the shared skeleton-frame builder: joint topology, segment ordering, planted-feet invariants, and torso/front orientation outputs.
2. Add tests for explicit empty-state and best-effort/clamped-state behavior where the builder exposes those outputs.
3. Add renderer-focused tests only where they can verify stable mapping between skeleton-frame segments and render objects without asserting fragile Three.js internals.
4. Perform manual browser validation in the Three.js simulator view for front/back readability, torso/hip continuity, arm continuity, and scrubbing stability.

Acceptance criteria:

1. The Three.js visualizer still loads and plays existing sequences.
2. A full 3D procedural stick figure renders during playback.
3. Front/back orientation is clearly readable from torso and head cues.
4. Feet remain planted across playback.
5. Best-effort or clamped body solves render honestly without visual correction.
6. The normalized skeleton-frame helpers remain deterministic and testable outside Three.js.
7. Lint, typecheck, tests, and manual browser verification all pass.

## Risks And Tradeoffs

1. If torso-forward logic is weak, the figure may still be readable as a body but not as an orientation aid.
2. If torso volumes become too elaborate, the slice drifts toward premature mannequin design.
3. If the shared skeleton frame is too renderer-shaped, it will not help the eventual 2D back-port or mesh path.
4. If the shared skeleton frame is too abstract, the first rendering pass may become harder than necessary.

## Migration Impact

1. No engine sequence-format change.
2. No authoring-model change.
3. No current public engine API change is required for this slice.
4. The main additions are a shared skeleton-frame contract, Three.js renderer integration, tests, and supporting visualizer state.

## Follow-On Work

1. Back-port the shared skeleton frame into the 2D body overlay so both visualizers consume the same body representation.
2. Add a bone-compatible transform layer if the next slice needs richer torso or hip articulation.
3. Explore imported humanoid mesh support only after a stable canonical skeleton contract exists.
4. Add body-aware solver improvements for torso and hips once the renderer contract is proven useful.