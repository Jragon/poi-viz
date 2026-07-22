# Repository Architecture

This document describes the current source architecture. `src/` remains implementation truth when this document and code disagree.

## Dependency Direction

```text
Vue application shell (`pages`, `components`, router)
  ├─> authoring UI
  ├─> visualizer
  └─> lab experiments

lab experiments ──> authoring core / visualizer / body-rig / engine
authoring core  ──> engine
visualizer      ──> body-rig / engine
body-rig        ──> engine
engine          ──> no application-specific layer
```

Dependencies should point toward the engine. The engine must not import authoring, body-rig, visualizer, lab, page, or component code. Experimental theory belongs in `src/lab/` until a source-aligned engine contract justifies moving a minimal concept downward.

## Layer Responsibilities

### Engine

`src/engine/` owns the executable motion model:

- local 2D hand and head motion;
- circle, point-to-point, and runtime driver dispatch;
- sequence and multi-rig preparation;
- explicit segment-boundary transport and loop evaluation;
- atomic `wall`, `wheel`, and `floor` metadata;
- plane projection helpers and trace sampling primitives.

Built-in circle, pendulum, and point-to-point drivers are validated and deterministic for identical prepared inputs and times. Pendulum is a kinematic angular oscillator, not a gravity integrator. The engine does not contain QFT, CAPs, VTG, body-tracing generators, rendering, or authoring policy.

### Authoring

`src/authoring/` owns editable document types, authoring-specific validation, persistence, and compilation into `MultiRigSequence`. Compilation is an adapter into the engine contract. It may derive continuation data for the authored workflow, but that behavior is not an implicit engine fixup.

Authoring Vue components may embed visualizer components for previews. Core authoring compilation and validation should remain usable without the UI.

### Body Rig and Visualizer

`src/body-rig/` owns body geometry, frames, and projection helpers. `src/visualizer/` owns playback, display state, trail sampling, Canvas rendering, overlays, export, and interaction. These layers may interpret engine metadata for display, but must not silently alter engine poses or segment boundaries.

### Lab

`src/lab/` owns experimental generators, evaluators, journals, and Three.js debug surfaces. Lab code may combine the other layers and may use `RuntimeDriver` when a declarative built-in driver is not flexible enough.

The pendulum lab composes the built-in pendulum driver into ordinary, extended, isolated, paired-timing, mirrored, and extendulum experiments. Those compositions remain lab presets rather than new engine motion laws. Production authoring exposes circle and pendulum as explicit per-node driver choices; it does not import the lab presets or add hidden segment-level composition rules.

The VRM standing-rig experiment is a replaceable consumer of `BodySkeletonFrame`: it maps the existing
deterministic solver result into VRM normalized humanoid bones and keeps model loading, skinning, and
authored constraints outside the engine. Its decision record and current limitations are documented in
[`VRM_RIG_LAB.md`](./VRM_RIG_LAB.md).

Runtime drivers are deliberately unsafe. Preparation validates only that a runtime driver has a non-empty label and an `evalPose` function. The callback owns its output validity, purity, exception behavior, and determinism. This exception must remain explicit at call sites and must not weaken validation of built-in drivers.

### Application Shell

`src/pages/`, `src/components/`, `src/App.vue`, and `src/router.ts` compose production and experimental surfaces. Route availability is an application concern, not an engine capability declaration.

## Preparation Trust Boundary

`prepareSequence(input: unknown)` and `prepareMultiRigSequence(input: unknown)` are defensive trust boundaries. They:

- reject missing or malformed execution-critical structure;
- validate built-in numeric and semantic constraints;
- ignore unrelated properties so callers retain limited schema flexibility;
- return structured errors instead of silently correcting invalid input;
- clone accepted data into deeply frozen prepared snapshots.

Evaluation operates on prepared state. Later mutation of caller-owned input must not change built-in evaluation.

## Current Scope Boundaries

The engine represents a two-node `hand -> head` chain moving in local 2D coordinates. Atomic plane metadata and adapters can project that motion into world and display coordinates. This does not make arbitrary 3D paths, continuous plane bends, body-aware topology, or automatic correction part of the engine model.

Canvas rendering, humanoid body overlays, and the Three.js debug visualizer exist above the engine and should remain replaceable consumers of engine output.

### Pattern Registry

The src/patterns layer is an application-level integration layer above authoring and lab source
documents. It owns the saved pattern catalogue, folders, global selection, localStorage persistence,
and the explicit-save working-copy boundary. It may depend on source validators and compilers to
provide a shared viewer resolver, but those compilers remain responsible for their own semantics.

The registry stores serializable authoring, stall-graph, and beat-graph source data. It must not store
prepared sequences or runtime-driver callbacks. Editors load compatible deep-cloned working copies;
the main visualizer and 3D consumers compile the globally selected saved source. A selected source
that is incompatible with an editor causes that editor to use its existing default source.
Registry records own the common display metadata; the current authoring payload retains its historical
name and description fields until the authored-content shape is migrated separately.

## Reproducible Verification

The supported toolchain is Node.js 22 with the pnpm version pinned in `package.json`. A clean verification run is:

```sh
corepack pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm typecheck` uses `vue-tsc`, so both TypeScript and Vue single-file components are checked. CI runs the same gates on pull requests and pushes to `main`.
