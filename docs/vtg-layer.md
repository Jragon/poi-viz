# VTG Layer

## What VTG Controls

The VTG layer is a discrete generator/classifier wrapper around the continuous engine.

Primary code:
- `src/vtg/types.ts` exports descriptor and relation contracts (`VTGDescriptor`, `VTGElement`, `VTGPhaseDeg`, relation helpers).
- `src/vtg/generate.ts` exports `generateVTGState` (descriptor -> canonical angular state).
- `src/vtg/classify.ts` exports authoritative relation-based classifiers.
- `src/vtg/descriptiveGeometry.ts` exports non-authoritative together/apart language helpers.
- `src/vtg/sequence.ts` exports sequencer schema, snap helpers, direction constraints, and continuity resolver logic.

## Single-Pattern Descriptor Contract

`VTGDescriptor` (used by generator panel) uses:
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

## Sequencer Descriptor Contract

The sequencer (`src/vtg/sequence.ts`) uses a segment descriptor that removes per-segment phase and adds explicit arm branch:
- `armElement`
- `poiElement`
- `poiHeadCyclesPerArmCycle`
- `rightArmSign` (`1 | -1`)

At sequence root:
- `startPhaseDeg` anchors segment-1 start pose,
- `allowPoiDirectionFlip` controls authored poi-direction sign flipping across boundaries.

When flips are disallowed, runtime resolution deterministically blocks authored flips by inverting segment `poiHeadCyclesPerArmCycle` in resolved playback state.

## Invariants vs Reference-Relative Outputs

Invariant (reference-independent):
- arm/poi element classification,
- phase bucket classification,
- descriptor-to-state generation contract,
- sequencer boundary continuity propagation from segment start/end angles.

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
