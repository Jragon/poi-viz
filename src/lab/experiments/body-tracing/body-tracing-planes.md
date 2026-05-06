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

The sequence below is authored directly as engine data. It stays on the wall plane and alternates side `a` and side `b` only at right/left aligned boundary poses.

<PlaneSideSequenceVisualizer />

## Atomic plane side surfaces

This canvas draws both sides of each atomic plane as projected 3D surfaces. The visual offset is a display choice only; engine pose evaluation stays local and planar.

<PlaneSideSandboxCanvas />

<script setup>
import PlaneSideSandboxCanvas from "./PlaneSideSandboxCanvas.vue";
import PlaneSideSequenceVisualizer from "./PlaneSideSequenceVisualizer.vue";
</script>
