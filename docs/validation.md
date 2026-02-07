# Validation

## Validation Stack

The repository uses three executable validation layers:

1. Invariant tests for geometry and special cases.
2. Deterministic sampling/trail regression tests.
3. Golden fixtures generated from preset catalog and compared in CI.

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
- `src/engine/fixtures.ts` export `buildAllPresetFixtures`.
- `src/engine/fixtures.ts` export `buildPresetFixture`.
- `src/engine/fixtures.ts` export `buildFixtureManifest`.

Outputs:
- `fixtures/manifest.json`
- `fixtures/*.json`

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

## Recommended Workflow For New Presets/Examples

1. Add or adjust pure transforms in `src/state/presets.ts`.
2. Add coverage in `tests/state/presets.test.ts`.
3. Regenerate fixtures if preset catalog output changed.
4. Update docs where preset semantics are referenced.

## Contract Checks In CI

CI should fail when docs or API references drift:
- `npm test`
- `npm run docs:all`
- `npm run lint`

This keeps docs, JSDoc/TypeDoc output, and executable tests synchronized.
