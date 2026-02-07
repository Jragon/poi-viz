You are generating a new repo for a small web app. Build a working MVP in one pass.

## Project: Poi Phase Visualiser (Wall Plane, Extensions + Flowers)

### Context (what “poi” is, in one paragraph)
Poi is a prop where each hand holds a tether with a weighted head. In the wall plane (2D), the “hand point” moves around a circle (arm rotation), and the “head point” moves around the hand (poi rotation relative to the hand). Many classic poi patterns (extensions, flowers, anti-spin flowers) emerge from the phase/speed relationship between these coupled rotations. This app visualises that relationship with a 2D scene and corresponding sinewaves.

## Tech requirements
- Vue 3 + TypeScript
- Vite
- Tailwind CSS
- Canvas 2D rendering (no WebGL)
- Unit tests with Vitest
- GitHub Pages deploy via GitHub Actions (Vite build -> dist)

## MVP goals
Single-page app with:
1) Pattern viewport (2D wall-plane):
   - Black background with polar grid (concentric circles + axes)
   - Two poi displayed (Left/Right):
     - hand point (small dot)
     - tether line
     - head point (larger dot)
   - Optional trails on/off to show emergent patterns
2) Waveform inspector:
   - Canvas-based plots of sin/cos channels for oscillators
   - Vertical playhead cursor synced to viewport
3) Controls + presets:
   - Play/pause, scrub slider, BPM, loop length
   - Per-hand parameters (arm + poi-relative)
   - Preset buttons (earth/air/water/fire + basic flowers)
   - Shareable URL state (querystring) and localStorage restore

## Math contract (single source of truth)
All motion is in the wall plane (x right, y up). Angles increase counter-clockwise.

Time is in beats: t (beats).
BPM is for UI conversion only: secondsPerBeat = 60 / bpm.

Angular velocities are in radians per beat.

For each hand i ∈ {L,R}:
- θ_arm_i(t) = ω_arm_i * t + φ_arm_i
- θ_rel_i(t) = ω_rel_i * t + φ_rel_i          // poi rotation relative to the hand
- Hand position:
  H_i(t) = R_arm_i * [cos θ_arm_i, sin θ_arm_i]
- Head position:
  P_i(t) = H_i(t) + R_poi_i * [cos(θ_arm_i + θ_rel_i), sin(θ_arm_i + θ_rel_i)]
- Tether vector is P_i(t) - H_i(t)

Notes:
- Extensions: ω_rel = 0
- Flowers/anti-flowers: ω_rel has magnitude > 0; sign controls spin/antispin; ratios control petal counts.
- Do NOT wrap angles for plotting; use sin/cos channels (no sawtooth jumps).

## Parameters (state schema)
Global:
- bpm: number (default 120)
- loopBeats: number (default 4)
- playSpeed: number (default 1.0)
- isPlaying: boolean
- t: number (beats playhead; scrub sets this)
- showTrails: boolean (default true)
- trailBeats: number (default 4)
- trailSampleHz: number (default 120)
- showWaves: boolean (default true)

Per hand (L and R):
- armSpeed: number (ω_arm, rad/beat)
- armPhase: number (φ_arm, rad)
- armRadius: number (pixels/units)
- poiSpeed: number (ω_rel, rad/beat)
- poiPhase: number (φ_rel, rad)
- poiRadius: number (pixels/units)

Defaults (should show a recognisable pattern immediately):
- armRadius = 120
- poiRadius = 180
- ω_arm_L = 2π, φ_arm_L = 0
- ω_arm_R = 2π, φ_arm_R = π                 // split-time default
- ω_rel_L = 6π, φ_rel_L = 0                 // 3 cycles/beat relative
- ω_rel_R = 6π, φ_rel_R = 0

## Presets
Provide buttons that set parameters:
- Elements (derived from arm relation; implement as param sets):
  - Earth: same time, same direction
  - Air: same time, opposite direction
  - Water: split time, same direction
  - Fire: split time, opposite direction
  Implement these by adjusting ω_arm_R sign and φ_arm_R offset relative to L:
    - same time: φ_arm_R = φ_arm_L
    - split time: φ_arm_R = φ_arm_L + π
    - same direction: sign(ω_arm_R) = sign(ω_arm_L)
    - opposite direction: sign differs
- Flowers:
  - 3-, 4-, 5-petal inspin and antispin examples
  (Implement by setting ω_rel to +k*ω_arm or -k*ω_arm, plus phases = 0)

## Trails requirements
- Trails show the last N beats of head positions for each poi (L and R).
- Implement as ring buffers per poi head:
  - capacity = ceil(trailSampleHz * trailSeconds)
  - trailSeconds = trailBeats * (60 / bpm)
- Each animation frame, sample positions at fixed timestep based on trailSampleHz (decouple from FPS).
- Rendering:
  - trails drawn behind poi
  - optional fade: alpha decreases with age
- Toggle on/off and trail length control in UI.

## Waveform inspector requirements
Canvas-based plotting (no heavy chart libs required).
For each oscillator:
- Plot sin and cos over one loop (0..loopBeats)
Traces:
- sin/cos(θ_arm_L), sin/cos(θ_rel_L)
- sin/cos(θ_arm_R), sin/cos(θ_rel_R)
Optional helpful traces:
- sin/cos(θ_arm_L - θ_arm_R) (timing relation)
- sin/cos(θ_rel_L), sin/cos(θ_rel_R) already cover relative phase

Display:
- grid, labels, stacked lanes
- vertical cursor at current playhead t

## Rendering requirements
- Use Canvas 2D.
- Create components:
  - PatternCanvas.vue (viewport)
  - WaveCanvas.vue (waves)
  - Controls.vue (inputs/presets)
- Layout: single page, 3-panel (viewport + waves + controls) responsive.
- Draw order in viewport: background -> grid -> trails -> tether lines -> dots.

## State persistence + sharing
- Encode full state into URL querystring (shareable).
- On load: parse URL -> state; fall back to localStorage defaults.
- On changes: update URL (debounced) and localStorage.
- Add a “Copy link” button that copies current URL.

## Validation loop (must implement)
Add Vitest tests for engine correctness:

1) Invariants (for multiple times t):
- |H_i(t)| ≈ R_arm_i (hand stays on circle)
- |P_i(t) - H_i(t)| ≈ R_poi_i (tether length constant)

2) Special cases:
- If ω_rel = 0, head path is a circle of radius (R_arm + R_poi) centred at origin.
- If R_arm = 0, head path is a circle of radius R_poi centred at origin.

3) Fixture tests (golden numeric samples):
- Provide a script `npm run gen:fixtures` that samples a small set of presets
  and writes JSON fixtures (arrays of positions) into /fixtures.
- Provide tests that recompute and compare against fixtures within tolerance.

Tolerance guidance:
- math comparisons: 1e-6
- fixture comparisons: 1e-4 (to allow minor float differences)

## Repo deliverables
- Runs locally: `npm install && npm run dev`
- Tests: `npm test`
- Fixture generation: `npm run gen:fixtures`
- Build: `npm run build`
- GitHub Actions workflow for GH Pages deployment

## Implementation notes
- Keep engine pure: engine.ts exports functions like:
  - getAngles(params, tBeats)
  - getPositions(params, tBeats)
  - sampleLoop(params, sampleHz, loopBeats) -> arrays
- Use requestAnimationFrame loop for playback.
- Use a fixed simulation step for trail sampling (derived from trailSampleHz) to be deterministic.
- Keep rendering and engine separate.

Deliver the full project structure and code.
