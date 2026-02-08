# Poi Visualiser Documentation

This site documents the executable contracts for the SPA under `src/`, with tests under `tests/` treated as the final authority.

## Scope Boundaries

In scope:
- Pure engine math and deterministic sampling in `src/engine`.
- VTG descriptor generation/classification in `src/vtg`.
- State defaults, unit conversion, and serialization contracts in `src/state`.
- Transport and canvas data-flow behavior that affects deterministic visualization (for example static full-loop pattern view).

Out of scope:
- Canvas paint style details in `src/render` unless needed to explain data flow.
- Vue layout decisions unless they change engine, VTG, or state contracts.

## Source-of-Truth Rule

Non-trivial claims in these docs are traceable to code and tests.

Primary modules:
- `src/engine/angles.ts` export `getAngles`.
- `src/engine/positions.ts` export `getPositions`.
- `src/engine/sampling.ts` export `sampleLoop`.
- `src/vtg/generate.ts` export `generateVTGState`.
- `src/vtg/classify.ts` exports `classifyArmElement`, `classifyPoiElement`, `classifyPhaseBucket`.
- `src/state/persistence.ts` exports `serializeState`, `deserializeState`, `resolveInitialState`.
- `src/composables/usePersistenceCoordinator.ts` export `usePersistenceCoordinator`.
- `src/composables/useTransportController.ts` export `useTransportController`.
- `src/composables/useThemeController.ts` export `useThemeController`.
- `src/composables/useShareLinkController.ts` export `useShareLinkController`.
- `src/composables/usePresetLibraryController.ts` export `usePresetLibraryController`.
- `src/composables/useAppOrchestrator.ts` export `useAppOrchestrator`.
- `src/render/viewTransform.ts` exports render-space rotation helpers for phase-reference orientation.

Representative validating tests:
- `tests/engine/invariants.test.ts`
- `tests/engine/sampling.test.ts`
- `tests/vtg/generate.test.ts`
- `tests/vtg/classify.test.ts`
- `tests/state/persistence.test.ts`
- `tests/app/persistence-coordinator.test.ts`
- `tests/ui/app-orchestrator.integration.test.ts`
- `tests/ui/canvas-clock.integration.test.ts`
- `tests/render/view-transform.test.ts`

## Reading Order

1. `math-model.md` for equations, units, and invariants.
2. `engine-architecture.md` for module seams and deterministic sampling.
3. `vtg-layer.md` for VTG relation language and generator mapping.
4. `validation.md` for fixtures, regressions, and safe change workflow.
5. `glossary.md` for symbol-level terminology.
