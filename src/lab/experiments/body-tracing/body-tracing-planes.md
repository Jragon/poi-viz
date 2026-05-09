<div class="lab-entry-meta">
  <span>Experiment</span>
  <span>Body Tracing</span>
  <span>Plane Sides</span>
  <span>6 May 2026</span>
</div>

<p class="lab-entry-kicker">Lab note 003</p>

# Body tracing plane sides

This sandbox checks the generic `planeSide` engine metadata without introducing body-tracing names into the runtime. Side `a` and side `b` stay deliberately neutral here; later body-aware layers can decide how those sides map to practice vocabulary.

## Engine-backed side sequence

The sequence below is authored directly as engine data. It stays on the wall plane: side `b` is the back side for full poi circles, and side `a` is the front side for transfer arcs.

### Current wrap probe model

The active probe is intentionally narrow: one single-poi lower wrap compiled from phase landmarks, not from named trick abstractions. The poi phase is the primary schedule and the hand position changes only during the transfer windows.

The schedule is:

- `1`: poi `90`, hand right
- `2`: poi `270`, hand right
- `2.5`: poi `0`, hand right, hand starts moving
- `3`: poi `90`, hand center
- `3.5`: poi `180`, hand left, hand stops moving
- `4`: poi `270`, hand left
- `5`: poi `90`, hand left
- `5.5`: poi `180`, hand left, hand starts moving
- `6`: poi `270`, hand center
- `0.5`: poi `0`, hand right, hand stops moving and the loop restarts

This means the full side circles and the top/bottom arcs are produced by a continuous poi phase clock around the moving hand. The hand transfer is not the primitive shape; it is the support motion that makes the scheduled poi landmarks possible.

The current implementation is the minimal engine form of that schedule: four segments total. The intermediate numbered points are not separate segments; they occur inside the continuous circle/transfer segments. The transfer hand motion uses a runtime-only sandbox driver so we can tune easing without promoting the profile into a serializable engine primitive yet.

- right-side full circle, back side `b`: `0.5 -> 2.5`
- top transfer, front side `a`: `2.5 -> 3.5`
- left-side full circle, back side `b`: `3.5 -> 5.5`
- bottom transfer, front side `a`: `5.5 -> 0.5`

<PlaneSideSequenceVisualizer />

## Atomic plane side surfaces

This canvas draws both sides of each atomic plane as projected 3D surfaces. The visual offset is a display choice only; engine pose evaluation stays local and planar.

<PlaneSideSandboxCanvas />

<script setup>
import PlaneSideSandboxCanvas from "./PlaneSideSandboxCanvas.vue";
import PlaneSideSequenceVisualizer from "./PlaneSideSequenceVisualizer.vue";
</script>
