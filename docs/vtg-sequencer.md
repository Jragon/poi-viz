# VTG Sequencer

## Purpose And Mental Model

The VTG sequencer is a beat-based, VTG-only segment player.
It does not morph between patterns. One segment is active at a time.

Core model:
- a sequence is an ordered list of segments,
- each segment carries VTG relation/speed descriptor + duration in beats,
- sequence playback resolves `global beat -> active segment + local beat`,
- active segment state is continuity-propagated (no per-segment canonical restart).

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
  segments: Array<{
    id: string;
    durationBeats: number;
    descriptor: {
      armElement: "Earth" | "Air" | "Water" | "Fire";
      poiElement: "Earth" | "Air" | "Water" | "Fire";
      poiHeadCyclesPerArmCycle: number;
    };
  }>;
}
```

Defaults:
- `loop = true`
- `snapSetting = "event"`
- `startPhaseDeg = 0`
- minimum duration clamp: `1e-6` beats.

Sanitize/validate surface:
- `sanitizeVTGSequence`
- `validateVTGSequence`

Import/export is explicit JSON via:
- `serializeVTGSequence`
- `deserializeVTGSequence`

Legacy payloads (`schema`/`version`/`guidanceMode`) are intentionally rejected.

## Continuity Semantics

Continuity resolver surface:
- `deriveSequenceSegmentSpeedProfile`
- `resolveSequenceContinuity`
- `resolveSequenceContinuityAtBeat`

Behavior contract:
1. Segment speed profile comes from descriptor relation semantics.
2. Sequence start pose is anchored from `startPhaseDeg` + first segment timing relations.
3. Segment `N+1` start angles are propagated from segment `N` end angles.
4. Segment switches change movement parameters only; boundary pose remains continuous.
5. If `loop = true`, seam wraps to the anchored start pose.
6. If `loop = false`, end beat clamps to the final propagated pose.

This is why non-loop transitions do not jump while loop seams intentionally reset.

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

## App Flow

`useVtgSequenceController` owns:
- sequence mode state,
- segment list editing (add/select/duration/reorder/delete/duplicate),
- sequence import/export status,
- continuity-based render state selection.

Mode routing:
- `sequenceMode=false`: VTG apply mutates runtime state directly.
- `sequenceMode=true`: VTG apply edits selected segment descriptor and updates sequence `startPhaseDeg` from VTG phase selection.

In sequence mode:
- render state channels use propagated segment start angles + segment speed profile,
- render beat is the local segment beat,
- transport loop beats follow sequence total beats (with minimum transport floor).

## UI Behavior

`ControlsSequencePanel.vue` provides:
- sequence mode toggle,
- sequence name,
- loop toggle,
- snap toggle,
- sequence-level `startPhaseDeg` selector,
- segment list editor (add/select/reorder/delete/duplicate/duration),
- JSON export/import.

`VtgPanel.vue` still edits arm/poi relation + signed cycles.
In sequence mode, those edits target the selected segment descriptor.

## Determinism And Tests

Deterministic guarantees:
- same input sequence + beat => same active segment/local beat,
- same sequence => same continuity propagation result,
- same sequence + beat => same resolved continuity segment.

Coverage:
- `tests/vtg/sequence.test.ts`
  - sanitize/validate
  - boundaries/playhead mapping
  - snap behavior
  - non-loop no-jump propagation
  - loop seam reset
  - determinism
  - legacy payload rejection
  - `src/vtg/thing.json` continuity scenario
- `tests/ui/app.integration.test.ts`
  - sequence mode playback selection
  - mode-based VTG apply routing
  - sequence start-phase anchor behavior

Verification commands:
- `npm test`
- `npm run build`
- `npm run docs:all`

## Known Limitations

- No generalized morph/interpolation transitions.
- No guidance mode or guidance classification in this schema.
- Sequence data is runtime/controller-local (not app durable persistence state).
