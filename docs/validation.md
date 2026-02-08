# Validation

## Validation Stack

The repository uses three executable validation layers:

1. Invariant tests for geometry and special cases.
2. Deterministic sampling/trail regression tests.
3. Golden fixtures generated from explicit state cases and compared in CI.

Primary references:
- `tests/engine/invariants.test.ts`
- `tests/engine/special-cases.test.ts`
- `tests/engine/sampling.test.ts`
- `tests/engine/trails.test.ts`
- `tests/engine/fixtures.test.ts`

## How Fixtures Are Generated

Generation entrypoint:
- `scripts/gen-fixtures.ts`

Core fixture builders:
- `src/engine/fixtures.ts` export `buildAllStateFixtures`.
- `src/engine/fixtures.ts` export `buildFixtureFromStateCase`.
- `src/engine/fixtures.ts` export `buildFixtureManifest`.
- `src/engine/fixtureCases.ts` exports state-case parsing/build helpers.

Outputs:
- `fixtures/manifest.json`
- `fixtures/*.json`
- Manual input definitions:
  - `fixtures/state-cases.json` (`default` fixture case is always included by script).
  - `fixtures/state-cases.schema.json` (authoring schema for `state-cases.json`).

Fixture tests recompute samples from code and compare against committed files with defined tolerances.

## Safe Behavior-Change Workflow

When changing engine/VTG/state behavior:

1. Update code and keep math deterministic.
2. Update or add tests that encode the new contract.
3. If math output changes, run `npm run gen:fixtures` and commit fixture updates.
4. Update docs pages that mention changed equations, invariants, or VTG mappings.
5. Run:
   - `npm test`
   - `npm run docs:all`
   - `npm run lint`
   - `npm run build`

## Persistence Break Policy

The current persistence contract intentionally fails closed across schema breaks:

- old state/preset payload schemas are rejected (no migration adapters),
- startup clears incompatible local keys for:
  - `LOCAL_STORAGE_STATE_KEY`,
  - `PRESET_LIBRARY_STORAGE_KEY`.

This keeps early-stage semantics simple and prevents mixed-reference persisted phase data after contract changes.

## Recommended Workflow For New Fixture Cases

1. Add a new full `AppState` case entry in `fixtures/state-cases.json` with unique kebab-case `id`.
2. Regenerate fixtures with `npm run gen:fixtures`.
3. Verify with `npm test`.
4. Update docs where fixture validation expectations changed.

## Contract Checks In CI

CI should fail when docs or API references drift:
- `npm test`
- `npm run docs:all`
- `npm run lint`

This keeps docs, JSDoc/TypeDoc output, and executable tests synchronized.
