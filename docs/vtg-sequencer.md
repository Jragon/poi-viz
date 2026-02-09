# VTG Sequencer

## Purpose And Mental Model

The VTG sequencer is a beat-based, VTG-only segment player.
It is piecewise: one segment is active at a time, and segment switches update motion parameters without resetting pose.

Core model:
- a sequence is an ordered list of segments,
- each segment carries VTG relation/speed descriptor + duration in beats,
- playback resolves `global beat -> active segment + local beat`,
- continuity propagation carries start angles from segment to segment,
- loop seam wraps back to anchored start pose.

Primary code:
- `src/vtg/sequence.ts`
- `src/composables/useVtgSequenceController.ts`
- `src/composables/useAppOrchestrator.ts`

## Sequence Shape

Current shape (no schema/version wrapper):

```ts
{
  name: string;
  loop: boolean;
  snapSetting: "event" | "none";
  startPhaseDeg: 0 | 90 | 180 | 270;
  allowPoiDirectionFlip: boolean;
  segments: Array<{
    id: string;
    durationBeats: number;
    descriptor: {
      armElement: "Earth" | "Air" | "Water" | "Fire";
      poiElement: "Earth" | "Air" | "Water" | "Fire";
      poiHeadCyclesPerArmCycle: number;
      rightArmSign: 1 | -1;
    };
  }>;
}
```

Defaults:
- `loop = true`
- `snapSetting = "event"`
- `startPhaseDeg = 0`
- `allowPoiDirectionFlip = false`
- descriptor defaults: `poiHeadCyclesPerArmCycle = -3`, `rightArmSign = 1`
- minimum duration clamp: `1e-6` beats.

Sanitize/validate/import/export surface:
- `sanitizeVTGSequence`
- `validateVTGSequence`
- `serializeVTGSequence`
- `deserializeVTGSequence`

Legacy payloads (`schema`/`version`/`guidanceMode`) are intentionally rejected.

## Continuity And Transition Semantics

Resolver surface:
- `deriveSequenceSegmentSpeedProfile`
- `resolveSequenceContinuity`
- `resolveSequenceContinuityAtBeat`

Behavior contract:
1. Segment 1 starts from `startPhaseDeg` anchor + first-segment timing relations.
2. Segment `N+1` starts exactly at segment `N` end angles.
3. Segment switches change speed profile only; non-loop boundary pose does not jump.
4. If `loop=true`, seam wraps to anchored start pose.
5. If `loop=false`, playhead clamps to final propagated pose.

Arm-direction contract:
- `rightArmSign` explicitly sets right-arm branch (`+` or `-`).
- Left-arm sign is derived from `armElement` relation (`same-direction` or `opposite-direction`).

Poi-direction constraint:
- with `allowPoiDirectionFlip=false`, authored right-head sign flips are detected and blocked deterministically at runtime by inverting segment `poiHeadCyclesPerArmCycle` for resolved playback,
- with `allowPoiDirectionFlip=true`, authored flips are used as-is.

Helpers:
- `detectPoiDirectionViolations`
- `deriveSequenceArmDirectionBadges`

## Snap And Timing

Snap options:
- `event`: duration normalized to arm-phase event spacing,
- `none`: entered duration kept as-is.

Event spacing is derived, not hardcoded:
- spacing = `(π/2) / |ω_arm|`.
- at canonical VTG arm speed (`2π rad/beat`), spacing is `0.25` beats.

Primary helpers:
- `getArmPhaseEventSpacingBeats`
- `snapDurationToArmPhaseEvents`
- `normalizeSequenceEventSnap`

## App And UI Flow

`useVtgSequenceController` owns:
- sequence-mode state,
- segment list editing,
- continuity-based render-state selection,
- trail seam reset signaling,
- sequence JSON import/export.

Mode routing:
- `sequenceMode=false`: VTG apply mutates runtime state.
- `sequenceMode=true`: VTG apply edits selected segment descriptor and syncs sequence `startPhaseDeg` from VTG phase selector.

Sequence UI (`ControlsSequencePanel.vue`) provides:
- sequence mode toggle,
- sequence name,
- loop toggle,
- snap toggle,
- `allowPoiDirectionFlip` toggle,
- sequence-level `startPhaseDeg` selector,
- segment list editor (add/select/reorder/delete/duplicate/duration),
- selected-segment `rightArmSign` control,
- per-segment direction badges (`L:+/-`, `R:+/-`),
- active-playhead direction badges,
- JSON export/import.

In sequence mode:
- render channels come from continuity-propagated starts + resolved speed profile,
- render beat stays sequence-global (wrapped/clamped by loop policy),
- trail history stays continuous across segment boundaries and resets only on loop seam wrap.

## Determinism And Tests

Deterministic guarantees:
- same sequence + same beat => same active segment/local beat,
- same sequence => same continuity propagation and resolved speed profiles,
- same sequence + same beat => same rendered resolved segment.

Coverage:
- `tests/vtg/sequence.test.ts`
  - sanitize/validate
  - boundaries/playhead mapping
  - snap behavior
  - no-jump propagation
  - loop seam reset
  - `rightArmSign` branch behavior
  - poi-flip constraint enforcement (`allowPoiDirectionFlip`)
  - determinism
  - legacy payload rejection
  - `src/vtg/thing.json` continuity scenario
- `tests/ui/app.integration.test.ts`
  - sequence mode playback selection
  - mode-based VTG apply routing
  - right-arm-sign editing affects resolved motion
  - active direction badge values
- `tests/ui/pattern-trails.integration.test.ts`
  - no trail reset at segment boundaries
  - trail reset at loop seam only

Verification commands:
- `npm test`
- `npm run build`
- `npm run docs:all`

## Known Limitations

- No generalized morph/interpolation transitions.
- Sequence state is runtime/controller-local (not part of durable app persistence state).
- Poi-flip enforcement currently applies deterministic runtime fallback instead of hard-blocking edit operations.
