# VTG Layer

## What VTG Controls

The VTG layer is a discrete generator/classifier wrapper around the continuous engine.

Primary code:
- `src/vtg/types.ts` exports descriptor and relation contracts (`VTGDescriptor`, `VTGElement`, `VTGPhaseDeg`, relation helpers).
- `src/vtg/generate.ts` exports `generateVTGState` (descriptor -> canonical angular state).
- `src/vtg/classify.ts` exports authoritative relation-based classifiers.
- `src/vtg/descriptiveGeometry.ts` exports non-authoritative together/apart language helpers.
- `src/vtg/sequence.ts` exports Phase 2 sequence schema and pure sequencing logic.

## Descriptor Contract

`VTGDescriptor` now uses:
- `armElement`
- `poiElement`
- `phaseDeg`
- `poiHeadCyclesPerArmCycle` (signed)

`poiHeadCyclesPerArmCycle` semantics:
- canonical arm baseline: `VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT = 2π`,
- conversion helpers:
  - `poiHeadCyclesPerArmCycleToHeadSpeedRadiansPerBeat`,
  - `headSpeedRadiansPerBeatToPoiHeadCyclesPerArmCycle`.

This removes petals/inspin/antispin from descriptor language and keeps speed abstraction signed + relation-first.

## Authoritative Classification

`classifyArmElement` and `classifyPoiElement` are relation-based and rotation-invariant:
- timing bucket from `Δφ ≈ 0` or `Δφ ≈ π`,
- direction bucket from sign relation.

`classifyPhaseBucket` buckets right-head offset relative to right-arm phase into `0/90/180/270` with ±5° tolerance.

Reference (`global.phaseReference`) does not change classifier outputs.

## Generator Mapping

`generateVTGState` applies descriptor constraints without touching non-angular state:
1. set canonical right-arm baseline,
2. solve left-arm timing/direction from `armElement`,
3. solve head speeds from signed `poiHeadCyclesPerArmCycle` and `poiElement` direction,
4. apply `phaseDeg` as right-head relative offset,
5. solve relative channels per hand (`ω_rel = ω_head - ω_arm`, `φ_rel = φ_head - φ_arm`),
6. re-classify for safety.

Engine math is unchanged; VTG only selects angular parameters.

## Phase 2 Sequencer (VTG-only)

Phase 2 adds a beat-based piecewise VTG sequencer in `src/vtg/sequence.ts`.

Schema contract (`VTGSequence`):
- metadata: `schema`, `version`,
- sequence fields: `name`, `loop`, `snapSetting`, `guidanceMode`,
- ordered `segments[]`, each with stable `id`, `durationBeats`, and VTG descriptor.

Pure logic surface:
- sanitize/validate: `sanitizeVTGSequence`, `validateVTGSequence`,
- beat boundaries: `computeSequenceBoundariesBeats`,
- playhead resolution: `resolveSequencePlayheadBeats` (global beat -> segment index + local beat),
- optional event snap: `normalizeSequenceEventSnap`, `snapDurationToArmPhaseEvents`,
- guidance classification: `classifySequenceTransitionGuidance`.

### Event Snap Semantics

Event alignment is defined in arm-phase/cardinal space:
- event spacing in beats is derived from arm angular speed (`π/2` phase span),
- no global hardcoded `0.25 beat` assumption in logic,
- with canonical VTG arm speed (`2π`), spacing evaluates to `0.25` beats.

### Guidance Modes

Supported modes:
- `strict`: non-canonical transitions are severity `error`,
- `soft`: non-canonical transitions are severity `warning`,
- `freeform`: non-canonical transitions remain classified but severity is `none`.

Classification minimum is canonical vs non-canonical, based on arm-phase event alignment at segment boundaries.

## Invariants vs Reference-Relative Outputs

Invariant (reference-independent):
- arm/poi element classification,
- phase bucket classification,
- descriptor-to-state generation contract.

Reference-relative:
- render orientation in `PatternCanvas` from `global.phaseReference`.

Descriptive-only:
- together/apart cardinal helpers in `src/vtg/descriptiveGeometry.ts`.

## Validated By

- `tests/vtg/generate.test.ts`
- `tests/vtg/classify.test.ts`
- `tests/vtg/types.test.ts`
- `tests/vtg/sequence.test.ts`
- `tests/ui/app.integration.test.ts` (sequence mode selection/playback integration)
