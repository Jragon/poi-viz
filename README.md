# Poi Phase Visualiser

[Live Demo (GitHub Pages)](https://jragon.github.io/poi-viz/)

Poi Phase Visualiser is a Vue 3 + TypeScript app for exploring wall-plane poi motion from deterministic coupled oscillators.

The app gives you:
- a pattern viewport (hands, tethers, heads, optional trails),
- a synchronized waveform inspector,
- interactive controls for timing, per-hand parameters, VTG generation, and preset library workflows,
- configurable global phase-zero reference (`down` default),
- light/dark theme switching from the title bar (persisted in browser storage),
- a transport-level static view mode for full-loop still pattern captures,
- deterministic sampling/fixtures so behavior is testable and reproducible.

Trail behavior note:
- backward scrubbing rebuilds a deterministic trailing window ending at the current playhead beat (it does not collapse to a single seed point).

Phase-reference note:
- engine internals remain canonical (`right = 0`),
- global phase-zero semantics are reference-relative (`right|down|left|up`, default `down`),
- changing global phase-zero updates UI/interpretation semantics only (it does not mutate canonical arm/poi phases),
- pattern viewport orientation is rotated in render-space from `global.phaseReference` so phase-zero changes are visible without mutating canonical channels,
- this is a coordinate-reference setting, not a math-model fork.
- VTG element mapping is relation-based: Earth=`same-time+same-direction`, Air=`same-time+opposite-direction`, Water=`split-time+same-direction`, Fire=`split-time+opposite-direction`.
- VTG `phaseDeg` is a poi-head offset bucket relative to hand phase (used to rotate poi pattern modes like box/diamond without changing hand timing).

Persistence break note:
- old saved state and preset-library payloads were intentionally invalidated (no migration adapters),
- incompatible local storage keys are cleared on startup.

## What The App Does

At a high level:
- models each hand as an arm oscillator plus a relative poi oscillator,
- computes positions in beat-space with pure engine math,
- advances playhead time from one transport RAF owner (`App.vue`) and feeds that beat stream to all canvases,
- applies transport progression via immutable state-action commits (no in-place mutation of canonical app state),
- renders pattern + waves from the same playhead beat,
- centralizes persistence policy (URL-first hydration, schema compatibility purge, debounced local sync, share-link URL generation) in one coordinator service,
- persists durable edit state only (transport-volatiles `global.t` and `global.isPlaying` are runtime-only and restored from defaults),
- keeps preset-library and preset-file payloads durable-only under the same volatile-field policy,
- keeps root view composition thin by extracting app orchestration into `src/composables/useAppOrchestrator.ts`, which now composes focused controllers,
- splits controls into focused panel components under `src/components/controls/` with shared numeric commit-on-blur utility (`src/composables/useNumericDrafts.ts`),
- supports VTG descriptor generation/classification for canonical relationship states,
- persists/share-links state and supports user preset import/export.

## Documentation Map

Start here for implementation details:

- Overview: `docs/index.md`
- Math model and invariants: `docs/math-model.md`
- Engine modules and deterministic sampling flow: `docs/engine-architecture.md`
- VTG generation/classification contracts: `docs/vtg-layer.md`
- Validation workflow, fixtures, and safe change process: `docs/validation.md`
- Terminology and symbols: `docs/glossary.md`
- Documentation conventions for contributors: `docs/style.md`

Generated API docs (TypeDoc):
- `docs/api/index.html`

## Quick Start

```bash
npm install
npm run dev
```

If npm cache permissions fail locally:

```bash
npm install --cache .npm-cache
```

## Core Commands

```bash
npm test
npm run build
npm run lint
npm run gen:fixtures
npm run docs:dev
npm run docs:api
npm run docs:build
npm run docs:all
```

## Project Areas

- `src/engine/`: pure math, sampling, trails, fixtures
- `src/vtg/`: VTG descriptor types, generator, authoritative classifier, descriptive geometry helpers
- `src/state/`: defaults, constants, units, actions, persistence, preset library
- `src/composables/`: app-level orchestration units (`useTransportClock`, `usePersistenceCoordinator`, `useTransportController`, `useThemeController`, `useShareLinkController`, `usePresetLibraryController`, `useAppOrchestrator`) plus shared UI utility (`useNumericDrafts`)
- `src/render/`: Canvas drawing helpers
- `src/components/`: Vue UI composition (`Controls.vue`, canvases, `VtgPanel.vue`)
- `src/components/controls/`: focused controls panels (transport, global, hand, preset library, help)
- `tests/`: regression coverage for engine/state/render/vtg contracts
- `fixtures/state-cases.json`: manually authored fixture input states (default case is always included by generator)
- `fixtures/*.json` + `fixtures/manifest.json`: generated golden fixture outputs
- `docs/`: human documentation
- `docs/api/`: generated API reference

## Contributor Rule Of Thumb

For behavior changes:
1. update code,
2. update/add tests,
3. update the relevant `docs/*.md` pages,
4. regenerate API docs when exported APIs change,
5. run `npm test`, `npm run lint`, and `npm run docs:all`.
