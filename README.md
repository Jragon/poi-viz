# Poi Phase Visualiser

Vue 3 + TypeScript app for visualizing wall-plane poi motion from coupled oscillators.

## Status

Phase checklist:

- [x] Phase 1: project scaffold (Vite, Vue, Tailwind, Vitest, GitHub Pages workflow).
- [x] Phase 2: typed app state, deterministic defaults, and preset transforms.
- [x] Phase 3: pure deterministic engine math and fixed-step trail sampling utilities.
- [x] Phase 4: validation test layer (invariants, special cases, tolerance helpers, fixture-comparison harness).
- [x] Phase 5: fixture generator writes golden position fixtures for presets and fixture regression tests.
- [ ] Phase 6: Canvas renderers (`PatternCanvas.vue`, `WaveCanvas.vue`) and sync plumbing.
- [ ] Phase 7: controls UI (`Controls.vue`) with transport, per-hand params, presets.
- [ ] Phase 8: URL + localStorage persistence and copy-link flow.
- [ ] Phase 9: responsive 3-panel integration and final validation loop.

Still not implemented:

- Canvas viewport renderer (`PatternCanvas.vue`).
- Canvas waveform inspector (`WaveCanvas.vue`).
- Full controls UI, playback loop wiring, URL/localStorage sync.

## Math Model

All motion uses wall-plane coordinates `(x right, y up)` and beats `t`.

Detailed engine walkthrough for teaching/documentation:

- `/Users/rory/code/poi/src/engine/README.md`

For each hand `i ∈ {L, R}`:

- `θ_arm_i(t) = ω_arm_i * t + φ_arm_i`
- `θ_rel_i(t) = ω_rel_i * t + φ_rel_i`
- `H_i(t) = R_arm_i * [cos(θ_arm_i), sin(θ_arm_i)]`
- `P_i(t) = H_i(t) + R_poi_i * [cos(θ_arm_i + θ_rel_i), sin(θ_arm_i + θ_rel_i)]`
- `Tether_i(t) = P_i(t) - H_i(t)`

Implemented APIs in `/Users/rory/code/poi/src/engine/engine.ts`:

- `getAngles(params, tBeats)`
- `getPositions(params, tBeats)`
- `sampleLoop(params, sampleHz, loopBeats, startBeat?)`
- `createTrailSampler(config, params, startBeat)`
- `advanceTrailSampler(state, params, frameBeat)`
- `getTrailPoints(state)`

## State Model

Canonical state contracts are in `/Users/rory/code/poi/src/types/state.ts`.

Global state includes:

- playback: `bpm`, `loopBeats`, `playSpeed`, `isPlaying`, `t`
- visualization toggles: `showTrails`, `showWaves`
- trail sampling: `trailBeats`, `trailSampleHz`

Per-hand state includes:

- arm oscillator: `armSpeed`, `armPhase`, `armRadius`
- relative poi oscillator: `poiSpeed`, `poiPhase`, `poiRadius`

Defaults are implemented in `/Users/rory/code/poi/src/state/defaults.ts` to match `spec.md`.

## Presets

Preset transforms are pure and immutable in `/Users/rory/code/poi/src/state/presets.ts`.

- Elements: `earth`, `air`, `water`, `fire`
- Flowers: `inspin-{3,4,5}`, `antispin-{3,4,5}`

Element presets adjust right-hand arm timing/direction relative to left-hand.
Flower presets set `poiSpeed = ±k * armSpeed` and reset `poiPhase = 0`.

## Tests

Current Vitest coverage:

- `/Users/rory/code/poi/tests/state/defaults.test.ts`
- `/Users/rory/code/poi/tests/state/presets.test.ts`
- `/Users/rory/code/poi/tests/engine/angles.test.ts`
- `/Users/rory/code/poi/tests/engine/positions.test.ts`
- `/Users/rory/code/poi/tests/engine/sampling.test.ts`
- `/Users/rory/code/poi/tests/engine/trails.test.ts`
- `/Users/rory/code/poi/tests/engine/invariants.test.ts`
- `/Users/rory/code/poi/tests/engine/special-cases.test.ts`
- `/Users/rory/code/poi/tests/engine/fixture-harness.test.ts`
- `/Users/rory/code/poi/tests/engine/fixtures.test.ts`

You can fully test completed phases now with:

```bash
npm run gen:fixtures
npm run test
npm run build
```

## Fixture Workflow

Golden numeric fixtures live in `/Users/rory/code/poi/fixtures`.

- Generate/update fixtures:
  - `npm run gen:fixtures`
- Regress fixture values against current engine math:
  - `npm run test`

Fixtures are deterministic snapshots of head positions sampled over a loop for:

- elements: `earth`, `air`, `water`, `fire`
- flowers: `inspin-{3,4,5}`, `antispin-{3,4,5}`

## Commands

```bash
npm install
npm run dev
```

```bash
npm run test
npm run build
npm run gen:fixtures
```

If npm cache permissions fail on your machine:

```bash
npm install --cache .npm-cache
```

## Repository Layout

```text
.
├── .github/workflows/deploy-pages.yml
├── fixtures/manifest.json
├── scripts/gen-fixtures.ts
├── src
│   ├── App.vue
│   ├── engine
│   ├── main.ts
│   ├── state
│   ├── style.css
│   └── types
├── tests
│   ├── engine
│   └── state
├── AGENTS.md
├── spec.md
└── package.json
```
