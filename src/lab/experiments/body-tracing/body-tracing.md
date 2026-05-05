<div class="lab-entry-meta">
  <span>Experiment</span>
  <span>Body Tracing</span>
  <span>Canvas</span>
  <span>5 May 2026</span>
</div>

<p class="lab-entry-kicker">Lab note 002</p>

# Body tracing sandbox

This starts from a deliberately small body model: a basic stick figure on canvas with both hands draggable. The feet and hips stay planted, the rig infers torso yaw from the two hand positions, and both elbows are solved from fixed two-bone arms so the wrists can move without stretching the limbs.

<BodyTracingStickFigureCanvas />

## Why start here?

The visualizer already knows how to render poi paths, but body tracing needs a separate question answered first: what is the body surface we are tracing against? This experiment isolates that question so we can learn how much structure we actually need before adding poi heads, trails, or side-of-hand metadata.

## Current scope

- Front-view stick figure only.
- Both hands are draggable.
- The rig infers a best-fit torso yaw from the two hand targets.
- Feet, hips, pelvis, torso center, and neck stay fixed.
- The shoulder span compresses as a 2D proxy for torso rotation.
- Both elbows move to satisfy fixed arm-length constraints.
- Unreachable targets are clamped as best-effort poses with diagnostics.
- Poi rendering and trails are still out of scope.

## Next obvious additions

- Add a poi head marker attached to the draggable hand.
- Sample a short trail from the hand or poi head.
- Tune the yaw cost function against real body-tracing examples.
- Introduce left/right, front/back, and top/bottom side metadata once the body surface feels stable.

<script setup>
import BodyTracingStickFigureCanvas from "./BodyTracingStickFigureCanvas.vue";
</script>
