# Refactor Plan (Pre-Sequencer Baseline)

Last updated: 2026-02-08 (Phase G complete)  
Owner: Rory + Codex  
Mode: One phase at a time, no bundled mega-refactors

## Locked Decisions

These are fixed unless Rory explicitly changes them:

1. Clock ownership: **Option A** - single RAF transport service.
2. Phase reference semantics: **Option A** - reference is view-only.
3. Hydration precedence: **Option A** - URL > localStorage > defaults.
4. UI coverage strategy: **Option A** - lean integration tests only for critical flows.
5. Refactor batching: **Option A** - one phase per PR/change set.

## Success Criteria (Global)

- Reduced coupling between UI/state/render layers.
- Single timing/transport ownership.
- No `state -> render` imports.
- Single source of truth for wrap/clamp/conversion utilities.
- Single source of truth for VTG element mapping.
- `App.vue` significantly slimmer (orchestration extracted).
- `Controls.vue` significantly slimmer (domain/UI split).
- Lean component/integration coverage for App/Controls/VTG flows.
- Clear insertion point for VTG Phase 2 sequencer.

## Phase Tracker

| Phase | Name | Status | Gate |
|---|---|---|---|
| A | Safety Net Before Surgery | Completed (2026-02-08) | Integration tests added and stable |
| B | Unify Competing Truths | Completed (2026-02-08) | Single mapping + shared math helpers |
| C | Remove State -> Render Leak | Completed (2026-02-08) | Zero imports from `src/state` to `src/render` |
| D | Split Phase Reference Semantics | Completed (2026-02-08) | View reference no longer mutates physical state implicitly |
| E | Single Transport Clock | Completed (2026-02-08) | Exactly one RAF owner |
| F | Persistence Centralization | Completed (2026-02-08) | Idempotent hydration + centralized policy |
| G | Extract App Orchestration | Completed (2026-02-08) | `App.vue` becomes thin composition shell |
| H | Split Controls | Pending | `Controls.vue` reduced and panelized |
| I | Sequencer-Ready Gate | Pending | All checklist items satisfied |

---

## Phase A - Safety Net Before Surgery

### Goal
Pin critical runtime behavior before invasive refactors.

### Scope
- Add UI/integration tests (lean set).
- Configure test environment for Vue component integration.

### Required Tests
- Hydration precedence: URL > localStorage > defaults.
- Transport semantics: play/pause/scrub/static behavior.
- Controls commit semantics: blur/enter commit, no mid-input coercion.
- VTG apply flow: descriptor application mutates expected state.

### Acceptance Criteria
- Existing tests remain green.
- New integration tests are deterministic and non-flaky.
- No snapshot-heavy test debt.

### Execution Notes
- Completed on 2026-02-08.
- Added integration suite under `tests/ui/`:
  - `tests/ui/app.integration.test.ts`
  - `tests/ui/controls-input.integration.test.ts`
- Updated test config for Vue SFC + jsdom UI scope in `vitest.config.ts`.
- Validation run:
  - `npm test` (89 passing)
  - `npm run build` (passing)

### Risks
- Timer/RAF flakiness in test runner.

### Rollback
- Keep only core high-value integration contracts, defer secondary scenarios.

---

## Phase B - Unify Competing Truths

### Goal
Remove duplicated mapping and duplicated conversion/wrapping logic.

### Scope
- VTG relation mapping in one authoritative module.
- Shared wrap/clamp/conversion utilities for state + VTG.

### Required Tests
- Mapping consistency tests between VTG + presets.
- Utility tests for phase wrapping and bucket conversion.
- Existing VTG/state regression suites remain green.

### Acceptance Criteria
- One mapping source only.
- No duplicate wrap/bucket math implementations across modules.

### Execution Notes
- Completed on 2026-02-08.
- Added shared phase math utilities in `src/state/phaseMath.ts`:
  - `normalizeDegrees0ToTurn`
  - `normalizeRadians0ToTau`
  - `shortestAngularDistanceRadians`
- Updated `src/state/phaseReference.ts` and `src/vtg/classify.ts` to reuse shared phase math helpers.
- Consolidated VTG relation semantics to one source in `src/vtg/types.ts` via `VTG_ELEMENT_RELATIONS`.
- Updated `src/state/presets.ts` to derive element preset behavior from VTG relations (`getRelationForElement`) instead of duplicate timing/direction flags.
- Added/expanded tests:
  - `tests/state/phase-math.test.ts`
  - `tests/state/presets.test.ts` mapping-alignment coverage
- Validation run:
  - `npm test` (93 passing)
  - `npm run build` (passing)

### Risks
- Silent semantic drift if migration is partial.

### Rollback
- Revert mapping consolidation commit independently.

---

## Phase C - Remove State -> Render Boundary Leak

### Goal
Restore architectural boundary: state domain does not depend on render layer.

### Scope
- Move beat normalization helper to neutral domain utility.
- Update imports accordingly.

### Required Tests
- Extend action tests for beat wrapping edge cases.
- Add focused utility tests for loop normalization.

### Acceptance Criteria
- `src/state/*` has zero imports from `src/render/*`.
- Behavior unchanged.

### Execution Notes
- Completed on 2026-02-08.
- Added neutral beat utility module `src/state/beatMath.ts` with `normalizeLoopBeat`.
- Updated `src/state/actions.ts` to import `normalizeLoopBeat` from `src/state/beatMath.ts` (removed `state -> render` dependency).
- Updated `src/render/math.ts` to consume and re-export `normalizeLoopBeat` from shared beat utility for compatibility.
- Added/expanded tests:
  - `tests/state/beat-math.test.ts`
  - `tests/state/actions.test.ts` negative-playhead wrap case
- Verified there are no `src/state` imports from `src/render`.
- Validation run:
  - `npm test` (96 passing)
  - `npm run build` (passing)

### Risks
- Minimal (mostly module move risk).

### Rollback
- Revert isolated boundary-fix commit.

---

## Phase D - Split Phase Reference Semantics

### Goal
Separate coordinate-frame display semantics from physical-state mutation.

### Scope
- Define explicit contracts:
  - view reference selection
  - no implicit physical mutation on reference change
- Align persistence and VTG behavior to explicit contracts.

### Required Tests
- Reference toggle does not implicitly mutate physical state.
- Persistence hydration keeps canonical arm phases stable.
- App event pipeline preserves canonical arm phases on reference toggle.
- VTG phase bucket behavior remains correct under reference changes.

### Acceptance Criteria
- No hidden physical mutation on reference UI change.
- Behavior is explicit in tests/docs.

### Execution Notes
- Completed on 2026-02-08.
- Updated `src/state/actions.ts` so `setGlobalPhaseReference` is metadata-only (no implicit arm-phase rotation).
- Added/expanded tests:
  - `tests/state/actions.test.ts` now asserts reference changes preserve canonical arm phases.
  - `tests/state/persistence.test.ts` now asserts hydration treats `phaseReference` as view metadata.
  - `tests/ui/app.integration.test.ts` now asserts App event pipeline preserves arm phases on `set-phase-reference`.
- Updated docs for the new contract:
  - `README.md`
  - `docs/math-model.md`
  - `docs/glossary.md`
- Validation run:
  - `npm test` (98 passing)
  - `npm run build` (passing)

### Risks
- User-visible behavior shift from current implementation.

### Rollback
- Temporary compatibility mode while migrating.

---

## Phase E - Single Transport Clock (Option A)

### Goal
Replace multiple RAF loops with one authoritative transport clock.

### Scope
- Single transport service/composable owns `t` progression.
- Canvases consume time; they do not own independent timing loops.

### Required Tests
- Play/pause progression contract.
- Scrub pauses transport and sets deterministic beat.
- Static mode freezes transport and still renders deterministic static trails.
- No drift between wave cursor and pattern frame.

### Acceptance Criteria
- Exactly one RAF owner in runtime architecture.
- Visual behavior parity with current baseline.

### Execution Notes
- Completed on 2026-02-08.
- Added single transport clock service in `src/composables/transportClock.ts` and rewired `src/App.vue` to use it as the only RAF owner.
- Removed independent RAF loops from:
  - `src/components/PatternCanvas.vue`
  - `src/components/WaveCanvas.vue`
- Canvas redraw is now invalidation-driven (prop/state updates + resize observer) instead of self-scheduled animation loops.
- Added/expanded coverage:
  - `tests/app/transport-clock.test.ts`
  - `tests/ui/app.integration.test.ts` transport progression + cross-canvas sync assertions
  - `tests/ui/canvas-clock.integration.test.ts` no-canvas-RAF ownership assertions
- Updated docs:
  - `README.md`
  - `docs/engine-architecture.md`
- Validation run:
  - `npm test` (passing)
  - `npm run build` (passing)

### Risks
- Perceived smoothness/performance changes.

### Rollback
- Temporary switchable old/new clock path until parity validated.

---

## Phase F - Persistence Centralization (Option A)

### Goal
Centralize schema policy, hydration precedence, and sync behavior.

### Scope
- One persistence coordinator/composable owns:
  - schema compatibility/purge
  - hydration precedence
  - sync debounce
  - share URL generation policy

### Required Tests
- Idempotent hydration (`hydrate -> serialize -> hydrate` stable).
- URL-first precedence test.
- Incompatible payload purge behavior.
- Share-link generation does not alter normal edit URL state.

### Acceptance Criteria
- `App.vue` no longer directly manages storage key logic and compatibility checks.
- Hydration policy is explicit and tested.

### Execution Notes
- Completed on 2026-02-08.
- Added centralized persistence policy service in `src/composables/persistenceCoordinator.ts` for:
  - URL-first hydration resolution
  - incompatible local payload purge for app state and preset library
  - debounced app-state local sync
  - share-link URL generation from clean base URL
- Refactored `src/App.vue` to consume the coordinator and removed direct ownership of:
  - state/preset compatibility checks
  - localStorage key-level read/write/purge policy
  - app-state debounce timer logic
  - share-link base URL stripping/build logic
- Added/expanded tests:
  - `tests/app/persistence-coordinator.test.ts`
  - `tests/ui/app.integration.test.ts` share-link URL non-mutation assertion
- Updated docs:
  - `README.md`
  - `docs/index.md`
- Validation run:
  - `npm test` (109 passing)
  - `npm run build` (passing)

### Risks
- Import/export edge-case regressions.

### Rollback
- Keep public persistence API stable while moving internals.

---

## Phase G - Extract App Orchestration

### Goal
Make `App.vue` a thin composition shell.

### Scope
- Move transport/persistence/theme/preset/VTG orchestration into composables/services.

### Required Tests
- App integration parity tests before/after extraction.
- Module-level tests for new orchestration units.

### Acceptance Criteria
- `App.vue` script reduced materially.
- Business logic lives outside component root.

### Execution Notes
- Completed on 2026-02-08.
- Added orchestration composable `src/composables/useAppOrchestrator.ts` to own root-level runtime behavior:
  - transport wiring
  - persistence hydration/sync delegation
  - theme toggling persistence
  - VTG apply dispatch
  - preset library save/load/delete/import/export handlers
  - copy-link flow and UI status timers
- Refactored `src/App.vue` into a thin composition shell that consumes orchestrator outputs/events and contains no business-flow orchestration.
- Added module-level orchestration coverage:
  - `tests/ui/app-orchestrator.integration.test.ts`
- Existing App integration suite remained green for behavior parity:
  - `tests/ui/app.integration.test.ts`
- Updated docs:
  - `README.md`
  - `docs/index.md`
- Validation run:
  - `npm test` (112 passing)
  - `npm run build` (passing)
  - `npm run docs:all` (TypeDoc warnings only)

### Risks
- Side-effect ordering regressions.

### Rollback
- Extract one concern per change set (theme, then persistence, etc.).

---

## Phase H - Split Controls

### Goal
Reduce `Controls.vue` complexity and isolate domain logic from panel UI.

### Scope
- Split into focused subcomponents:
  - Transport
  - Global settings
  - Hand settings
  - Preset library
  - Help
- Shared numeric commit/validation utility.

### Required Tests
- Component emit-contract tests per panel.
- Integration tests for cross-panel interactions and commit behavior.

### Acceptance Criteria
- `Controls.vue` reduced significantly.
- Shared input commit utility used across number fields.

### Risks
- Parent/child event contract breakage.

### Rollback
- Migrate panel-by-panel with parity checks after each extraction.

---

## Phase I - Sequencer-Ready Gate

### Goal
Verify architecture is clean enough to add VTG Phase 2 without reintroducing slop.

### Gate Checklist
- [ ] One RAF owner.
- [ ] No `state -> render` imports.
- [ ] Single VTG mapping source.
- [ ] Single conversion/wrap/clamp utility source.
- [ ] View-only phase-reference semantics are explicit and tested.
- [ ] Persistence centralized and hydration idempotent.
- [ ] `App.vue` is a thin composition shell.
- [ ] `Controls.vue` split and simplified.
- [ ] Lean integration suite covers hydration/transport/controls/VTG apply.
- [ ] Engine contracts and fixture regressions remain green.

---

## Working Rules While Executing This Plan

- One phase at a time.
- No behavior-expanding feature work during refactor phases.
- Each phase must finish with tests passing before next phase starts.
- If a phase reveals hidden semantic ambiguity, pause and capture a decision before proceeding.

## Change Log

- 2026-02-08: Initial plan created from maintainability review, with all five Rory decisions locked.
- 2026-02-08: Phase E completed with single transport clock ownership and canvas RAF removal.
- 2026-02-08: Phase F completed with centralized persistence policy and idempotent hydration coverage.
- 2026-02-08: Phase G completed with App orchestration extracted into `useAppOrchestrator` and root shell simplification.
