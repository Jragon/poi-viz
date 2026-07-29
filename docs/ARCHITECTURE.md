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

The pendulum lab owns the calibration surface as well as the compositions: its circle-versus-pendulum experiment defines one unit as one circle or one complete pendulum cycle, compares cardinal checkpoints, and displays derived speed curves. Gravity is the default working curve; sine and constant-speed curves are deterministic comparison shapes. It also provides normalized gravity-reference motion as a lab-only runtime driver. The Rastaxel experiment composes one pendulum cycle and one circle into a two-unit motif, emits eight explicit quarter-unit segments per track with boundary poses, resolves independent left/right inward-outward flows using the beat-graph handedness convention, shares each hand's resolved direction across its oscillator and circle handoff, and phase-shifts the right track by an integer step offset while plotting instantaneous speed. Its optional hand-driver controls are separate from poi flow: each hand has its own radius, start phase, and signed omega in authored circles-per-unit (zero is static, one is one full circle per time unit); the right-track offset phase-shifts those hand drivers as part of the track. Ordinary, extended, isolated, paired-timing, mirrored, and extendulum compositions remain lab presets rather than new engine motion laws. Production authoring exposes circle and pendulum as explicit per-node driver choices and does not add hidden segment-level composition rules. The application-level pattern registry also converts the lab compositions into bundled, editable authored documents so they can be inspected as saved examples without making authoring core depend on lab code.

The Timing Orbit lab compiles a selected two-track authoring document, treats each track's authored
duration as an independent cycle, and overlays a separate uniform-time landmark train on each
cycle. It derives a bounded joint observation period when the track periods have a small rational
relationship; otherwise it uses an explicit bounded window. A right-track offset phase-shifts the
whole track while leaving the saved source unchanged. The lab builds an observation-only sequence
whose runtime callbacks sample the frozen compiled source across original segment and plane
boundaries. Quantization is therefore a display and analysis lens, not a new motion driver, authored
property, or stop-motion transformation.

The Gravity lab owns stateful physical experiments. Its deterministic ideal-tether simulator
precomputes fixed-timestep traces with explicit taut, slack, release, and catch states; a dedicated
canvas plays those traces without treating physics as a stateless engine driver. It separates
world and hand-relative speed, physical tension, gravity/hand/drive power, boundary work, catch
dissipation, and energy-balance residuals. Prescribed hand paths provide analytic position,
velocity, and acceleration; the first moving-pivot experiment compares ellipse, circle, and line
paths over the first complete poi loop and scans hand phase as a diagnostic. These models remain lab-only and do not redefine the engine's
kinematic pendulum or circle semantics.

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
Registry snapshot version 2 performs a one-time merge of newly bundled saved examples into version 1
libraries. After migration, users may edit or delete those ordinary saved entries without them being
silently restored on the next load.

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
