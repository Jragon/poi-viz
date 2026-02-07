# Poi Visualiser Documentation

This site documents the executable contracts for the SPA under `src/`, with tests under `tests/` treated as the final authority.

## Scope Boundaries

In scope:
- Pure engine math and deterministic sampling in `src/engine`.
- VTG descriptor generation/classification in `src/vtg`.
- State defaults, unit conversion, and serialization contracts in `src/state`.

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

Representative validating tests:
- `tests/engine/invariants.test.ts`
- `tests/engine/sampling.test.ts`
- `tests/vtg/generate.test.ts`
- `tests/vtg/classify.test.ts`
- `tests/state/persistence.test.ts`

## Reading Order

1. `math-model.md` for equations, units, and invariants.
2. `engine-architecture.md` for module seams and deterministic sampling.
3. `vtg-layer.md` for VTG relation language and generator mapping.
4. `validation.md` for fixtures, regressions, and safe change workflow.
5. `glossary.md` for symbol-level terminology.
