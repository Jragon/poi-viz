# Engine Guide

This folder contains the pure deterministic motion engine for the poi wall-plane model.

## Why this exists

The engine is the single source of truth for motion math. UI and Canvas rendering should consume outputs from this engine, not re-derive equations independently.

## Coordinate system and units

- Plane: wall plane `(x right, y up)`
- Angles: radians, positive counter-clockwise
- Time input: beats (`tBeats`)
- Speeds: radians per beat (`rad/beat`)
- BPM: only for beat/second conversion in sampling utilities

## Core equations

For each hand `i ∈ {L, R}`:

- `thetaArm_i(t) = omegaArm_i * t + phiArm_i`
- `thetaRel_i(t) = omegaRel_i * t + phiRel_i`
- `H_i(t) = RArm_i * [cos(thetaArm_i), sin(thetaArm_i)]`
- `P_i(t) = H_i(t) + RPoi_i * [cos(thetaArm_i + thetaRel_i), sin(thetaArm_i + thetaRel_i)]`
- `Tether_i(t) = P_i(t) - H_i(t)`

Code mapping:

- `angles.ts`: first two equations plus `head = arm + rel`
- `positions.ts`: hand/head/tether vectors
- `math.ts`: vector helpers and beat-second conversions

## Public API

Use the barrel file `engine.ts`.

- `getAngles(params, tBeats)`:
  - returns `{ L: { arm, rel, head }, R: { arm, rel, head } }`
- `getPositions(params, tBeats)`:
  - returns `{ L: { hand, head, tether }, R: { hand, head, tether } }`
- `sampleLoop(params, sampleHz, loopBeats, startBeat?)`:
  - returns deterministic endpoint-inclusive samples for one loop
- `createTrailSampler(config, params, startBeat)`:
  - seeds ring buffers and prepares fixed-step trail sampling
- `advanceTrailSampler(state, params, frameBeat)`:
  - appends fixed-step samples up to `frameBeat`
  - rewinds deterministically by rebuilding the trailing window ending at `frameBeat`
- `getTrailPoints(state)`:
  - returns trails ordered oldest -> newest
- `buildFixtureFromStateCase(fixtureCase, sampleHz?, startBeat?)`:
  - builds one fixture payload from one explicit state case
- `buildAllStateFixtures(fixtureCases, sampleHz?, startBeat?)`:
  - builds fixture payloads for all provided state cases
- `buildFixtureManifest(fixtures)`:
  - creates deterministic fixture manifest metadata

## Determinism rules

- No random numbers.
- No hidden global mutable state.
- Inputs fully determine outputs.
- Trail sampling step is fixed from `sampleHz` and `bpm`, decoupled from render frame rate.
- Loop sampling includes both start and end boundaries.

## Trails implementation notes

- Capacity formula:
  - `trailSeconds = trailBeats * (60 / bpm)`
  - `capacity = ceil(trailSampleHz * trailSeconds)`
- Storage is a ring buffer:
  - bounded memory
  - oldest entries dropped when full

## Fixture generation notes

Fixtures are golden numeric snapshots used for regression testing.

- Generator: `scripts/gen-fixtures.ts`
- Fixture case inputs: `fixtures/state-cases.json` (`default` state fixture is always included automatically)
- Fixture state parsing: shared `deserializeState` path in `src/state/persistence.ts`
- Outputs: `fixtures/*.json` + `fixtures/manifest.json`
- Sample source: `sampleLoop` over explicit fixture case states
- Captured channel: head positions (`L` and `R`) per sampled beat
- Tolerance for comparisons: `1e-4`

Regeneration and verification:

- `npm run gen:fixtures`
- `npm run test`

## Worked example (one hand)

Assume:

- `omegaArm = 2pi`
- `phiArm = 0`
- `omegaRel = 6pi`
- `phiRel = 0`
- `RArm = 120`
- `RPoi = 180`
- `t = 0.25 beats`

Then:

- `thetaArm = 2pi * 0.25 = pi/2`
- `thetaRel = 6pi * 0.25 = 3pi/2`
- `thetaHead = thetaArm + thetaRel = 2pi`
- `H = [120*cos(pi/2), 120*sin(pi/2)] = [0, 120]`
- Poi offset = `[180*cos(2pi), 180*sin(2pi)] = [180, 0]`
- `P = H + offset = [180, 120]`
- `Tether = [180, 0]`

## Test coverage

Engine tests live in `tests/engine`.

- `angles.test.ts`: oscillator linearity and channel correctness
- `positions.test.ts`: formula checks and tether magnitude checks
- `sampling.test.ts`: deterministic loop sampling behavior
- `trails.test.ts`: fixed-step sampling, capacity behavior, rewind behavior
- `invariants.test.ts`: arm circle and tether length invariants
- `special-cases.test.ts`: `omegaRel = 0` and `RArm = 0` geometry
- `fixture-harness.test.ts`: fixture mismatch reporting behavior
- `fixtures.test.ts`: file-backed golden fixture regression checks

## How to explain this engine to others

Suggested explanation order:

1. Start with two rotating angles per hand: arm and relative poi.
2. Explain that head angle is just their sum.
3. Convert those angles into vectors with cos/sin.
4. Show that hand position plus poi offset gives head position.
5. Explain deterministic sampling as "sample by beat step, not frame timing".
