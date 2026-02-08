# Engine Architecture

## Module Seams

Engine modules are pure TypeScript and framework-agnostic.

- `src/engine/angles.ts`
  export `getAngles(params, tBeats)` computes `arm`, `rel`, and `head` channels.
- `src/engine/positions.ts`
  export `getPositions(params, tBeats)` converts angles to wall-plane vectors.
- `src/engine/sampling.ts`
  export `sampleLoop(params, sampleHz, loopBeats, startBeat?)` returns deterministic beat-indexed snapshots.
- `src/engine/trails.ts`
  exports `createTrailSampler`, `advanceTrailSampler`, `getTrailPoints` for fixed-step trail accumulation.
- `src/engine/ringBuffer.ts`
  exports `createRingBuffer`, `pushRingBuffer`, `ringBufferToArray` for bounded history.
- `src/engine/fixtures.ts`
  exports `buildFixtureFromStateCase`, `buildAllStateFixtures`, `buildFixtureManifest` for golden fixture generation.
- `src/engine/fixtureCases.ts`
  exports parser/build helpers for manual fixture state-case inputs.

Public barrel:
- `src/engine/engine.ts` re-exports the supported engine API.

## Data Flow

1. Input contract is `EngineParams` from `src/engine/types.ts`.
2. `getAngles` computes oscillator channels in beat units.
3. `getPositions` computes `(hand, head, tether)` vectors from angles.
4. `sampleLoop` uses fixed beat step from `sampleHzToStepBeats` (`src/engine/math.ts`) and includes both loop endpoints.
5. Trail sampler advances independently of render FPS by stepping in beat-space.
6. A single transport RAF owner in `src/App.vue` advances beat time and passes `tBeats` into both canvas views.
7. Static transport view uses deterministic loop sampling to render a full-loop still trail for pattern capture.
8. Phase-reference transforms are applied outside engine equations (`src/state/phaseReference.ts`), so engine math stays canonical.

## Deterministic Sampling

Determinism requirements:
- same inputs produce byte-equivalent sample arrays,
- fixed `sampleHz` + `bpm` define one step size in beats,
- endpoint clamping ensures final sample lands exactly at `startBeat + loopBeats`.

Code references:
- `src/engine/sampling.ts` exports `getLoopIntervalCount` and `sampleLoop`.
- `src/engine/math.ts` export `sampleHzToStepBeats`.

## Fixture Pipeline

Fixture generation is an executable snapshot of engine outputs over explicit fixture state cases.

- Script: `scripts/gen-fixtures.ts`
- Fixture case input source: `fixtures/state-cases.json` plus implicit default state
- Fixture builder: `src/engine/fixtures.ts` export `buildAllStateFixtures`
- Manifest builder: `src/engine/fixtures.ts` export `buildFixtureManifest`
- Persisted outputs: `fixtures/*.json` + `fixtures/manifest.json`

## Validation Links

- `tests/engine/sampling.test.ts` verifies endpoint inclusion and deterministic sampling.
- `tests/engine/trails.test.ts` verifies fixed-step trail behavior and rewind window rebuilds.
- `tests/engine/fixtures.test.ts` compares generated fixtures against committed files.
