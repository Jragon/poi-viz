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

`classifyPhaseBucket` maps the right-head phase offset relative to right-arm phase to one of `0/90/180/270` with ±5° tolerance.
This bucket is a relative poi offset and does not change when global phase-reference changes.

- Bucket set: `src/vtg/types.ts` export `VTG_PHASE_BUCKETS`.
- Tolerance logic: `src/vtg/classify.ts` exports `shortestAngularDistanceRadians`, `classifyPhaseBucket`.

## Relationship Table

`src/vtg/types.ts` export `getRelationForElement` defines:

- Earth = same-time + same-direction
- Air = same-time + opposite-direction
- Water = split-time + same-direction
- Fire = split-time + opposite-direction

Inverse mapping is `src/vtg/types.ts` export `getElementForRelation`.

With default `phaseReference = down` and `phaseDeg = 0`, this produces the spinner-facing cardinal readouts:
- Air: together at top/bottom, apart at sides.
- Fire: together at sides, apart at top/bottom.

## Generator Mapping (Descriptor -> Engine Params)

Generator inputs:
- `armElement`
- `poiElement`
- `phaseDeg`
- `poiCyclesPerArmCycle` (signed)

`generateVTGState` performs:

1. Set canonical right arm speed baseline: `ω_arm_R = 2π`.
2. Resolve arm orientation baseline from global phase reference (reference-zero direction).
3. Resolve left arm relation from `armElement` to get `ω_arm_L` sign and `φ_arm_L` timing offset.
4. Convert signed head cycles to right-head speed: `ω_head_R = poiCyclesPerArmCycle * 2π`.
5. Resolve left head direction/timing from `poiElement`.
6. Apply `phaseDeg` as a poi-head offset relative to arms:
   - `φ_head_R = φ_arm_R + phaseOffset(phaseDeg)`,
   - `φ_head_L = φ_head_R + timingOffset(poiElement)`.
7. Solve relative channels per hand:
   - `ω_rel = ω_head - ω_arm`
   - `φ_rel = φ_head - φ_arm`
8. Validate by re-classifying with `classifyVTG`.

Code references:
- `src/vtg/generate.ts` exports `generateVTGState`.
- `src/state/phaseReference.ts` exports `referencePhaseBucketToCanonical`.

## Invariants vs Reference-Relative Outputs

Invariant (reference-independent):
- `armElement` and `poiElement` classification (timing/direction only).

Reference-relative:
- arm orientation baseline chosen by global `phaseReference`.

Reference-independent:
- `phaseDeg` bucket output from `classifyVTG` (poi offset).
- VTG phase chip semantics in `src/components/VtgPanel.vue`.

## Warning: Generator Wrapper, Not Sequencer

The VTG panel in `src/components/VtgPanel.vue` generates a single canonical continuous state.
It does not sequence discrete phases in Phase 1.
Engine motion remains continuous and is still defined by `src/engine/*`.

## Validated By

- `tests/vtg/generate.test.ts` verifies descriptor round-trip classification, phase tolerance, signed cycle mapping, and invariants.
- `tests/vtg/classify.test.ts` verifies arm/poi element rotation invariance and canonical cardinal descriptors.
- `tests/engine/invariants.test.ts` verifies generated states still satisfy engine geometric invariants.
