# Poi Phase Visualiser

[Live Demo (GitHub Pages)](https://jragon.github.io/poi-viz/)

Poi Phase Visualiser is a Vue 3 + TypeScript app for exploring wall-plane poi motion from deterministic coupled oscillators.

The app gives you:
- a pattern viewport (hands, tethers, heads, optional trails),
- a synchronized waveform inspector,
- interactive controls for timing, per-hand parameters, VTG generation, and preset library workflows,
- deterministic sampling/fixtures so behavior is testable and reproducible.

## What The App Does

At a high level:
- models each hand as an arm oscillator plus a relative poi oscillator,
- computes positions in beat-space with pure engine math,
- renders pattern + waves from the same playhead,
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
- `src/vtg/`: VTG descriptor types, generator, classifier
- `src/state/`: defaults, constants, units, actions, persistence, preset library
- `src/render/`: Canvas drawing helpers
- `src/components/`: Vue UI and panel composition
- `tests/`: regression coverage for engine/state/render/vtg contracts
- `docs/`: human documentation
- `docs/api/`: generated API reference

## Contributor Rule Of Thumb

For behavior changes:
1. update code,
2. update/add tests,
3. update the relevant `docs/*.md` pages,
4. regenerate API docs when exported APIs change,
5. run `npm test`, `npm run lint`, and `npm run docs:all`.
