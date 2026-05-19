# Atomic Plane Breaks

## Problem Statement

The current engine evaluates deterministic local 2D poi motion: a body origin, a hand node, a head node, driver-specific segment motion, explicit segment durations, and half-open sequence boundaries.

The implemented POC is not arbitrary 3D motion. It is explicit support for atomic plane breaks: authored transitions where a pattern leaves one canonical plane and resumes in another at a derived boundary.

This is intentionally narrower than weaves, toroids, back planes, crosspoints, or body-aware topology. Those require continuous 3D path semantics later. Perfect atomic plane breaks are useful on their own for authoring and practicing anti-spin/stall-style patterns.

## Core Thesis

- Keep segment motion local and planar.
- Add atomic plane context to executable segments.
- Treat plane changes as explicit boundary events.
- Preserve existing 2D evaluation and rendering behavior by default.
- Add 3D embedding, projected plane views, and body-aware motion later.

## Atomic Planes

The first plane-break implementation supports three orthogonal atomic planes through the center/body origin:

- `wall`: the current implicit vertical front plane and default for existing sequences.
- `wheel`: a vertical depth plane that shares the world-up axis with `wall`.
- `floor`: a horizontal plane.

Every segment lies exactly in one atomic plane. A segment does not drift between planes or continuously bend its plane.

## Phase Semantics

Phase remains local to the active plane.

For local plane diagrams, use a common protractor convention:

- `0deg` points to the right horizon.
- `90deg` is the local quarter-turn direction.
- `180deg` points to the left horizon.
- positive rotation follows the plane's handedness convention.

`wall` and `wheel` feel similar because both are vertical and can share world-up as a local axis. `floor` still has local phase, but its axes are horizontal, so the same numeric phase no longer means top/bottom/up/down in the same spinner-facing way.

## Plane Break Semantics

A plane break is a composite-pattern join:

1. A segment ends in one atomic plane.
2. The next segment starts in another atomic plane.
3. Authoring compile validates that the boundary lies on the shared axis.
4. Relative head-to-hand phase is preserved. `wheel <-> floor` applies an absolute phase remap to both hand and head.

Plane changes are inferred from adjacent authored segment `planeId` values in this POC. No boundary mode field is implemented yet.

## Zero and Transition Vocabulary

Boundary annotations are future metadata. They would describe author intent but are not implemented yet.

Candidate zero/transition kinds:

- `lobe`
- `antilobe`
- `antispin`
- `stall`
- `pendulum`
- `authored`

Drex's lobe/antilobe vocabulary is useful because it is based on the velocity relationship between hand and poi rather than on ambiguous petal names. Future diagnostics can evaluate endpoint phase and velocity to classify likely transition points.

## Engine Model

The implemented engine slice makes each segment an executable interval with plane metadata and resolved active plane state:

```ts
type PlaneId = "wall" | "wheel" | "floor";
type PlaneSide = "a" | "b";

type CircleDriver = {
  kind: "circle";
  omega: number;
  radiusProfile?: RadiusProfile;
};

type PointToPointDriver = {
  kind: "point-to-point";
  endPose: RelativeNodePose;
};

type Segment = {
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  planeSide?: PlaneSide;
  hand: { startPose: RelativeNodePose; driver: CircleDriver | PointToPointDriver };
  head: { startPose: RelativeNodePose; driver: CircleDriver };
};
```

`prepareSequence` resolves omitted `planeId` values to `wall`. Prepared segments expose the resolved plane so consumers can inspect active plane state without changing local pose evaluation.

`planeSide` is optional generic metadata. It is valid on every atomic plane and is preserved through preparation and evaluation, but the engine does not default it or apply any visual offset to local pose evaluation. Rendering layers may choose to display side `a` and side `b` as offsets along the active plane normal.

`evalSegment` still returns local `RelativeRigPose`. Projection to the existing canvas happens in a separate plane adapter.

## Implemented Validation Rules

- Sequence cannot be empty.
- Durations must be finite and positive.
- `planeId`, when present, must be `wall`, `wheel`, or `floor`.
- `planeSide`, when present, must be `a` or `b`.
- Head drivers must be circle drivers; point-to-point is currently hand-only.
- Omitted authored and engine segment planes resolve to `wall`.
- Authored plane changes are valid only when the previous end pose is on the shared axis.
- The hand must be on the source plane's shared-axis cardinal.
- The head must be collinear with the hand: relative phase `0` or `PI`.
- `wheel -> floor` remaps both hand and head by `+ PI / 2`; `floor -> wheel` remaps both by `- PI / 2`.

## Accepted Limitations

This phase one does not support:

- arbitrary 3D paths,
- continuous plane bends,
- weaves, back planes, crosspoints, or toroids,
- side-transition or crosspoint legality,
- body zones, arm gates, or collision checks,
- automatic zero-point proof,
- stall physics or non-uniform hand timing,
- point-to-point authored controls,
- production WebGL/Three.js rendering beyond the narrow debug visualizer,
- explicit boundary mode fields,
- zero-point kind metadata.

These are not failures of the atomic-plane model. They are separate later scopes.

## Visual Follow-Up

The source-aligned visual path includes the existing 2D canvas:

- current pose projection for `wall`, `wheel`, and `floor`,
- projected trail sampling,
- plane-aware trail loop continuity,
- automatic projection preference that keeps wall-only sequences front orthographic,
- configurable tilted orthographic projection with yaw and pitch controls for non-wall planes or manual override.

The lab also includes a narrow Three.js debug visualizer for world-pose inspection. It renders the actual poi hand/head markers, tether, trails, origin plane sheets, and a procedural stick-figure body overlay. This remains a visual adapter over evaluated world poses; it does not add arbitrary 3D paths or body-aware topology to the engine runtime.

Phase atlases, stronger plane guides, and active plane highlighting are still visual follow-ups.

Broader WebGL scope remains useful later for body-aware 3D motion, camera orbit, occlusion, and continuous manifold paths.

## Iteration Path

1. Engine metadata and validation. Done for `planeId` defaulting, `planeSide` preservation, and active-plane eval state.
2. Authoring metadata support. Done for authored segments, compile, and editor selection.
3. Canvas projected atomic-plane output. Done with orthographic and tilted projection modes.
4. Optional phase atlas and stronger visual plane guides.
5. Body-aware graph/reels/weaves/manifolds as separate future scope.
