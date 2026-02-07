# Math Model

## Canonical Equations

For each hand \(i \in \{L, R\}\), at beat time \(t\):

- \(\theta_{arm,i}(t) = \omega_{arm,i} \cdot t + \phi_{arm,i}\)
- \(\theta_{rel,i}(t) = \omega_{rel,i} \cdot t + \phi_{rel,i}\)
- \(\theta_{head,i}(t) = \theta_{arm,i}(t) + \theta_{rel,i}(t)\)
- \(\omega_{head,i} = \omega_{arm,i} + \omega_{rel,i}\)

Position equations:

- \(H_i(t) = R_{arm,i}[\cos(\theta_{arm,i}), \sin(\theta_{arm,i})]\)
- \(P_i(t) = H_i(t) + R_{poi,i}[\cos(\theta_{head,i}), \sin(\theta_{head,i})]\)

Code references:
- `src/engine/angles.ts` export `getAngles`.
- `src/engine/positions.ts` export `getPositions`.
- `src/engine/math.ts` export `vectorFromPolar`.

## Units And Conventions

- Angles: radians in engine/state internals.
- Angular speed: radians per beat.
- Time: beats, not seconds.
- Coordinates: `+x` right, `+y` up, positive rotation is counter-clockwise.

Code references:
- `src/engine/types.ts` export `Vector2` and `EngineParams`.
- `src/state/angleUnits.ts` exports `radiansToDegrees` and `degreesToRadians`.
- `src/state/speedUnits.ts` exports `radiansPerBeatToCyclesPerBeat` and `speedToRadiansPerBeat`.

## Angle Wrapping Terminology

- `wrapTo2Pi(θ)` in this repo is `src/vtg/classify.ts` export `normalizeAngleRadians`.
- `|wrapToPi(Δθ)|` behavior is implemented via `src/vtg/classify.ts` export `shortestAngularDistanceRadians`.

These wrappers are used for VTG tolerance checks and bucket classification, not for engine trajectory integration.

## Why Wave Panels Plot sin/cos Instead Of Wrapped Angles

Wrapped angle plots introduce jump discontinuities at branch cuts (for example \(2\pi \to 0\)).
The wave inspector therefore plots `sin(θ)` and `cos(θ)` channels sampled from oscillator outputs so traces remain continuous and phase relationships are visible.

Code references:
- `src/engine/sampling.ts` export `sampleLoop` provides deterministic angle samples.
- `src/render/waveRenderer.ts` consumes sampled channels for plotting.

## Invariants

For all sampled times:

- \(|H_i(t)| = R_{arm,i}\)
- \(|P_i(t) - H_i(t)| = R_{poi,i}\)

The tether identity is explicit in code as `tether = head - hand`.

Code references:
- `src/engine/positions.ts` export `getPositions`.
- `src/engine/math.ts` exports `subtractVectors` and `vectorMagnitude`.

## Validated By

- `tests/engine/invariants.test.ts` checks arm radius and tether magnitude invariants.
- `tests/engine/special-cases.test.ts` checks `ω_rel = 0` and `R_arm = 0` boundary behavior.
- `tests/engine/positions.test.ts` checks position-channel consistency.
- `tests/engine/sampling.test.ts` checks deterministic loop sampling.
