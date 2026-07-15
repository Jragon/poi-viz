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
- one `vrm.update(0)` call after normalized-bone posing, which performs the normalized-to-raw copy
  and authored node-constraint evaluation once per rendered frame.

## Runtime boundary

```text
prepared POI sequence
  -> deterministic world hand/head poses
  -> existing body reach/shoulder/torso solver
  -> BodySkeletonFrame (debug target contract)
  -> VrmStandingPoseAdapter
  -> pelvis placement + analytic planted-leg solves
  -> chest yaw + measured clavicle aim + analytic arm solves
  -> VRM normalized humanoid bones
  -> VRM raw skeleton, twist constraints, and skinned mesh
```

The adapter currently controls:

- a measured rig profile: arm segment lengths, shoulder-socket span, body proportions, anatomical
  side mapping, and a model-rest-basis correction;
- model scale from the avatar's maximum hand-overlap circle, normalized to a canonical radius of one;
- initial registration from the measured foot midpoint to the target planted-foot midpoint;
- per-frame pelvis placement and measured two-bone leg solves back to the planted feet;
- pelvis/chest yaw;
- measured fixed-length clavicles aimed toward the target shoulder sockets;
- a measured two-bone solve for each VRM arm from its actual socket to the solver wrist.

`left` and `right` always mean anatomical sides throughout the body-frame and VRM contracts. Audience
view is the default camera projection. The optional mirror view flips only the camera projection; it
does not swap target IDs, VRM bone names, POI inputs, or solver semantics. The profile also constructs
an orthonormal rest basis from the two shoulder sockets and hips, then rotates that basis onto the
engine's `+X/+Y/+Z` convention. This removes fixture-specific facing and rest-frame assumptions.

The avatar's shoulder bones are now aimed before the upper-arm solve. This preserves each measured
clavicle length while moving the real upper-arm socket toward the target socket. When a target socket
cannot be reached by that fixed-length clavicle, the adapter keeps the physical model length, solves
the wrist from the resulting real socket, and exposes the shoulder residual in diagnostics. It does
not stretch the model or translate the whole avatar to conceal the mismatch.

After socket registration, each avatar arm is solved again with that model's measured upper-arm and
forearm lengths. This is a retargeting step, not a second body-policy solve: it uses the already-solved
wrist, the target torso basis, and the same deterministic elbow policy. It prevents a small, honest
socket residual from being copied unchanged to the visible hand. If the wrist is unreachable from the
real socket, the avatar chain clamps explicitly and the residual remains visible in diagnostics.

It deliberately leaves the head, fingers, feet orientation, expression system, gaze, spring bones,
and locomotion in their reference state. `vrm.update(0)` prevents spring-bone motion from becoming
dependent on playback history.

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
- Model scale is derived explicitly from model and target canonical pattern radius; invalid radii
  throw, and the final target radius is asserted to be exactly one within tolerance.
- The measured model rest basis is aligned to the engine basis before posing.
- Target and VRM sides remain anatomical; mirror view changes projection only.
- Pelvis placement follows the solved body while both target feet remain fixed at their support
  positions.
- Avatar leg segment lengths are measured once and preserved by deterministic two-bone solves back to
  the planted feet.
- Avatar clavicle lengths are measured once and preserved while aiming real shoulder sockets toward
  the target sockets.
- The measured avatar arm lengths are preserved, and reachable solver wrists are hit even when the
  target and avatar shoulder sockets differ slightly.
- Pelvis, per-foot, and per-side shoulder/elbow/wrist errors are visible in the lab. Neutral reachable
  cases report `0.0000`; physically incompatible shoulder excursions and unreachable wrists retain
  explicit best-effort residuals.
- Missing required humanoid bones fail visibly rather than being silently ignored.
- Target-rig, POI-target, axes, grid, and upstream VRM-helper overlays can be toggled independently.
- Typecheck, lint, unit tests, production build, and browser loading are required for the lab slice.

## Standing arm IK decision

The standing solver keeps an analytic two-bone solve for each arm rather than adding a generic CCD or
FABRIK package. A generic chain solver can place a wrist, but it does not define the human policy that
matters here: which way the elbow bends, when the clavicle moves, how much the chest turns, or what
happens at a singularity. The existing analytic solve is deterministic, exact for reachable targets,
and exposes explicit error for unreachable targets. Replacing it would add iteration and tuning without
removing those policy decisions.

The current solver pass adds the following behavior:

- a continuous elbow-pole blend between forward and outward references, including forward-reach and
  overhead singularities;
- elbow bend and reach-error diagnostics on the public skeleton-frame debug contract;
- shoulder sockets solved in the same reduced-yaw chest frame that is applied to the VRM;
- an anchored chest center by default, with overhead movement assigned to the shoulder girdle instead
  of silently stretching the torso;
- a lower default torso-yaw ceiling to avoid implausible upper-body twists;
- a deterministic local refinement pass around the best coarse yaw candidate, reducing visible
  one-degree quantization without making the solver history-dependent;
- fixed arms-down, T-pose, forward, overhead, crossed, behind, asymmetric, and unreachable cases in
  the lab, backed by deterministic numeric tests.

The canonical corpus asserts exact upper-arm and forearm lengths, exact hand placement for reachable
cases, explicit symmetric clamping for the unreachable case, bilateral symmetry, and elbow-pole
continuity through the two important singular regions. The lab selector makes the same cases available
for model-versus-target visual inspection.

## Known limitations and next milestone

The VRM layer remains a renderer/rig adapter rather than a general iterative IK system. The standing
pose is now rooted through planted feet and a driven pelvis, but the following work remains separate:

1. Add a neutral, uncluttered VRM asset while retaining the official constraint sample as a fixture.
2. Add clavicle length to the target body contract so the body solver itself produces shoulder
   sockets on a physically reachable clavicle arc. The adapter already preserves the avatar's
   measured clavicle and reports any target mismatch.
3. Distribute torso orientation through spine/chest joints rather than applying the current pelvis
   and chest yaw split only.
4. Add ankle orientation and explicit ground-plane contact if foot mesh rotation becomes visible with
   a less stylized model.
5. Add temporal continuity policy only when live playback demonstrates a real discontinuity; do not
   make the deterministic pose solve history-dependent by default.
6. Add root turns and stepping as a lower-body/locomotion controller. Short authored turn clips
   or a dedicated controller are preferable to inferring steps from arm coordinates.

A general constrained solver remains an option for the future coupled root, spine, and foot problem.
It should only be introduced if canonical lower-body cases demonstrate that the analytic standing model
cannot satisfy the required constraints.

## Migration impact

There is no engine API change. The experiment is a lazy-loaded lab route and depends only on existing
world-pose and `BodySkeletonFrame` outputs. A future avatar swap should update the fixture metadata and
calibration tests, not create a compatibility layer or alter prepared sequence behavior.
