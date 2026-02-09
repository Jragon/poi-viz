# Validation

## Validation Stack

The repository uses three executable validation layers:

1. Invariant tests for geometry and special cases.
2. Deterministic sampling/trail regression tests.
3. Golden fixtures generated from explicit state cases and compared in CI.
4. VTG sequence-domain validation for sanitize/validate contracts, beat mapping, snap normalization, and continuity propagation semantics.

Primary references:
- `tests/engine/invariants.test.ts`
- `tests/engine/special-cases.test.ts`
- `tests/engine/sampling.test.ts`
- `tests/engine/trails.test.ts`
- `tests/engine/fixtures.test.ts`
- `tests/vtg/sequence.test.ts`
- `tests/ui/app.integration.test.ts` (sequence mode playback/mode-switch integration coverage)

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
- Fixture state parsing is shared with app hydration (`src/state/persistence.ts`), so fixture cases follow the same merge/clamp behavior as persisted state.

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

For sequencer-specific changes, include at minimum:
- `tests/vtg/sequence.test.ts` updates for pure sequencing contracts,
- app-level integration assertions when sequence mode routing or render selection changes.

Sequencer tests currently assert:
- schema sanitize/validate behavior for defaults, IDs, duration constraints, and descriptor constraints,
- deterministic boundary computation and playhead-to-segment/local-beat mapping,
- snap behavior (`event` vs `none`) derived from arm-phase event spacing,
- continuity propagation across segment boundaries without non-loop pose jumps,
- loop seam reset to anchored start pose,
- deterministic continuity resolution for identical inputs,
- legacy-sequence payload rejection (no compatibility adapter path),
- mode routing in app integration (`apply-vtg` edits selected segment in sequence mode and runtime state outside sequence mode).

## Persistence Break Policy

The current persistence contract intentionally fails closed across schema breaks:

- old state/preset payload schemas are rejected (no migration adapters),
- startup clears incompatible local keys for:
  - `LOCAL_STORAGE_STATE_KEY`,
  - `PRESET_LIBRARY_STORAGE_KEY`.
- persisted app state includes durable edit fields only; volatile transport fields (`global.t`, `global.isPlaying`) are not serialized and are restored from defaults on hydration.
- persisted preset-library and preset-file state payloads also exclude volatile transport fields and restore them from defaults during import/hydration.

This keeps early-stage semantics simple and prevents mixed-reference persisted phase data after contract changes.

## Recommended Workflow For New Fixture Cases

1. Add a new fixture case entry in `fixtures/state-cases.json` with unique kebab-case `id` and a valid `global.phaseReference`; omitted fields hydrate from defaults.
2. Regenerate fixtures with `npm run gen:fixtures`.
3. Verify with `npm test`.
4. Update docs where fixture validation expectations changed.

## Contract Checks In CI

CI should fail when docs or API references drift:
- `npm test`
- `npm run docs:all`
- `npm run lint`

This keeps docs, JSDoc/TypeDoc output, and executable tests synchronized.
