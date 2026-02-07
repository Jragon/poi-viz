# Glossary

## Core Symbols

- `ω_arm`
  Arm angular speed in radians per beat (`src/engine/angles.ts` export `getAngles`).
- `ω_rel`
  Relative poi angular speed in radians per beat (`src/engine/angles.ts` export `getAngles`).
- `ω_head`
  Absolute head angular speed where `ω_head = ω_arm + ω_rel` (`src/vtg/classify.ts` helper `getHeadSpeedRadiansPerBeat`, `src/state/speedUnits.ts` export `getAbsoluteHeadSpeedRadiansPerBeat`).
- `φ_arm`, `φ_rel`, `φ_head`
  Phase offsets in radians, with `φ_head = φ_arm + φ_rel` (`src/vtg/classify.ts` helper `getHeadPhaseRadians`).

## Timing And Direction Terms

- `same-time`
  Left/right phase offset near `0` radians.
- `split-time`
  Left/right phase offset near `π` radians.
- `same-direction`
  Left/right angular speeds have same sign.
- `opposite-direction`
  Left/right angular speeds have opposite signs.

Mapping authority:
- `src/vtg/types.ts` exports `getRelationForElement` and `getElementForRelation`.

## VTG Element Labels

- Earth = same-time + same-direction
- Air = split-time + opposite-direction
- Water = split-time + same-direction
- Fire = same-time + opposite-direction

Validation references:
- `tests/vtg/generate.test.ts`
- `tests/vtg/classify.test.ts`

## Petals (Repo-Specific)

In this repo’s flower language, petal count uses the head-cycle relationship:

- `headCycles = petals + 1` in antispin framing.

Related implementation:
- `src/state/presets.ts` export `applyFlowerModePreset`.
- `src/state/constants.ts` export `PETAL_COUNTS`.

## Phase Bucket

`phaseDeg` is a discrete orientation bucket for left-head absolute phase:
- Allowed values: `0`, `90`, `180`, `270`.
- Tolerance: ±5° around each bucket.

Code references:
- `src/vtg/types.ts` export `VTG_PHASE_BUCKETS`.
- `src/vtg/classify.ts` export `classifyPhaseBucket`.
