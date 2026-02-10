# Refactor Plan (Sequencer-Readiness)

## Purpose

This is the canonical execution plan for maintainability refactors before adding VTG sequencing and transition features.

The plan prioritizes:

1. deterministic correctness,
2. clear module boundaries,
3. stable long-term extension points,
4. minimizing semantic drift.

## Current Baseline

- Engine math and core VTG classification/generation are deterministic and well-covered.
- Runtime is currently feature-complete for single-state playback/editing and preset library workflows.
- Fixture generation uses state-case inputs (`fixtures/state-cases.json`) plus implicit `default`.
- Fixture state parsing now reuses shared persistence hydration semantics (no separate fixture schema parser).
- Legacy preset transform contract (`src/state/presets.ts`) has been removed.

## Execution Rules

- Execute one phase at a time.
- No mixed-phase commits.
- Every phase must complete code + tests + docs in one change.
- If a phase reveals hidden architectural risk, stop and amend this plan before continuing.

## Global Acceptance Gate (for every phase)

- `npm test` passes.
- `npm run build` passes.
- `npm run docs:all` passes (TypeDoc warnings acceptable unless they increase).
- `README.md` and relevant `docs/*.md` updated when behavior/contracts move.

## Hard Constraints

- Keep engine math pure and framework-agnostic.
- No UI-driven semantic forks in VTG/engine.
- Keep canonical internal angular units unchanged (radians, rad/beat, beats).
- Keep fixture generation deterministic.

---

## Phase 1: Remove Legacy Preset Contract

### Goal

Eliminate `src/state/presets.ts` as a core state contract and remove preset-id APIs that no longer represent runtime truth.

### Scope

- Remove:
  - `src/state/presets.ts`
  - `tests/state/presets.test.ts`
- Remove preset action surface:
  - `applyPreset` from `src/state/actions.ts`
  - `PresetId`/related preset types from `src/types/state.ts` if now unused.
- Update any docs and TypeDoc references that still describe preset transforms as active state APIs.

### File Targets

- `src/state/actions.ts`
- `src/types/state.ts`
- `src/engine/fixtures.ts` (if any remaining preset references)
- `tests/state/actions.test.ts`
- `docs/validation.md`
- `docs/glossary.md`
- `README.md`

### Exit Criteria

- No imports of `src/state/presets.ts` in `src/` or `tests/`.
- No runtime code path depends on preset ids.

---

## Phase 2: Finalize Fixture Case Architecture

### Goal

Make fixture inputs explicit, auditable, and easy to extend manually from JSON cases.

### Scope

- Add fixture-case validation tests for:
  - duplicate ids,
  - invalid schema version,
  - invalid case id format,
  - invalid state payloads via shared persistence hydration.
- Keep fixture parsing lean by reusing `deserializeState` semantics.
- Document manual case authoring examples.

### File Targets

- `src/engine/fixtureCases.ts`
- `tests/engine/fixtures.test.ts`
- `tests/engine/fixture-cases.test.ts` (new)
- `fixtures/state-cases.json`
- `docs/validation.md`
- `src/engine/README.md`

### Exit Criteria

- Adding a new case in `fixtures/state-cases.json` requires no code changes.
- Failure modes are explicit and actionable.

---

## Phase 3: Separate Durable State from Runtime Transport State

### Goal

Stop persisting and diffing volatile transport fields as if they were durable edit state.

### Status

Completed on 2026-02-08: app-state persistence plus preset-library/preset-file state payloads now serialize durable edit fields only; `global.t` and `global.isPlaying` are restored from defaults at hydration/import.

### Scope

- Introduce explicit durable-state projection:
  - transport-volatile fields (for example playhead and playback status) are excluded from persisted payloads.
- Update persistence/hydration to round-trip durable state only.
- Define and enforce restore policy for volatile fields.
- Bump persistence schema version intentionally.

### File Targets

- `src/state/persistence.ts`
- `src/composables/usePersistenceCoordinator.ts`
- `src/composables/useAppOrchestrator.ts`
- `tests/state/persistence.test.ts`
- `tests/app/persistence-coordinator.test.ts`
- `tests/ui/app.integration.test.ts`
- `README.md`
- `docs/validation.md`

### Exit Criteria

- Continuous playback does not trigger meaningful storage churn for moving playhead values.
- Hydration behavior is explicit and deterministic for volatile fields.

---

## Phase 4: Enforce Immutable App-State Commits

### Goal

Remove shared-reference mutation hazards between stored snapshots and live runtime state.

### Status

Completed on 2026-02-08: transport progression moved to pure `state/actions` updates (no `state.global.t += ...` mutation), orchestrator commit path clones incoming snapshots, and regression tests pin load/save preset alias safety under runtime transport ticks.

### Scope

- Ensure all state load paths clone/normalize state before commit.
- Remove direct in-place mutation from transport controller (`state.global.t += ...`) in favor of pure update helpers or reducer-style transition.
- Add tests proving loaded preset snapshots cannot be mutated by runtime clock progression.

### File Targets

- `src/composables/useTransportController.ts`
- `src/composables/usePresetLibraryController.ts`
- `src/composables/useAppOrchestrator.ts`
- `src/state/actions.ts` (if new pure helper needed)
- `tests/ui/app-orchestrator.integration.test.ts`
- `tests/app/transport-clock.test.ts`
- `tests/ui/app.integration.test.ts`

### Exit Criteria

- No controller mutates canonical state objects in place.
- Snapshot aliasing regressions are covered by tests.

---

## Phase 5: Tighten VTG Ownership and Semantics

### Goal

Keep VTG authoritative semantics isolated from descriptive/view language.

### Status

Completed on 2026-02-08: descriptive cardinal helpers were moved out of `src/vtg/classify.ts` into `src/vtg/descriptiveGeometry.ts`, authoritative classifier/generator paths remain phase-reference-invariant, and signed `poiCyclesPerArmCycle` conversion semantics were formalized in `src/vtg/types.ts` with dedicated tests.

### Scope

- Split descriptive cardinal helpers out of `src/vtg/classify.ts` into separate non-authoritative module.
- Formalize and document `poiCyclesPerArmCycle` semantics in code-level contract and tests.
- Ensure no phase-reference display concern changes authoritative VTG classification behavior.

### File Targets

- `src/vtg/classify.ts`
- `src/vtg/generate.ts`
- `src/vtg/types.ts`
- `src/components/VtgPanel.vue` (naming/readout alignment only)
- `tests/vtg/classify.test.ts`
- `tests/vtg/generate.test.ts`
- `docs/vtg-layer.md`
- `docs/glossary.md`

### Exit Criteria

- Authoritative VTG API is relation-focused and reference-invariant.
- Descriptive UI helpers are clearly labeled and isolated.

---

## Phase 6: Wave Rendering Cost Refactor

### Goal

Remove full-loop recomputation on every cursor redraw.

### Status

Completed on 2026-02-08: WaveCanvas now caches loop samples keyed by stable inputs (hands/bpm/loopBeats/sample rate) and only rebuilds lanes when the sample signature or theme changes, so playhead-only updates reuse cached samples.

### Scope

- Add wave sample/lane cache keyed by stable input signature (`hands`, `bpm`, `loopBeats`, sample rate, theme if needed).
- Redraw cursor on playhead movement without rebuilding loop sample arrays.
- Preserve deterministic rendering behavior.

### File Targets

- `src/components/WaveCanvas.vue`
- `src/render/waveRenderer.ts`
- `tests/ui/canvas-clock.integration.test.ts`
- `tests/render/wave-renderer.test.ts`

### Exit Criteria

- Playhead-only updates avoid `sampleLoop` recomputation.
- Existing wave output shape remains stable for fixed inputs.

---

## Phase 7: Import Boundary Enforcement

### Goal

Prevent future cross-layer coupling regressions.

### Status

Completed on 2026-02-08: lint now enforces import boundaries for `engine`/`vtg`/`state`/`render`/`composables`; known leaks were removed (`useTransportController` no longer imports `render`, and shared quarter-turn bucket typing moved into `src/types/state.ts` so `state` no longer depends on `vtg`).

### Why This Phase Exists

The repo now has enough moving parts that accidental cross-layer imports will silently create long-term coupling debt. We already have at least one active leak (`src/composables/useTransportController.ts` importing `normalizeLoopBeat` from `src/render/math.ts`), so this phase must lock boundaries before sequencer work starts.

### Boundary Contract (Target)

| Source zone | Can import | Cannot import | Notes |
| --- | --- | --- | --- |
| `src/engine/**` | `src/engine/**`, `src/types/**`, selected `src/state/**` constants/helpers explicitly listed | `src/components/**`, `src/composables/**`, `src/render/**` | Keep math/runtime core UI-agnostic. |
| `src/vtg/**` | `src/vtg/**`, `src/types/**`, pure math helpers from `src/state/**` | `src/components/**`, `src/composables/**`, `src/render/**` | VTG remains domain logic, not UI logic. |
| `src/state/**` | `src/state/**`, `src/types/**` | `src/components/**`, `src/composables/**`, `src/render/**`, `src/vtg/**` | State must not depend on higher-level domains. |
| `src/render/**` | `src/render/**`, `src/engine/**`, `src/types/**`, read-only theme/constants | `src/components/**`, `src/composables/**` | Render is pure projection; no orchestration concerns. |
| `src/composables/**` | `src/composables/**`, `src/state/**`, `src/engine/**`, `src/vtg/**`, `src/types/**` | `src/components/**`, `src/render/**` | Composables orchestrate state/domain, not render math internals. |
| `src/components/**`, `src/App.vue` | Any lower layer | n/a | UI edge may consume all lower layers. |

### Scope

- Define and document architectural import boundaries as lint-enforced policy.
- Remove known violations before enabling hard-fail lint rules.
- Expand lint coverage so boundary checks run on all relevant folders, not only `engine/vtg/state`.

### Implementation Plan

1. Baseline and classify current imports.
   - Run one import scan for `src/{engine,vtg,state,render,composables,components}`.
   - Record violations and intentional exceptions before changing rules.
2. Remove immediate leaks.
   - In `src/composables/useTransportController.ts`, import `normalizeLoopBeat` from `src/state/beatMath.ts` directly, not via `src/render/math.ts`.
   - Remove `src/state/phaseReference.ts` dependency on `src/vtg/types.ts` (`VTGPhaseDeg`) by moving that quarter-turn bucket type to a shared location (`src/types/state.ts` or a new neutral shared type module).
3. Add ESLint boundary rules with `no-restricted-imports` using per-folder `files` blocks in `eslint.config.mjs`.
   - Keep rules explicit by folder and alias path (for example `@/components/*`, `@/render/*`).
   - Add narrow allowlist exceptions only where architecturally justified (for example fixture integration utilities if needed).
4. Expand lint command coverage.
   - Update `package.json` `lint` script to include `src/{engine,vtg,state,render,composables}/**/*.{ts,tsx}` (and optionally component scripts if practical).
   - Ensure CI/local checks fail on boundary violations.
5. Lock with tests/docs.
   - Add one lint-focused regression test or script assertion if needed.
   - Update `README.md` and `docs/engine-architecture.md` (or equivalent architecture docs) with the enforced import policy.

### File Targets

- `eslint.config.mjs`
- `package.json` (lint scope)
- `src/composables/useTransportController.ts`
- `src/state/phaseReference.ts`
- `src/types/state.ts` (if shared type is moved here)
- boundary-touching modules surfaced by lint baseline
- `README.md`
- `docs/engine-architecture.md` (or most relevant architecture page)

### Exit Criteria

- Lint fails automatically for cross-layer imports that violate the boundary contract.
- `src/composables/useTransportController.ts` no longer imports from `src/render/**`.
- `src/state/**` no longer imports from `src/vtg/**`.
- `npm run lint`, `npm test`, `npm run build`, and `npm run docs:all` all pass.
- Boundary policy is written down in docs and matches ESLint rules (no drift).

---

## Phase 8: Sequencer Foundation Contracts (No UI Yet)

### Goal

Define the minimal sequencer domain in pure TypeScript with deterministic transitions.

### Scope

- Add sequencer domain module(s) under `src/state/` or `src/vtg/` with:
  - step model,
  - deterministic step timing in beat units,
  - pure reducer/transition functions.
- No canvas or controls integration in this phase.
- Add exhaustive unit tests for sequence stepping semantics.

### File Targets

- `src/state/sequencer.ts` (or equivalent)
- `src/types/state.ts` (if sequencer state shape is added)
- `tests/state/sequencer.test.ts`
- `docs/math-model.md`
- `docs/vtg-layer.md`

### Exit Criteria

- Sequencer stepping is test-pinned and UI-independent.

---

## Phase 9: App Orchestration Integration for Sequencer

### Goal

Integrate sequencer runtime into transport/persistence without reintroducing god-modules.

### Scope

- Add dedicated sequencer controller/composable.
- Integrate with existing transport clock ownership.
- Define persistence policy for sequencer state (durable vs volatile).
- Add integration tests for transport + sequencer synchronization.

### File Targets

- `src/composables/useAppOrchestrator.ts`
- `src/composables/useTransportController.ts`
- `src/composables/usePersistenceCoordinator.ts`
- `tests/ui/app.integration.test.ts`
- `tests/ui/app-orchestrator.integration.test.ts`

### Exit Criteria

- Sequencer progression remains deterministic under play/pause/scrub/static view interactions.

---

## Phase 10: Sequencer UI Layer

### Goal

Add sequencer controls as a thin UI layer over already-tested domain logic.

### Scope

- New controls panel(s) under `src/components/controls/`.
- Event-only wiring into orchestrator handlers.
- No business logic buried in components.
- Add panel contract tests + app integration tests.

### File Targets

- `src/components/controls/*Sequencer*.vue`
- `src/components/Controls.vue`
- `tests/ui/controls-panels.integration.test.ts`
- `tests/ui/app.integration.test.ts`
- `README.md`
- `docs/index.md`

### Exit Criteria

- Sequencer UI is discoverable, test-covered, and semantically aligned with domain contracts.

---

## Risks and Mitigations

1. Risk: hidden state aliasing survives Phase 4.
   - Mitigation: explicit regression tests that mutate runtime and assert stored snapshots remain unchanged.
2. Risk: persistence schema churn creates confusing compatibility behavior.
   - Mitigation: explicit schema version bump notes and hard-fail compatibility checks.
3. Risk: VTG semantics drift under UI wording changes.
   - Mitigation: keep authoritative classifier tests strict and independent of display helpers.
4. Risk: performance work changes rendering outputs.
   - Mitigation: preserve deterministic output tests and compare sampled values.

## Do Not Refactor (Unless Broken)

- Core oscillator equations in `src/engine/angles.ts`.
- Core position derivation in `src/engine/positions.ts`.
- Existing phase wrapping helpers in `src/state/phaseMath.ts`.

These are stable, deterministic, and already well-covered.

## Completion Definition

Refactor program is complete when:

- Phases 1-7 are done and all gates pass.
- Sequencer foundation (Phase 8) is test-pinned before UI integration.
- Sequencer integration (Phases 9-10) ships without reopening boundary violations.
- `README.md`, `docs/*`, and `docs/api/*` stay in sync for each phase.
- PHASES 8-9 MUST NOT BE STARTED. They are here for illustration only.
