# Humanoid Body Rig Solver Design

Date: 2026-05-19

## Problem Statement

The current body rig produces a usable procedural stick figure, but the underlying body motion is not good enough. Shoulder motion is especially unstable: when hands move overhead, the shoulders can flip from one side to the other. The pelvis and hips are also too static, which makes the body feel like a line overlay rather than a coherent humanoid rig.

This work should improve the body solver first. Rendering volumes are useful, but they are secondary: the 2D and 3D figures should both consume the same better body-rig output rather than maintain separate shoulder and hip heuristics.

## Goals

- Make the body-rig solve more anatomically plausible while staying deterministic and testable.
- Fix overhead shoulder flipping with explicit singularity-safe shoulder-girdle behavior.
- Add pelvis and chest state so torso, hips, and shoulders are real solved body regions rather than renderer guesses.
- Define the canonical body-local pattern space from the largest circle both hands can overlap for the full pattern.
- Migrate 2D and 3D body consumers to the same upgraded body-rig contract with no compatibility shim.
- Keep projection and rendering as adapters over the solved body state.
- Add simple volumes so the figure is no longer just a stick figure, without making stylized cuteness the primary goal.

## Non-Goals

- No Ossos dependency in runtime.
- No Three.js `SkinnedMesh`, GLTF/VRM avatar import, skin weights, or full armature runtime.
- No physics, springs, learned smoothing, or frame-history smoothing to hide solver instability.
- No stepping or walking solver in this pass. Feet remain planted until stance/support is designed explicitly.
- No compatibility aliases for old and new skeleton fields. Rename or replace call sites in one migration.

## Research Summary

Unity, VRM, and Godot humanoid conventions converge on a practical hierarchy: hips/root, spine/chest, neck/head, shoulder/clavicle proxies, upper/lower limbs, and hands/feet. These systems generally treat arbitrary bone translation as special and limited. That supports a local deterministic solver based on a few authored body controls rather than a full animation runtime.

Ossos is useful as architecture reference, not as a dependency. The reusable ideas are named chains, explicit solve order, effector/pole separation, bind/support directions, and hip-first solve thinking. Its package and data model are too broad for this project: armatures, poses, skinning, GLTF data, and animation retargeting solve a different problem.

Shoulder research points to shoulder-girdle contribution during arm elevation. The solver does not need a medical scapula model, but overhead reach should visibly produce lift, protraction, and stable clavicle/shoulder behavior. Pelvis/core research supports treating the pelvis as the visual and kinematic anchor for load transfer between upper and lower body.

## Options Considered

### Option A: Renderer-Only Volumetric Puppet

This would leave the body solve unchanged and make the figure look better by deriving torso, pelvis, and limb volumes in the renderer.

Tradeoffs: low risk and fast, but it does not fix shoulder flipping or jerky motion. It would hide the real problem and leave 2D and 3D behavior drifting.

### Option B: Solver-First Humanoid Body Rig

This upgrades the body-rig layer with pelvis, chest, and shoulder-girdle solve passes, then migrates 2D and 3D consumers to the same output contract.

Tradeoffs: larger contract migration and more tests, but it fixes the root cause and makes future volumes, diagnostics, and projections better.

### Option C: Ossos/Skinned Avatar Lab Prototype

This would map poi inputs into an existing biped rig or imported avatar system.

Tradeoffs: interesting for a later avatar lab, but too much dependency surface and too little poi-specific control for the current solver problem.

## Recommendation

Choose Option B.

The first implementation should make the body-rig solve better and move all body visualizers onto the upgraded contract. Renderer volumes should be simple consumers of that solve: torso, pelvis, head, and limb volumes that reveal the improved pose without adding separate motion logic.

## Architecture

The body solve should be organized into ordered passes:

1. **Base frame pass**: establish performer axes, torso yaw, and initial body dimensions from existing inputs.
2. **Pelvis pass**: solve pelvis orientation and small position offset from torso yaw, hand midpoint drift, and reach asymmetry.
3. **Chest pass**: derive chest center and axes from torso/pelvis state.
4. **Shoulder-girdle pass**: solve side-specific shoulder lift, protraction/retraction, lateral travel, and diagnostics.
5. **Arm pass**: solve shoulder socket to elbow to hand after shoulder-girdle offsets.
6. **Head/neck pass**: connect head and neck to chest without letting head targets destabilize shoulders.
7. **Skeleton frame pass**: export the renderer-agnostic frame used by both 2D and 3D consumers.

The main source area is [src/body-rig](../../../src/body-rig). The 3D renderer in [src/lab/experiments/three-d-debug](../../../src/lab/experiments/three-d-debug) and 2D visualizer paths should become consumers of the same final skeleton frame.

## Output Contract

The body-rig output should expose body semantics, not mesh details.

### Canonical Pattern Space

The body-rig layer should define the canonical body-local space used by pattern authoring and visualization. This space is based on the largest circle that both hands can overlap for the whole pattern.

Rules:

- Compute the largest shared hand-overlap circle from the solved body dimensions, shoulder policy, yaw/projection limits, and arm reach range.
- The center of that shared overlap circle is the body-local origin.
- Unit length `1` is the radius of that shared overlap circle.
- A sequence with both arm radii at `1` should mean both hands can reach the entire unit circle for the full pattern, subject only to explicit boundary diagnostics.
- 2D and 3D consumers must use this same origin and unit scale. The 2D visualizer should not keep a separate normalization path.
- If the upgraded pelvis/chest/shoulder solver changes the shared overlap circle, the canonical origin and unit radius must update with the solver rather than being patched in a renderer.

The existing shared-overlap concept should become part of the authoritative body-rig contract, not a helper that only the 2D visualizer understands.

### Body Pose State

Add explicit solved state for:

- `pelvisCenter`, `pelvisForward`, `pelvisRight`, `pelvisUp`
- `chestCenter`, `chestForward`, `chestRight`, `chestUp`
- per-side shoulder-girdle values:
  - `shoulderBase`
  - `shoulderSocket`
  - `clavicleVector`
  - `lift`
  - `protraction`
  - `lateralTravel`
  - limit and ambiguity diagnostics

### Skeleton Frame State

Extend the skeleton contract with semantic joints needed by consumers:

- `pelvisCenter` if the existing pelvis point is overloaded
- `chest`
- `leftClavicle` and `rightClavicle`, or equivalent shoulder-girdle proxy joints

Segments should then describe the humanoid structure clearly:

- pelvis to chest
- chest to neck/head
- chest to clavicle to shoulder to elbow to hand
- pelvis to hip to knee to foot

This remains renderer-agnostic. It must not include Three.js meshes, materials, skin weights, or display-only volumes.

## Solver Details

### Pelvis

The pelvis is the anchor for the lower body. It should not remain a fixed decoration below shoulder center.

Rules:

- Pelvis yaw follows torso yaw partially, not exactly. A default range of about `25%` to `50%` of torso yaw is appropriate.
- Pelvis lateral counter-shift is derived from hand midpoint drift and reach asymmetry, bounded by a small ratio of shoulder span.
- Hip roll/tilt is tiny in this pass, and may be zero initially if it cannot be validated cleanly.
- Feet remain planted. Any impossible lower-body pose is reported as best-effort rather than silently corrected.

### Chest

Chest axes are derived from torso and pelvis state. The chest should be the parent frame for shoulder-girdle behavior and neck/head attachment. Chest motion should be bounded so a head or hand target cannot make the upper body snap.

### Shoulder Girdle

Shoulder motion should be continuous and decomposed into readable parts:

- `lift`: driven by arm elevation and extension.
- `protraction`: driven by forward reach.
- `retraction`: driven by backward reach.
- `lateralTravel`: driven by side reach, but reduced near overhead ambiguity.

The overhead flip fix is the key requirement. When the hand is overhead and horizontal projection is small, the solver must avoid binary side decisions. In that zone, lateral shoulder travel should smoothly fade toward neutral while lift and protraction remain active. The solver should expose an `overheadAmbiguous` diagnostic rather than letting side selection jump.

### Arms

Arms are solved after shoulder sockets are placed. The current elbow convention remains important: prefer forward depth first; native-side outward is secondary/fallback. The implementation should not clamp elbows to native side or pull them backward/vertical near horizontal full extension.

Reach clamping must be explicit and diagnostic per side.

### Head And Neck

Head and neck should attach to the solved chest frame. Head target influence can inform facing, but it must be bounded and should not drive shoulder side selection or destabilize torso yaw.

## 2D And 3D Migration

There should be one authoritative body solve.

- 3D debug rendering consumes the upgraded `BodySkeletonFrame`.
- 2D stick figure rendering consumes the same upgraded `BodySkeletonFrame`, then projects it into 2D.
- Any 2D-only shoulder, pelvis, or elbow heuristic should be removed or replaced by the shared solver output.
- Projection is an adapter. It can draw lines, capsules, labels, or simple volumes, but it must not solve shoulder side, pelvis yaw, clavicle offset, elbow pole, or reach limits.

No compatibility shim should preserve old 2D behavior. If contracts change, update all call sites and tests in the same pass.

## Volumetric Figure Follow-Through

Volumes are required as a consumer-level improvement, but they are not the core solver design.

The first volume pass should be simple:

- torso as a rounded or capsule-like volume from pelvis to chest/neck
- pelvis as a separate rounded volume
- head as a slightly larger solid volume
- limbs as capsules with segment-specific radii and visible gaps at joints
- reduced or removed joint spheres unless needed for diagnostics

This should read as a solid humanoid, not a stick figure, but it should not be optimized for cuteness. Visual style can be tuned after the solver is stable.

## Diagnostics And Boundary Behavior

The solver should report explicit diagnostics for:

- torso yaw limit hit
- pelvis yaw or shift limit hit
- shoulder lift/protraction/lateral limit hit per side
- overhead shoulder ambiguity per side
- arm reach clamped per side
- best-effort pose reasons

Both 2D and 3D consumers should display the same solved pose for impossible inputs. Neither consumer should hide solver limits with local pose correction.

## Testing Plan

### Unit Tests

- Overhead hand path crossing the singular zone does not flip shoulder side.
- Shoulder lateral travel fades continuously near overhead ambiguity.
- Lift and protraction remain active while lateral travel is damped.
- Mirrored inputs produce mirrored pelvis, shoulder, and arm outputs.
- Pelvis yaw follows torso yaw within configured ratio limits.
- Pelvis shift remains bounded.
- Arm reach clamping reports diagnostics and remains deterministic.
- Existing elbow forward-depth convention is preserved.

### Integration Tests

- 2D and 3D consumers read the same upgraded skeleton contract.
- Existing body-rig solve fixtures are migrated to the new output fields.
- Regression fixture for the current jerky overhead shoulder case is added or synthesized.
- Renderer volume sync uses solved joints and axes without adding shoulder or pelvis solve logic.

### Verification Commands

Run before completion:

```sh
pnpm test
pnpm typecheck
pnpm lint
```

## Migration Impact

This is a breaking internal contract change for body visualizers. The migration should be done as a hard rename/update across call sites, not a layered compatibility path.

Expected target areas:

- [src/body-rig/bodyRigConfig.ts](../../../src/body-rig/bodyRigConfig.ts)
- [src/body-rig/bodyRigDefaults.ts](../../../src/body-rig/bodyRigDefaults.ts)
- [src/body-rig/bodyRigFrame.ts](../../../src/body-rig/bodyRigFrame.ts)
- [src/body-rig/stickFigureGeometry.ts](../../../src/body-rig/stickFigureGeometry.ts)
- [src/body-rig/bodySkeletonFrame.ts](../../../src/body-rig/bodySkeletonFrame.ts)
- 2D body/stick figure visualizer consumers
- [src/lab/experiments/three-d-debug/bodyStickFigureRenderer.ts](../../../src/lab/experiments/three-d-debug/bodyStickFigureRenderer.ts)
- body-rig, visualizer, and lab tests

Docs and source must stay aligned. If the public skeleton contract changes, update docs and tests in the same implementation branch.