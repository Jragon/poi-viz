# Poi Phase Visualiser

A Vue 3 + TypeScript single-page app for visualizing wall-plane poi motion from coupled oscillators.

It renders:
- a pattern viewport (hands, tethers, poi heads, optional trails), and
- a waveform inspector (sin/cos channels for arm/relative oscillators),
all synchronized to one beat-based playhead.

## What This Project Does

Given per-hand oscillator parameters, the app computes deterministic 2D motion and draws it with Canvas 2D:
- Left and right hand points orbit around the origin (arm oscillator).
- Poi heads rotate relative to each hand (relative oscillator).
- The resulting geometry produces extensions, flowers, and antispin patterns.

The controls let you:
- play/pause and scrub through a loop,
- edit global timing and trail settings,
- edit left/right hand parameters,
- switch angle entry between degrees and radians,
- apply element and flower presets.

## Current Feature Coverage

Implemented:
- Pure deterministic engine math in `src/engine`.
- Pattern renderer in `src/render/patternRenderer.ts` + `src/components/PatternCanvas.vue`.
- Wave renderer in `src/render/waveRenderer.ts` + `src/components/WaveCanvas.vue`.
- Full controls UI in `src/components/Controls.vue`.
- Typed immutable state update actions in `src/state/actions.ts`.
- Preset system (elements + flowers) in `src/state/presets.ts`.
- Golden fixture generation and regression tests (`scripts/gen-fixtures.ts`, `fixtures/*.json`, `tests/engine/fixtures.test.ts`).
- Responsive app shell in `src/App.vue`.
- GitHub Pages workflow in `.github/workflows/deploy-pages.yml`.

Not yet implemented:
- URL querystring persistence / share-link copy flow.
- localStorage restore/sync flow.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL printed in terminal.

## Build, Test, Fixtures

```bash
npm run test
npm run build
npm run gen:fixtures
```

If npm cache permissions fail locally:

```bash
npm install --cache .npm-cache
```

## Architecture Overview

### Runtime composition

- `src/main.ts`
  Bootstraps Vue and global styles.
- `src/App.vue`
  Owns app state, RAF transport loop, and wires events from controls to pure state actions.
- `src/components/PatternCanvas.vue`
  Pulls engine positions + trail sampler output, then delegates drawing to pattern renderer.
- `src/components/WaveCanvas.vue`
  Samples loop channels and delegates drawing to wave renderer.
- `src/components/Controls.vue`
  Emits typed events for global/hand updates, transport actions, and presets.

### Separation of concerns

- Engine (`src/engine/*`): pure math and deterministic sampling.
- Render (`src/render/*`): pure Canvas draw functions and transforms.
- State (`src/state/*`): defaults, constants, action reducers, presets, angle-unit conversions.
- Vue components (`src/components/*`): event wiring + canvas lifecycle only.

### Data and control flow

1. `src/App.vue` initializes state via `createDefaultState()`.
2. RAF advances `state.global.t` in beats when `isPlaying` is true.
3. Controls emit updates; `src/state/actions.ts` returns a cloned next state.
4. Canvases read state and `t`:
   - Pattern canvas computes positions/trails and renders geometry.
   - Wave canvas samples one loop and renders oscillator traces + playhead cursor.
5. Preset buttons call `applyPresetById` via state actions.

## Math Model (Single Source of Truth)

Coordinates:
- Wall plane with `x` right, `y` up.
- Angles are radians, positive counter-clockwise.
- Time is beats (`t`).

For each hand `i ∈ {L, R}`:

- `θ_arm_i(t) = ω_arm_i * t + φ_arm_i`
- `θ_rel_i(t) = ω_rel_i * t + φ_rel_i`
- `H_i(t) = R_arm_i * [cos(θ_arm_i), sin(θ_arm_i)]`
- `P_i(t) = H_i(t) + R_poi_i * [cos(θ_arm_i + θ_rel_i), sin(θ_arm_i + θ_rel_i)]`
- `Tether_i(t) = P_i(t) - H_i(t)`

Notes:
- `ω_rel = 0` gives extension behavior (head offset locked to arm angle).
- Signs and magnitude ratios of `ω_rel` relative to `ω_arm` produce inspin/antispin flowers.
- The UI can display degrees, but engine/state values remain radians.

## State Model

Canonical types are in `src/types/state.ts`.

Global state (`GlobalState`):
- `bpm`
- `loopBeats`
- `playSpeed`
- `isPlaying`
- `t`
- `showTrails`
- `trailBeats`
- `trailSampleHz`
- `showWaves`

Per-hand state (`HandState` for `L` and `R`):
- `armSpeed`, `armPhase`, `armRadius`
- `poiSpeed`, `poiPhase`, `poiRadius`

Defaults are created in `src/state/defaults.ts` from constants in `src/state/constants.ts`:
- `bpm = 10`, `loopBeats = 4`, `playSpeed = 1`
- `armRadius = 120`, `poiRadius = 180`
- Left arm speed `2π`, phase `0`
- Right arm speed `2π`, phase `0` (same-time / earth timing for hands)
- Left relative poi speed `-6π` (3-petal antispin baseline), phase `0`
- Right relative poi speed `0` (extension baseline), phase `0`

## Controls Reference

`src/components/Controls.vue` provides:
- Transport panel: play/pause + scrub.
- Global settings: BPM, loop beats, play speed, trail settings, trails/waves toggles.
- Angle units switch: degrees/radians display mode for speed/phase fields.
- Per-hand parameter inputs for L/R.
- Preset groups:
  - Elements: Earth, Air, Water, Fire.
  - Flowers: inspin/antispin 3-, 4-, 5-petal.
- Detailed on-page explanation block for usage guidance.

State writes are routed through pure reducers in `src/state/actions.ts`:
- finite-number sanitization,
- min-clamping for constrained fields,
- loop-safe playhead normalization,
- immutable clone-on-write updates.

## Preset System

Preset catalog is defined in `src/state/presets.ts`.

Element presets (`earth`, `air`, `water`, `fire`) modify right-hand arm relation relative to left hand:
- same/split time (`φ_arm_R` offset of `0` or `π`)
- same/opposite direction (sign relation between `ω_arm_R` and `ω_arm_L`)

Flower presets (`inspin-*`, `antispin-*`) set:
- `poiSpeed = ±petals * armSpeed`
- `poiPhase = 0`
for both hands.

## Rendering Details

Pattern rendering (`src/render/patternRenderer.ts`):
- Draw order:
  - background
  - polar grid + axes
  - trails (optional)
  - tether lines
  - hand/head dots
- World radius derives from max reach of both hands.
- Trails use age-based alpha fading.

Wave rendering (`src/render/waveRenderer.ts`):
- Lanes:
  - `arm L`, `rel L`, `arm R`, `rel R`
- Traces:
  - sin and cos for each lane
- Includes vertical cursor for current playhead.

Responsive behavior (`src/App.vue`):
- Pattern and wave panels are side-by-side on large screens.
- If waves are disabled, the pattern panel expands full width.
- Controls panel sits below the visual panels.

## Deterministic Sampling and Trails

Engine sampling APIs (`src/engine/engine.ts` barrel):
- `getAngles(params, tBeats)`
- `getPositions(params, tBeats)`
- `sampleLoop(params, sampleHz, loopBeats, startBeat?)`
- `createTrailSampler(config, params, startBeat)`
- `advanceTrailSampler(state, params, frameBeat)`
- `getTrailPoints(state)`

Trail capacity:
- `trailSeconds = trailBeats * (60 / bpm)`
- `capacity = ceil(trailSampleHz * trailSeconds)`

Implementation uses fixed-step sampling and ring buffers to remain deterministic and bounded.

## Fixtures and Regression Testing

Fixture generation:
- Script: `scripts/gen-fixtures.ts`
- Output files: `fixtures/*.json` and `fixtures/manifest.json`
- Source of fixture values: engine loop sampling on preset-derived states

Tolerances:
- strict math checks: `1e-6`
- fixture comparisons: `1e-4`

## Test Suite Map

State tests:
- `tests/state/defaults.test.ts`
- `tests/state/presets.test.ts`
- `tests/state/actions.test.ts`
- `tests/state/angle-units.test.ts`

Engine tests:
- `tests/engine/angles.test.ts`
- `tests/engine/positions.test.ts`
- `tests/engine/sampling.test.ts`
- `tests/engine/trails.test.ts`
- `tests/engine/invariants.test.ts`
- `tests/engine/special-cases.test.ts`
- `tests/engine/fixture-harness.test.ts`
- `tests/engine/fixtures.test.ts`

Render tests:
- `tests/render/pattern-renderer.test.ts`
- `tests/render/wave-renderer.test.ts`

## Project Structure

```text
.
├── .github/workflows/deploy-pages.yml
├── fixtures/
├── scripts/
│   └── gen-fixtures.ts
├── src/
│   ├── App.vue
│   ├── components/
│   │   ├── Controls.vue
│   │   ├── PatternCanvas.vue
│   │   └── WaveCanvas.vue
│   ├── engine/
│   ├── render/
│   ├── state/
│   ├── types/
│   ├── main.ts
│   └── style.css
├── tests/
│   ├── engine/
│   ├── render/
│   └── state/
├── AGENTS.md
├── spec.md
└── README.md
```

## Engineering Principles Used In This Codebase

- TypeScript-first contracts for state, engine, and render boundaries.
- Deterministic pure math and sampling; no hidden randomness.
- Named constants instead of magic numbers.
- Small, testable functions.
- Canvas 2D rendering only.

## Deployment

GitHub Actions workflow for static deployment lives at:
- `.github/workflows/deploy-pages.yml`

It builds Vite output from the repository and publishes `dist/` to GitHub Pages.
