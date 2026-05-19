<div class="lab-entry-meta">
  <span>Experiment</span>
  <span>Body Tracing</span>
  <span>Canvas</span>
  <span>5 May 2026</span>
</div>

<p class="lab-entry-kicker">Lab note 002</p>

# Body tracing sandbox

This starts from a deliberately small body model: a basic stick figure on canvas with both hands draggable. The rig draws from the shared humanoid skeleton output, including pelvis and chest solving and full shoulder-girdle placement. Both hands are draggable; the rig infers torso yaw from the two hand positions, solves the pelvis/chest/shoulder-girdle chain, and normalises the shared hand guide to the canonical wall-plane pattern space.

<BodyTracingStickFigureCanvas />

## Sequence-driven overlay POC

This second demo exercises the main visualizer body overlay while reusing the visualizer backend for sequence timing and rig evaluation. It is wall-plane focused: poi and trails draw through the shared viewport, and the solved body follows the authored left and right hand tracks. Sequence radius 1 maps to the largest circle where both hands can occupy the exact same point, and the selector can load any authored sequence.

<BodyTracingSequenceOverlayCanvas />

## Why start here?

The visualizer already knows how to render poi paths, but body tracing needs a separate question answered first: what is the body surface we are tracing against? This experiment isolates that question so we can learn how much structure we actually need before adding poi heads, trails, or side-of-hand metadata.

## Current scope

- Front-view stick figure only.
- Both hands are draggable.
- Main-visualizer wall-plane sequence demo with poi and body overlay.
- Sequence radius 1 is normalized to the largest shared-hand overlap circle.
- Authored sequences can be selected inside the POC.
- The rig infers a best-fit torso yaw from the two hand targets.
- Feet, hips, pelvis, torso center, and neck stay fixed.
- The shoulder span compresses as a 2D proxy for torso rotation.
- Both elbows move to satisfy fixed arm-length constraints.
- Unreachable targets are clamped as best-effort poses with diagnostics.
- The main visualizer body overlay is now part of this path; export behavior and body-aware side metadata are still out of scope.

## Next obvious additions

- Add a poi head marker attached to the draggable hand.
- Sample a short trail from the hand or poi head.
- Tune the yaw cost function against real body-tracing examples.
- Introduce left/right, front/back, and top/bottom side metadata once the body surface feels stable.

<script setup>
import BodyTracingStickFigureCanvas from "./BodyTracingStickFigureCanvas.vue";
import BodyTracingSequenceOverlayCanvas from "./BodyTracingSequenceOverlayCanvas.vue";
</script>
