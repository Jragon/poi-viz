# VTG Layer

## What VTG Controls

The VTG layer is a discrete generator/classifier wrapper around the continuous engine.

Primary code:
- `src/vtg/types.ts` exports `VTGDescriptor`, `VTGElement`, `VTGPhaseDeg`, `getRelationForElement`.
- `src/vtg/generate.ts` export `generateVTGState`.
- `src/vtg/classify.ts` exports `classifyArmElement`, `classifyPoiElement`, `classifyPhaseBucket`, `classifyVTG`.

## Arm Element Classification

`classifyArmElement` uses only arm timing and direction relation:
- Timing: phase offset bucket (`same-time` when `Δφ_arm ≈ 0`, `split-time` when `Δφ_arm ≈ π`).
- Direction: speed-sign relation (`same-direction` or `opposite-direction`).

This makes arm element classification rotation-invariant.

Code references:
- `src/vtg/classify.ts` exports `classifyArmElement`, `classifyBinaryTiming`, `classifyDirection`.

## Poi Element Classification (Head Motion In World Frame)

`classifyPoiElement` classifies head motion, not relative poi motion:

- `ω_head = ω_arm + ω_rel`
- `φ_head = φ_arm + φ_rel`

Then it applies the same timing/direction logic to left vs right head channels in world frame.

Code references:
- `src/vtg/classify.ts` exports `classifyPoiElement`.
- `src/vtg/classify.ts` helpers `getHeadSpeedRadiansPerBeat`, `getHeadPhaseRadians`.

## Phase Buckets

`classifyPhaseBucket` maps left-head absolute phase to one of `0/90/180/270` with ±5° tolerance.

- Bucket set: `src/vtg/types.ts` export `VTG_PHASE_BUCKETS`.
- Tolerance logic: `src/vtg/classify.ts` exports `shortestAngularDistanceRadians`, `classifyPhaseBucket`.

## Relationship Table

`src/vtg/types.ts` export `getRelationForElement` defines:

- Earth = same-time + same-direction
- Air = split-time + opposite-direction
- Water = split-time + same-direction
- Fire = same-time + opposite-direction

Inverse mapping is `src/vtg/types.ts` export `getElementForRelation`.

## Generator Mapping (Descriptor -> Engine Params)

Generator inputs:
- `armElement`
- `poiElement`
- `phaseDeg`
- `poiCyclesPerArmCycle` (signed)

`generateVTGState` performs:

1. Set canonical left arm baseline: `ω_arm_L = 2π`, `φ_arm_L = 0`.
2. Resolve right arm relation from `armElement` to get `ω_arm_R` sign and `φ_arm_R` timing offset.
3. Convert signed head cycles to head speed: `ω_head_L = poiCyclesPerArmCycle * 2π`.
4. Resolve right head direction/timing from `poiElement`.
5. Set left head orientation from `phaseDeg` bucket.
6. Solve relative channels per hand:
   - `ω_rel = ω_head - ω_arm`
   - `φ_rel = φ_head - φ_arm`
7. Validate by re-classifying with `classifyVTG`.

Code references:
- `src/vtg/generate.ts` exports `generateVTGState` and helper `phaseBucketToRadians`.

## Warning: Generator Wrapper, Not Sequencer

The VTG panel in `src/components/VtgPanel.vue` generates a single canonical continuous state.
It does not sequence discrete phases in Phase 1.
Engine motion remains continuous and is still defined by `src/engine/*`.

## Validated By

- `tests/vtg/generate.test.ts` verifies descriptor round-trip classification, phase tolerance, signed cycle mapping, and invariants.
- `tests/vtg/classify.test.ts` verifies arm/poi element rotation invariance and canonical cardinal descriptors.
- `tests/engine/invariants.test.ts` verifies generated states still satisfy engine geometric invariants.
