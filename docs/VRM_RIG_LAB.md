# VRM Standing Rig Lab

This document records the first VRM rig integration decision and the boundary of the implementation
at `/lab/vrm-rig`. Source remains authoritative when this document and the code disagree.

## Problem statement

The POI engine produces deterministic hand and head coordinates, but a useful human display also
needs a skinned mesh, a standard humanoid skeleton, joint constraints, and a debuggable mapping from
the body solver into that skeleton. The earlier experimental mannequin mixed those concerns and made
it difficult to distinguish a bad body solve from bad model geometry or bone application.

## Options considered

### A. Continue the custom Three.js mannequin and custom skeleton

- Full control over geometry and bone layout.
- Highest implementation and maintenance cost.
- Repeats solved asset-loading, humanoid-normalization, skinning, and constraint work.
- Makes it easy for a model defect to be mistaken for a solver defect.

### B. Use VRM as the avatar boundary and keep the existing body solver

- Reuses VRM 1.0 humanoid bone naming, normalized bones, skinning, and authored node constraints.
- Keeps deterministic POI/body solving independent of the render asset.
- Allows the fixture to be replaced without changing engine or body-solver contracts.
- Still requires a small procedural pose adapter; VRM does not solve arbitrary hand targets.

### C. Add a general animation/retargeting or full-body IK system immediately

- Eventually useful for locomotion, foot planting, and imported animation clips.
- Adds state, tuning, and a much larger debugging surface before stationary arm posing is proven.
- Does not remove the need to define how POI hand coordinates constrain the body.

## Decision

Use option B for the standing-rig milestone.

The lab loads a real VRM 1.0 file with `@pixiv/three-vrm`, drives its normalized humanoid bones from
the existing deterministic `BodySkeletonFrame`, then lets the VRM library copy the normalized pose to
the raw skinned skeleton and evaluate authored twist constraints. Locomotion and a general animation
system remain out of scope until the standing arm solve is reliable.

The implementation follows the lifecycle used by the upstream `three-vrm` examples:

- `GLTFLoader` with `VRMLoaderPlugin`;
- normalized humanoid bones rather than model-specific raw bone names;
- `removeUnnecessaryVertices`, `combineSkeletons`, and `combineMorphs` after load;
- an optional upstream helper root for bone and constraint inspection;
- `deepDispose` on teardown;
- normalized-bone update before node-constraint evaluation.

## Runtime boundary

```text
prepared POI sequence
  -> deterministic world hand/head poses
  -> existing body reach/shoulder/torso solver
  -> BodySkeletonFrame (debug target contract)
  -> VrmStandingPoseAdapter
  -> VRM normalized torso + arm bones
  -> VRM raw skeleton, twist constraints, and skinned mesh
```

The adapter currently controls:

- model scale and shoulder-girdle placement, calibrated from arm reach;
- pelvis/chest yaw;
- left and right shoulder, upper-arm, and lower-arm directions.

It deliberately leaves the head, fingers, hips, legs, expression system, gaze, spring bones, and
locomotion in their reference state. `vrm.update(0)` prevents spring-bone motion from becoming dependent
on playback history.

## Fixture

The checked-in fixture is
`public/models/vrm/VRM1_Constraint_Twist_Sample.vrm`, from the official VRM specification samples.
It is valuable because it contains authored upper/lower-arm twist constraints and exercises the real
VRM 1.0 import path. It is not the final visual design: the stylized body and large costume make it a
poor neutral anatomical mannequin.

Source and licence details are recorded beside the asset in `public/models/vrm/README.md`. The model is
isolated behind `vrmModel.ts`, so replacing it should not alter the solver or pose adapter.

## Validation and invariants

- Identical `BodySkeletonFrame` inputs produce identical normalized bone rotations.
- Model scale is derived explicitly from model and target arm reach; invalid reaches throw.
- The normalized upper-arm and lower-arm world directions match the corresponding solver segments.
- Missing required humanoid bones fail visibly rather than being silently ignored.
- Target-rig, POI-target, axes, grid, and upstream VRM-helper overlays can be toggled independently.
- Typecheck, lint, unit tests, production build, and browser loading are required for the lab slice.

## Known limitations and next milestone

The VRM layer is now a renderer/rig adapter, not an IK solver. Awkward poses visible in both the
translucent target rig and solid model originate upstream in the body solve, especially when reach or
pelvis-shift limits are hit. The next useful investment is therefore a solver/debug pass, not more model
code:

1. Add a neutral, uncluttered VRM asset while retaining the official constraint sample as a fixture.
2. Add canonical pose cases (down, side, forward, overhead, crossed, behind) with numeric joint-limit
   and continuity assertions.
3. Improve shoulder/scapula, elbow-pole, torso-yaw, and unreachable-target behavior against those cases.
4. Only then add root turns and foot placement; use short authored locomotion clips or a dedicated
   lower-body controller rather than deriving walking from arm coordinates.

## Migration impact

There is no engine API change. The experiment is a lazy-loaded lab route and depends only on existing
world-pose and `BodySkeletonFrame` outputs. A future avatar swap should update the fixture metadata and
calibration tests, not create a compatibility layer or alter prepared sequence behavior.
