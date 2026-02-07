# Documentation Style Guide

## Purpose

Documentation in this repository is an implementation contract, not marketing copy.
Every non-trivial claim must be traceable to executable code and tests.

## Required Structure For Technical Claims

When documenting behavior, include:
- Source reference: file path + exported symbol.
- Validation reference: at least one test file that enforces the claim.
- Units and domains: radians/degrees, beats/seconds, tolerance bounds.
- Invariant statement when one exists.

Example format:
- Source: `src/engine/positions.ts` export `getPositions`.
- Validated by: `tests/engine/invariants.test.ts`.

Reference test anchors used throughout docs:
- `tests/engine/invariants.test.ts`
- `tests/vtg/generate.test.ts`
- `tests/state/persistence.test.ts`

## Terminology Rules

Use canonical terms from `docs/glossary.md`:
- `ω_arm`, `ω_rel`, `ω_head`
- `same-time`, `split-time`
- `same-direction`, `opposite-direction`
- `phaseDeg` bucket

If code uses a helper name instead of glossary notation, write both once and keep them linked.

## JSDoc Rules

JSDoc on exported functions in `src/engine`, `src/vtg`, and `src/state` should include:
- One-sentence purpose.
- `@param` descriptions for each parameter.
- `@returns` meaning, with units/constraints where relevant.
- Invariants/assumptions only when they affect correctness.

Validation enforcement:
- ESLint config `eslint.config.mjs` with `eslint-plugin-jsdoc`.

## Change Management

When changing behavior:

1. Update code.
2. Update tests.
3. Update docs pages that describe changed contracts.
4. Regenerate API docs with `npm run docs:api`.
5. Run `npm run docs:all` and `npm run lint`.

When adding new modules, document them in:
- `docs/engine-architecture.md` for architecture/data flow.
- `docs/math-model.md` or `docs/vtg-layer.md` for model changes.
- `docs/validation.md` for new executable checks.
