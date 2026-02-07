# AGENTS

## Scope (REQUIRED)

Focus only on this Vue single-page app:

- `src/` (application code)
- `tests/` (unit tests)
- `fixtures/` (numeric fixtures)
- `scripts/` (fixture generation and tooling)

Ignore backend, API server, containers, and Python/Django workflows unless explicitly requested.

## Frontend Architecture Map

Current high-level structure:

- `src/main.ts`: Vue bootstrap entrypoint.
- `src/App.vue`: root SPA shell and composition point.
- `src/types/state.ts`: canonical TypeScript state contracts.
- `src/state/constants.ts`: shared constants and derived numeric defaults.
- `src/state/defaults.ts`: deterministic default state construction.
- `src/state/presets.ts`: pure preset transforms (elements + flowers).
- `tests/state/*.test.ts`: Vitest coverage for defaults/preset behavior.

When adding engine/rendering features, keep engine math and Canvas rendering separated.

## Engineering Rules (REQUIRED)

- Use TypeScript everywhere.
- Keep math pure and deterministic.
- No magic numbers; derive constants from named values.
- Prefer small, testable functions over large monoliths.
- Use Canvas 2D only (no SVG, no WebGL).
- Write tests alongside engine/state changes.

## Math And State Contract

- Use typed state as the single source of truth (`AppState` and related types).
- Prefer immutable state updates for preset and transform logic.
- Keep computational logic framework-agnostic and side-effect free.
- Treat BPM as UI timing input; keep math in deterministic beat-based units.

## Run And Verify

Use Node-based project commands from repo root:

- Dev server: `npm run dev`
- Tests: `npm test`
- Build: `npm run build`
- Regenerate fixtures: `npm run gen:fixtures`

Verification expectations for code changes:

- Run `npm test` for logic/state/engine updates.
- Run `npm run build` for SPA/runtime-impacting changes.
- If fixture-sensitive math changes, regenerate fixtures and update tests together.

## Project Documentation (REQUIRED)

- Keep `/Users/rory/code/poi/README.md` up to date as the canonical project documentation.
- When behavior changes, update README sections that explain:
  - how the app works (state flow, rendering flow, controls, presets, persistence),
  - how the math works (angles, phase, speeds, position equations, invariants, and special cases).
- Prefer concrete equations and examples over vague descriptions.
- If implementation and README diverge, align README in the same change.

## CONTINUITY.md (REQUIRED)

Maintain a single continuity file for this workspace at:

- `/Users/rory/code/poi/.agent/CONTINUITY.md`

Rules:

- Read it at the start of non-trivial tasks.
- Update it when there is meaningful change in plans, decisions, progress, discoveries, or outcomes.
- Keep entries factual and compact (no raw logs).
- Each entry must include:
  - ISO timestamp,
  - provenance tag: `[USER]`, `[CODE]`, `[TOOL]`, or `[ASSUMPTION]`,
  - `UNCONFIRMED` for unknowns instead of guessing.

## Definition Of Done

A task is done when:

- requested behavior is implemented,
- relevant tests are added/updated and passing,
- build passes when app code changed,
- `/Users/rory/code/poi/README.md` is updated for behavior/math changes,
- `/Users/rory/code/poi/.agent/CONTINUITY.md` is updated when task state materially changed,
- follow-ups are called out when intentionally out of scope.
