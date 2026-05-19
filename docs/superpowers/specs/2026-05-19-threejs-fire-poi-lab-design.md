# Three.js Fire Poi Lab Design

**Status:** Approved for planning

## Problem Statement

The current Three.js lab scene renders deterministic poi head markers, tether geometry, body context, and optional debug trails, but it does not yet support a convincing fire-poi presentation. A plain glowing sphere plus polyline trail is not enough for the intended visual read: fire poi should show a bright anchored hot center at the poi head and a fiery wake that reads like a moving comet or fireball.

The next slice should add a lab-only fire-poi overlay that looks good, stays deterministic under scrubbing and replay, and remains isolated from the existing 2D visualizer, export paths, and non-lab renderers.

## Goals

1. Add an optional fire-poi overlay to the Three.js lab renderer only.
2. Keep the hot core locked to the exact poi head position so motion remains readable.
3. Add a looser deterministic flame wake that visually lags and spreads behind motion.
4. Keep the effect fully scrubbable and deterministic for identical playback time and settings.
5. Expose tunable controls through a reusable floating lab control panel.
6. Establish a reusable lab-effect pattern so future overlays do not bloat the canvas component.
7. Preserve existing debug markers, trails, and body rendering when the fire effect is disabled or unavailable.

## Non-Goals

1. No engine or sequence-model changes.
2. No changes to the 2D visualizer, export renderer, or non-lab Three.js routes.
3. No free-running live particle simulation tied to frame history.
4. No smoke simulation in this slice.
5. No fluid dynamics, combustion physics, or fuel-consumption realism.
6. No requirement to replace or remove the existing debug trails.

## Options Considered

### Option A: Ribbon-first fire effect

Use the sampled head path as the primary fire shape, with a bright core at the head and a stylized ribbon or tube wake that varies in width, alpha, and color.

**Pros**

1. Cheapest implementation.
2. Strongest path readability.
3. Low performance risk.

**Cons**

1. Fire stays too tightly glued to the exact sampled path.
2. Weakest sense of flame breakup and motion lag.
3. Does not generalize well to a reusable effect-controller pattern.

### Option B: Live particle simulation

Emit particles continuously from the poi head and integrate them forward over frame time with drag, turbulence, and fade.

**Pros**

1. Strongest physical feel.
2. Natural-looking breakup and turbulence.
3. Easy to add liveness and spontaneous variation.

**Cons**

1. Breaks determinism and scrubbing unless much more state machinery is added.
2. Harder to keep the poi path readable.
3. More likely to diverge from transport state during pause, reset, and document changes.

### Option C: Deterministic hybrid core plus wake

Render a bright anchored core and short inner flame at the poi head, then reconstruct a bounded deterministic flame wake from recent sampled motion using seeded jitter and per-particle age rules.

**Pros**

1. Best match for the desired hot-core plus comet-wake look.
2. Keeps the poi head location readable.
3. Preserves determinism under scrubbing and replay.
4. Fits a reusable lab-effect-controller architecture.

**Cons**

1. More complex than a pure ribbon overlay.
2. Requires careful decisions about seeded variation, wake reconstruction, and effect settings.

## Recommended Option

Choose Option C.

This is the narrowest design that satisfies the visual goal without breaking the repo's deterministic playback model. It keeps the core anchored to the real poi head, allows a visually looser outer wake, and stays renderer-only so the effect can be added and removed without changing the engine or any non-lab rendering surface.

## Approved Decisions

1. The first version lives only in the Three.js lab.
2. The effect is optional and must not affect any other rendering path.
3. The visual target is a hybrid: bright anchored hot center plus a looser flame envelope and wake.
4. The effect must be deterministic and scrubbable; free-running liveness is explicitly not a priority.
5. The first version includes tunable controls exposed through a floating panel.
6. The floating panel should reuse the existing floating-panel pattern rather than inventing a new UI model.
7. The first version includes flame only; smoke is deferred.
8. Existing debug trails remain available as a separate inspection tool.

## Design

### Scope

This slice adds a fire-poi overlay system to the existing Three.js lab scene. It does not alter transport semantics, sequence semantics, world-pose generation, or body solve behavior. The overlay reads the same world-space poi head positions already used by the lab canvas and derives a deterministic flame presentation from them.

The effect should remain visibly stylized and technical. It should look convincing and expressive, not physically authoritative.

### Architecture

Keep the integration split narrow and explicit:

1. The current playback and world-pose pipeline remains the source of truth.
2. A new fire-poi effect settings module defines normalized settings, defaults, and safe ranges.
3. A lab-only fire-poi effect controller owns scene-object lifecycle, per-rig effect instances, and settings application.
4. Per-rig emitters reconstruct a deterministic wake from recent head motion and render only Three.js objects.
5. The page-level lab UI owns the high-level toggle and floating-panel open/close state.

This prevents the Three.js canvas from becoming a catch-all for effect state, keeps effect-specific logic outside the playback model, and provides a repeatable pattern for future lab overlays.

### Visual Model

Each poi head renders as three coordinated layers:

1. Hot core: a small bright white-yellow emissive center locked exactly to `headPosition`.
2. Inner flame: a short stretched flame form aligned to recent velocity so the burning poi head still reads as the anchor of the motion.
3. Outer wake: a deterministic cloud of fading flame particles distributed behind recent motion, with increasing spread and turbulence as particles age.

The current debug head marker may remain visible beneath or within the effect depending on implementation detail, but the fire layer becomes the dominant read when enabled.

### Deterministic Wake Reconstruction

The wake must be derived from playback state, not accumulated from live frame history.

The intended model is:

1. Sample a bounded recent window of head motion behind the current playback time.
2. Divide that window into deterministic emission steps.
3. Use seeded jitter derived from rig identity and emission step index to produce stable variation.
4. Compute particle position, size, alpha, and color from age, source motion, drag, spread, and turbulence rules.
5. Rebuild the visible wake directly from the current transport time whenever playback is evaluated.

This preserves the requirement that the same sequence time and the same settings produce the same visible fire shape, even after scrubbing, pausing, looping, or switching playback rate.

### Scene Integration

The fire-poi overlay is a pure scene-graph addition inside the Three.js lab canvas.

When enabled:

1. The effect controller creates and updates per-rig scene objects for the hot core, inner flame, and outer wake.
2. The effect reads current head positions and nearby motion history but writes only Three.js render objects.
3. The existing tether, body overlay, grid, axes, plane sheets, and debug trails continue to behave normally.

When disabled:

1. The effect controller hides or disposes the fire objects.
2. The rest of the lab scene renders exactly as it does today.

The effect must not be referenced by the main visualizer, export helpers, or engine-facing code paths.

### Controls And Reusable Lab Pattern

The UI should use two layers of control:

1. A simple on/off fire-poi toggle in the existing right-side lab controls.
2. A separate floating panel for detailed fire tuning.

The floating panel should reuse the existing draggable persistent panel pattern already used elsewhere in the app. The first version should expose a focused set of controls:

1. Enabled
2. Core intensity
3. Core radius
4. Wake length
5. Emission density
6. Turbulence
7. Spread
8. Fade rate
9. Velocity stretch
10. Reset to defaults

To make this slice an exemplar rather than a one-off, the implementation should establish a small reusable lab-effect pattern:

1. Effect settings type and normalization helpers.
2. Default settings factory and persisted storage key.
3. Effect controller interface with create, sync, and dispose responsibilities.
4. Optional floating panel component for effect-family controls.

Future lab-only overlays should be able to reuse this shape without adding direct UI and effect-state sprawl into the main canvas component.

### Error Handling And Boundary Behavior

Failure behavior should remain local and explicit:

1. If the fire-poi effect controller fails to initialize, disable only the fire overlay and preserve the base lab renderer.
2. If persisted settings are invalid, normalize or clamp them to documented safe ranges.
3. If playback jumps because of scrub, loop wrap, reset, or document switch, rebuild the wake directly from the new playback time rather than trying to interpolate missing history.
4. If performance drops, reduce wake density and bounded sample count before degrading other scene systems.
5. No error in the fire overlay should change engine outputs, world-pose evaluation, or non-lab rendering paths.

### Performance Guardrails

This slice should prefer bounded predictable costs over richer simulation.

1. Wake history length must be explicitly capped.
2. Particle or sprite counts must be bounded by settings normalization.
3. Rebuild work should scale with a small recent window, not with total playback duration.
4. Any seeded-random helper must be allocation-conscious and deterministic.

The goal is a stable lab overlay that remains responsive during playback and scrubbing, not a maximal particle showcase.

## Testing And Validation

Validation should focus on deterministic reconstruction, lifecycle boundaries, and lab-only isolation.

1. Add unit tests for fire-poi settings normalization and clamping.
2. Add unit tests for deterministic seeded jitter so identical inputs produce identical wake states.
3. Add unit tests for wake reconstruction from sampled head paths and transport time.
4. Add unit tests for controller lifecycle boundaries: create, sync, disable, and dispose.
5. Perform manual browser validation in the Three.js lab for play, pause, scrub, loop, camera reset, document switch, and fire toggle behavior.
6. Confirm visually that disabling the overlay returns the scene to current non-fire behavior.
7. Confirm that no other renderer, export path, or non-lab route changes behavior when the slice is merged.

Acceptance criteria:

1. The Three.js lab still loads and plays existing sequences.
2. Fire poi can be toggled on and off without affecting the rest of the lab scene.
3. A bright anchored core remains locked to each poi head.
4. The wake reads as a fiery trailing envelope rather than a plain line.
5. Scrubbing to the same playback time with the same settings reproduces the same visible fire shape.
6. The floating control panel persists and behaves consistently with the existing floating-panel pattern.
7. Lint, typecheck, relevant tests, and manual lab verification all pass.

## Risks And Tradeoffs

1. If the inner flame and outer wake are too loose, the poi path will become harder to read.
2. If the effect is too tightly constrained by deterministic reconstruction, it may look mechanical rather than fiery.
3. If the reusable lab-effect pattern is overdesigned, this slice will spend too much effort on framework instead of the actual effect.
4. If the effect controller leaks scene ownership concerns back into the canvas component, future overlays will still create maintenance sprawl.

## Migration Impact

1. No engine API change.
2. No authoring-model change.
3. No export-path change.
4. No required change to the 2D visualizer.
5. The main additions are a lab-only effect-controller subsystem, fire settings/state, floating-panel controls, tests, and Three.js scene integration.

## Follow-On Work

1. Add additional lab-only overlays using the same effect-controller and floating-panel pattern.
2. Explore embers or sparks as a separate follow-on effect once the deterministic fire-wake base is proven.
3. Revisit smoke only if there is a concrete visual need and a bounded deterministic presentation model.