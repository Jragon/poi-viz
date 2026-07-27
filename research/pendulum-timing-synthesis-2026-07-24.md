# Timing Is a Relationship

## Pendulums, phase, gravity, and the limits of “split time”

Research synthesis and AI handoff
24 July 2026

This document consolidates the recent pendulum, quarter-timing, Rastaxel, authoring, stall-graph, and gravity-circle work. It distinguishes source-aligned repository facts from new mathematical deductions and from hypotheses that still require physical or community validation.

Status vocabulary:

- **Implemented** means the behavior exists in the current source or recent committed history.
- **Experimental** means it exists in `src/lab/` or in the current uncommitted gravity-circle work.
- **Derived** means the result follows from the stated equations and assumptions.
- **Hypothesis** means the idea is promising but not yet validated against performers or recordings.
- **Editorial recommendation** means advice about public framing rather than an engine decision.

---

# 1. Executive thesis

The strongest public thesis is not “split time is fake.” The phase relationship is real. What is conventional is the choice of clock, landmark, and name.

The more defensible formulation is:

> **Timing is always a relationship. “Same,” “split,” and “quarter” are names for alignments between repeated events chosen from continuous motion. Pendulums reveal that the names are not universal because spatial position, downbeat timing, and travel direction do not share the same period.**

This yields five main conclusions.

1. A single move has a cycle, phase, rate, path, and landmarks. Two moves have a relative phase or timing relationship. A single move can also be timed against music, the body, or another external clock, so “timing only exists with two hands” is too strong. The correct statement is that timing is relational.

2. Circle terminology silently uses a specific observable: the bottom passage. On a circle there is one bottom passage per spatial cycle. “Same time” aligns the two bottom passages; “split time” offsets them by half a cycle.

3. A pendulum has two bottom passages per oscillator cycle. Its downbeat clock therefore runs twice as fast as its full state clock. A half-cycle oscillator offset aligns the downbeats again while reversing travel; a quarter-cycle oscillator offset alternates the downbeats. This is why circle-style split time does not transfer literally.

4. Direction is not safely discarded. For a circle it can be represented as a persistent traversal sign. For a pendulum, instantaneous direction is a function of oscillator phase and reverses at each dead point. Pendulums show that the minimal state is phase-space state, not position alone.

5. The current gravity work has two valid but different models:

   - a period-normalized physical pendulum used to compare speed profiles; and
   - a fixed-pivot, taut vertical loop used to compare constant-speed and ballistic motion.

   Neither should replace the deterministic kinematic pendulum driver in the engine.

The article should use the provocative line “split time is a social construct” as a hook only, then immediately sharpen it:

> The offset is measurable. The convention is which event we count and which offsets we name.

---

# 2. What changed in the repository

## 2.1 Built-in pendulum driver

**Implemented.** Commit `72d1041` added a serializable deterministic pendulum driver to the engine and authoring system.

For amplitude \(A\), frequency \(f\), authored oscillator phase \(s\), and local time \(t\):

\[
\theta(t)
=
\theta_0
+
A\left[
\sin(s+2\pi f t)-\sin(s)
\right].
\]

The subtraction of \(\sin(s)\) is important: it makes the authored start pose exact at \(t=0\).

Current constraints:

- \(0 < A \le \pi/2\);
- \(f>0\);
- finite oscillator phase and finite phase range;
- wall and wheel planes only;
- constant radius;
- a head pendulum must be centred on local down, \(-\pi/2\);
- a hand pendulum may use another centre so the simple isolated-pendulum composition is possible.

The driver is deliberately kinematic. It does not integrate gravity, mass, length, drag, forcing, or energy.

Primary files:

- `src/engine/types.ts`
- `src/engine/drivers.ts`
- `src/engine/sequence.ts`
- `src/authoring/compile.ts`
- `docs/PHASE_SEMANTICS.md`

## 2.2 Authoring semantics

**Implemented.** Authoring exposes amplitude, cycles per unit, and swing phase.

Swing phase is not the head’s spatial angle. It identifies the oscillator state:

- \(0\): centre crossing toward increasing angle;
- \(\pi/2\): one dead point;
- \(\pi\): centre crossing in the opposite direction;
- \(3\pi/2\): the other dead point.

For a head pendulum centred on down:

\[
\theta_{\text{start}}
=
-\frac{\pi}{2}
+
A\sin s.
\]

This explains the current UI confusion: start angle and swing phase are conceptually distinct, but the head start angle is constrained by amplitude and oscillator phase. In a future authoring pass, the head’s spatial start could be displayed as a derived value instead of appearing to be an independent control.

## 2.3 Pendulum presets

**Implemented in the lab and saved-pattern integration.**

- ordinary pendulum;
- extended pendulum;
- simple isolated pendulum;
- same-phase pair;
- quarter-offset pair;
- mirrored/antiphase pair;
- extendulum.

These are compositions, not new engine laws.

The simple isolated pendulum has a fixed tether midpoint. If the tether length is \(L\), the fixed isolation centre is \(C\), and \(u(\theta)\) is a unit direction:

\[
H=C-\frac{L}{2}u(\theta),
\qquad
P=C+\frac{L}{2}u(\theta).
\]

Therefore:

\[
\frac{P+H}{2}=C,
\qquad
P-H=L\,u(\theta).
\]

A general point-isolation pendulum is different because it requires the head to remain fixed while the hand moves around an arbitrary world point. Independent node drivers cannot guarantee that coupled invariant.

## 2.4 Circle-versus-pendulum calibration

**Implemented as a lab experiment.**

The experiment compares:

- one uniform circle per unit;
- one complete pendulum oscillation per unit;
- a gravity curve;
- the built-in sine curve;
- a piecewise constant-angular-speed comparison curve.

At \(90^\circ\) amplitude, a full pendulum oscillation has total absolute angular travel \(2\pi\), equal to one complete circle. Their average absolute angular speeds therefore match when both complete in one unit. Their instantaneous speeds do not: the pendulum stops at each apex and moves faster than the circle at the bottom.

## 2.5 Rastaxel motif

**Implemented.**

The current motif is two units long:

- unit 0–1: one complete pendulum oscillation;
- unit 1–2: one complete circle.

The motif is represented as eight explicit quarter-unit engine segments. Integer right-track offsets rotate those eight slices. The lab intentionally shows the raw speed discontinuity at the pendulum-to-circle handoff.

Direction is resolved per hand:

| Hand | Inwards | Outwards |
|---|---:|---:|
| Left | \(-1\), clockwise | \(+1\), counter-clockwise |
| Right | \(+1\), counter-clockwise | \(-1\), clockwise |

The anatomical label and mathematical sign are not the same thing. “Both inward” produces opposite mathematical signs.

Each hand also has an independent circle driver with radius, start phase, and signed circles per unit. Zero is static. The right-track offset shifts the hand motion along with the poi motif.

## 2.6 Minimum-effort taut circle

**Experimental and currently uncommitted.**

The current work adds:

- a fixed-pivot vertical circle;
- constant-speed, limiting ballistic, and safety-margin modes;
- speed, tension, and power plots;
- a lab runtime driver;
- focused tests;
- an article draft.

The physical derivation is sound under its assumptions, but the UI naming and nondimensional units need clarification before this becomes publication material. Section 8 gives the exact corrections.

---

# 3. The conceptual model: phase first, names second

## 3.1 A move is a map from phase to state

Represent a periodic move \(i\) by a monotonically advancing phase:

\[
\psi_i(t)=\omega_i t+\phi_i
\pmod{2\pi}.
\]

The visible or physical state is a move-specific map:

\[
x_i(t)=F_i(\psi_i(t)).
\]

The phase is the clock. \(F_i\) determines what that clock looks like in space.

For a uniform circle:

\[
F_{\text{circle}}(\psi)
=
\begin{bmatrix}
\cos\psi\\
\sin\psi
\end{bmatrix}.
\]

For a simple angular pendulum centred at \(c\):

\[
F_{\text{pendulum}}(\psi)
=
c+A\sin\psi.
\]

The pendulum map is not one-to-one. Two oscillator phases can give the same spatial angle while having opposite velocity.

## 3.2 Timing is relative phase

If two moves share the same phase rate:

\[
\Delta\psi
=
\psi_R-\psi_L
\pmod{2\pi}
\]

is constant. This is the simplest mathematical timing relationship.

The familiar four quarter offsets are:

\[
0,\quad \frac{\pi}{2},\quad \pi,\quad \frac{3\pi}{2}.
\]

These values exist before any labels such as same, split, right-leading, or left-leading are applied.

If the rates differ:

\[
\Delta\psi(t)
=
\Delta\psi_0
+
(\omega_R-\omega_L)t.
\]

The pattern no longer has one fixed timing. It traces a **timing orbit** through a sequence of alignments. This is the correct model for many hybrids and polyrhythms.

## 3.3 Timing is always relative to an observable

Performers do not normally perceive an abstract phase angle. They perceive events:

- bottom passages;
- apexes;
- reversals;
- hand cardinals;
- flower tips;
- crossings;
- stalls;
- musical beats.

Let \(E_i\) be the chosen event set within move \(i\)’s phase cycle. A named timing is a relationship between two event trains, not necessarily between two spatial angles.

This is the central correction to the current article:

> “Same” and “split” are not universal phase categories. They are event-alignment names inherited from circular downbeats.

## 3.4 A single move still has timing

The statement “timing only exists with two hands” captures an important intuition but is too narrow.

A single move has:

- intrinsic phase and period;
- timing relative to music;
- timing relative to body motion;
- timing relative to a transition or landmark.

What requires two moves is **inter-move timing**. The more general statement is:

> Phase belongs to a cycle. Timing belongs to a relationship between cycles or between a cycle and an external clock.

---

# 4. The pendulum double-cover result

This is the most important new mathematical insight.

## 4.1 One oscillator cycle, two downbeats

For a pendulum:

\[
\theta(\psi)=c+A\sin\psi.
\]

It crosses its centre when:

\[
\sin\psi=0,
\]

so:

\[
\psi=0,\pi
\pmod{2\pi}.
\]

If the centre is local down, these are the two down passages. Therefore there are two downbeat events per oscillator cycle.

The downbeat clock can be represented by:

\[
\beta=2\psi
\pmod{2\pi}.
\]

This map identifies:

\[
\psi \sim \psi+\pi.
\]

In mathematical language, the observable downbeat clock is a quotient of the full oscillator state. Informally, it is a two-to-one projection: two different pendulum states map to the same downbeat phase.

## 4.2 Why quarter oscillator phase feels split

For two pendulums with oscillator offset \(\Delta\psi\), the downbeat-phase offset is:

\[
\Delta\beta
=
2\Delta\psi
\pmod{2\pi}.
\]

Therefore:

| Oscillator offset \(\Delta\psi\) | Downbeat offset \(\Delta\beta\) | Full-state relationship |
|---:|---:|---|
| \(0\) | \(0\) | same position, same velocity |
| \(\pi/2\) | \(\pi\) | alternating downbeats; one centre, one apex at quarter landmarks |
| \(\pi\) | \(0\) | downbeats together; mirrored positions and opposite velocity |
| \(3\pi/2\) | \(\pi\) | alternating downbeats with the other lead |

The four oscillator offsets collapse to two downbeat-timing classes:

- coincident downbeats;
- alternating downbeats.

But the four offsets remain distinct when full position and velocity state are retained.

This is the precise reason “split-time pendulum” is ambiguous:

- if split means half an oscillator cycle, the downbeats coincide;
- if split means alternating downbeats, the oscillator offset is a quarter cycle;
- if split means one object at top while the other is at bottom, a normal lower-half pendulum cannot realize it.

## 4.3 Direction lives inside pendulum phase

Pendulum angular velocity is:

\[
\dot{\theta}
=
A\omega\cos\psi.
\]

The sign changes at:

\[
\psi=\frac{\pi}{2},\frac{3\pi}{2},
\]

which are the dead points.

At a half-cycle offset:

\[
\theta_R-c
=
A\sin(\psi+\pi)
=
-A\sin\psi
\]

and:

\[
\dot{\theta}_R
=
-\dot{\theta}_L.
\]

So the poi can cross down together while travelling in opposite directions.

At a quarter-cycle offset:

\[
\dot{\theta}_L\dot{\theta}_R
\propto
\cos\psi\cos\left(\psi+\frac{\pi}{2}\right)
=
-\frac12\sin 2\psi.
\]

The sign alternates. The pair moves through same-direction and opposite-direction intervals, separated by dead-point events.

This is why pendulums do not fit one static box in the familiar timing/direction matrix.

## 4.4 Phase space, not position alone

Two pendulum states can occupy the same spatial angle while moving in opposite directions. Spatial position therefore does not identify state.

The minimal physical state is:

\[
(\theta,\dot{\theta}),
\]

or equivalently the oscillator phase \(\psi\) for a fixed orbit.

This is not an implementation detail. It is the conceptual turn of the article:

> Pendulums reveal that timing lives in phase space. A snapshot of where the poi is cannot tell us where the motion is going.

---

# 5. Circles, persistent direction, and the correct invariant

For a uniform circle with direction sign \(\sigma_i\in\{-1,+1\}\):

\[
\theta_i(t)=b+\sigma_i p_i(t),
\qquad
\dot p_i=\omega>0.
\]

Here \(b\) is a chosen reference such as bottom and \(p_i\) is **oriented progress phase**. Both progress phases increase even when the poi traverse the circle in opposite spatial directions.

The timing offset is then:

\[
\Delta p=p_R-p_L.
\]

This cleanly separates:

- progress around the cycle;
- spatial direction;
- the label applied to the resulting positions.

If raw spatial angles are used instead, the invariant depends on direction:

\[
I
=
\theta_R-\kappa\theta_L,
\qquad
\kappa=\sigma_R\sigma_L.
\]

- same directions: \(\kappa=+1\), so angle difference is invariant;
- opposite directions: \(\kappa=-1\), so angle sum is invariant.

This explains why “same time opposites” and “split time opposites” can appear arbitrary when described as ordinary phase differences. They use a different invariant because the trajectories have opposite orientation.

Editorial consequence:

> The article should present direction as the orientation of the phase map, not as a second unrelated toggle bolted onto timing.

For circles, timing and direction can be independently selected. For pendulums, instantaneous direction is generated by the oscillator phase itself.

---

# 6. Quantization, shared grids, hybrids, and Rastaxel

## 6.1 Quantization is a lens, not the motion

A continuous cycle can be sampled at \(N\) landmarks:

\[
\psi_k=\frac{2\pi k}{N},
\qquad
k=0,\ldots,N-1.
\]

Quarter timing uses \(N=4\). This is useful because:

- the shifts close under addition modulo four;
- quarter turns land on cardinal axes;
- sine and cosine become \(0,\pm1\);
- the same grid aligns with many four-cardinal flower and stall landmarks.

The grid does not create the timing. It makes a selected family of offsets easy to see and name.

## 6.2 Shared grid for rational hybrids

Suppose move \(i\) completes \(n_i\) local cycles during a shared macroperiod, and each local cycle has \(q_i\) chosen landmarks. It contributes:

\[
M_i=n_i q_i
\]

landmark intervals per macroperiod.

A common uniform grid is:

\[
N=\operatorname{lcm}(M_1,M_2,\ldots).
\]

Example:

- extension: one rotation with four quarter-turn landmarks, \(M=4\);
- triquetra head path: two rotations with four landmarks per rotation, \(M=8\);
- shared grid: \(\operatorname{lcm}(4,8)=8\).

The extension occupies every second grid point while the triquetra head can visit every point.

This is the rigorous version of the recent “one has four pieces and the other has eight” intuition.

## 6.3 Raw offsets versus visibly distinct offsets

An \(N\)-slot grid permits \(N\) raw cyclic shifts. It does not follow that all \(N\) shifts are visibly or musically distinct.

Let \(H\) be the set of shifts that leave the selected observable unchanged. \(H\) is the observable’s stabilizer. The number of distinct observable states is:

\[
\frac{N}{|H|}.
\]

For a pendulum on a four-slot oscillator grid:

- full phase-space state has no non-trivial stabilizer, so all four offsets matter;
- downbeat events repeat after two slots, so the downbeat observable has a two-element stabilizer and only two timing classes.

This symmetry rule generalizes the pendulum double-cover result.

## 6.4 Why Rastaxel has eight useful offsets

The current Rastaxel lab uses:

- macroperiod \(T=2\) units;
- grid interval \(1/4\) unit;
- \(N=8\) authored slots.

The clean justification is therefore:

\[
N=\frac{T}{1/4}=8.
\]

Saying “the poi travels \(720^\circ\), therefore there are eight timings” is suggestive but incomplete. Total angular travel alone does not determine the time grid.

At \(90^\circ\) amplitude:

- the pendulum’s total absolute angular travel over one oscillation is \(2\pi\);
- the circle contributes another \(2\pi\);
- total absolute travel is \(4\pi=720^\circ\).

That happens to align with eight quarter-turn-equivalent legs, but the implemented offsets are quarter **time** steps. Under a nonlinear speed profile, equal time intervals are not generally equal arc-length intervals.

All eight Rastaxel offsets can remain meaningful because shifting by four slots swaps the pendulum and circle halves of the motif. The motion-law identity and speed profile break the half-cycle symmetry that a pure pendulum has.

## 6.5 Hybrids are timing trajectories

When two tracks have different rates, a label such as “same” or “split” is only locally true. The relative phase evolves:

\[
\Delta\psi(t)
=
\Delta\psi_0
+
\Delta\omega\,t.
\]

The useful object is the sequence of landmark alignments over the macroperiod.

This suggests a new visualization and data structure:

```text
timing orbit = {
  macroperiod,
  track cycles,
  landmark sets,
  relative-phase path,
  alignment events
}
```

This is better than forcing an entire triquetra-versus-extension or pendulum hybrid into one static timing label.

---

# 7. Exact gravity-pendulum calibration

The gravity curve in `circlePendulumExperiment.ts` is more principled than a cosmetic easing curve. It numerically integrates the exact nonlinear pendulum after normalizing the period to one unit.

## 7.1 Physical pendulum

For a simple pendulum of length \(L\), amplitude \(A\), and gravity \(g\):

\[
\ddot\theta+\frac{g}{L}\sin\theta=0.
\]

Let:

\[
k=\sin\frac{A}{2}.
\]

The exact period is:

\[
T=4\sqrt{\frac{L}{g}}K(k),
\]

where \(K\) is the complete elliptic integral of the first kind.

The bottom angular speed follows from energy conservation:

\[
\dot\theta_{\text{bottom}}
=
2\sqrt{\frac{g}{L}}\sin\frac{A}{2}.
\]

If the full oscillation is normalized to one time unit, multiply physical angular speed by \(T\):

\[
\dot\theta_{\text{bottom,norm}}
=
8K(k)\sin\frac{A}{2}.
\]

Relative to a uniform circle completing once per unit, whose angular speed is \(2\pi\):

\[
R(A)
=
\frac{4K(k)\sin(A/2)}{\pi}.
\]

At \(A=\pi/2\):

\[
k=\frac{\sqrt2}{2},
\qquad
K(k)\approx1.854074677,
\]

so:

\[
R\left(\frac{\pi}{2}\right)
\approx
1.669253683.
\]

This exactly explains the roughly \(1.67\times\) bottom-speed value in the lab.

It is not a universal gravity constant. It depends on:

- pendulum amplitude;
- normalizing the full oscillation to one unit;
- comparing against one uniform circle per unit.

## 7.2 Average speed versus peak speed

A pendulum of amplitude \(A\) travels total absolute angle:

\[
4A
\]

per full oscillation.

When its period is normalized to one unit, its average absolute angular speed is \(4A\). Relative to a one-turn circle:

\[
\frac{\overline{|\dot\theta|}_{\text{pend}}}
{|\dot\theta|_{\text{circle}}}
=
\frac{2A}{\pi}.
\]

At \(A=\pi/2\), the average ratio is exactly 1, even though the bottom-speed ratio is about 1.669.

This distinction should appear explicitly in the article:

> Equal cycle duration and equal total angular travel imply equal average absolute speed, not equal instantaneous speed.

---

# 8. The fixed-pivot taut vertical circle

## 8.1 Assumptions

The current model assumes:

- point mass \(m\);
- fixed pivot/hand;
- fixed tether length \(r\);
- gravity \(g\) in the motion plane;
- no drag;
- no string elasticity;
- tension can pull but cannot push;
- angle \(\theta\) measured from bottom.

This is a baseline, not a complete performer model.

## 8.2 Tension constraint

Radial force balance gives:

\[
T
=
m\left(
\frac{v^2}{r}
+
g\cos\theta
\right).
\]

The tether stays taut only if:

\[
T\ge0.
\]

At the top, \(\theta=\pi\), so:

\[
T_{\text{top}}
=
m\left(
\frac{v_{\text{top}}^2}{r}
-
g
\right).
\]

Therefore:

\[
v_{\text{top}}^2\ge gr.
\]

The exact boundary has zero top tension and is practically fragile.

## 8.3 Limiting ballistic loop

Choose the boundary:

\[
v_{\text{top}}^2=gr.
\]

Energy conservation gives:

\[
v(\theta)^2
=
gr\left(3+2\cos\theta\right).
\]

Important speeds:

\[
v_{\text{top}}=\sqrt{gr},
\]

\[
v_{\text{side}}=\sqrt{3gr},
\]

\[
v_{\text{bottom}}=\sqrt{5gr}.
\]

Therefore:

\[
\frac{v_{\text{bottom}}}{v_{\text{top}}}
=
\sqrt5
\approx2.236.
\]

Substituting the speed profile into the tension equation produces a simpler exact result:

\[
T(\theta)
=
3mg(1+\cos\theta).
\]

So:

- top tension: \(0\);
- side tension: \(3mg\);
- bottom tension: \(6mg\).

## 8.4 Safety margin

Let:

\[
v_{\text{top}}^2=(1+\varepsilon)gr.
\]

Then:

\[
v(\theta)^2
=
gr\left(3+\varepsilon+2\cos\theta\right)
\]

and:

\[
T(\theta)
=
mg\left(3+\varepsilon+3\cos\theta\right).
\]

In particular:

\[
T_{\text{top}}=\varepsilon mg.
\]

This gives the safety slider a direct interpretation: \(\varepsilon\) is top tension measured in units of body force \(mg\).

## 8.5 Minimum constant speed

For a constant speed \(v_0\):

\[
T(\theta)
=
m\left(
\frac{v_0^2}{r}
+
g\cos\theta
\right).
\]

Define a Froude-like number:

\[
\mathrm{Fr}
=
\frac{v_0^2}{gr}.
\]

The constant-speed loop is taut only when:

\[
\mathrm{Fr}\ge1.
\]

This is a different optimization problem from the ballistic loop.

## 8.6 Constant speed requires signed energy exchange

The tangential component of gravity is:

\[
F_{g,t}=-mg\sin\theta.
\]

To keep \(v=v_0\) constant, the performer/model must apply:

\[
F_{\text{assist}}=mg\sin\theta
\]

in the positive traversal convention.

The assist power is:

\[
P_{\text{assist}}
=
mgv_0\sin\theta.
\]

Net work over a full cycle is zero, but that hides the real control requirement:

- climbing from bottom to top requires \(+2mgr\);
- descending from top to bottom requires absorbing \(-2mgr\);
- total absolute energy exchange is \(4mgr\) per cycle.

This gives a sharper article sentence:

> A perfect constant-speed circle is not energetically free just because its net work is zero. The hand must add and remove the same gravitational potential energy every cycle.

If the performer can add energy but cannot absorb it, a constant-speed circle is impossible under this fixed-pivot model.

## 8.7 “Minimum effort” needs a better name

The limiting ballistic loop requires no tangential work after its initial energy is established, but:

- it begins with bottom kinetic energy \(5mgr/2\);
- the tether force can be large;
- human muscle effort is not the same as mechanical tangential work;
- real hand motion changes the model.

Recommended technical name:

> **minimum-energy taut ballistic loop**

Recommended public label:

> **gravity-led taut circle**

“Minimum effort” can remain conversational copy only if the assumptions are stated.

## 8.8 Exact loop duration

For the limiting ballistic loop:

\[
dt
=
\sqrt{\frac{r}{g}}
\frac{d\theta}{\sqrt{3+2\cos\theta}}.
\]

Therefore:

\[
T_{\text{loop}}
=
\sqrt{\frac{r}{g}}
\int_0^{2\pi}
\frac{d\theta}{\sqrt{3+2\cos\theta}}.
\]

This evaluates to:

\[
T_{\text{loop}}
=
\frac{4}{\sqrt5}
K\left(\frac{2}{\sqrt5}\right)
\sqrt{\frac{r}{g}}
\approx
4.03781164\sqrt{\frac{r}{g}}.
\]

For comparison, a constant-speed threshold circle with \(v=\sqrt{gr}\) has:

\[
T_{\text{constant}}
=
2\pi\sqrt{\frac{r}{g}}
\approx
6.28318531\sqrt{\frac{r}{g}}.
\]

The ballistic loop is faster on average because its bottom speed is much greater.

## 8.9 Current code’s nondimensional units

The current `tautCircleMath.ts` is internally a nondimensional model.

Let:

\[
\omega_{\text{ref}}=2\pi f_{\text{ref}}
\]

and define:

\[
\Gamma
=
\frac{g}{r\omega_{\text{ref}}^2}
=
\frac{1}{\mathrm{Fr}_{\text{ref}}}.
\]

The code’s `gravity` control behaves like \(\Gamma\), not like physical \(g\). The minimum-effort speed scale is:

\[
\frac{\omega(\theta)}{\omega_{\text{ref}}}
=
\sqrt{
\Gamma(3+\varepsilon+2\cos\theta)
}.
\]

This explains several current behaviors:

- `gravity = 1` is the tautness threshold for a constant circle at the reference angular speed;
- radius changes geometry and linear speed but does not change normalized duration;
- `circleRate` is a reference-frequency scale, not the actual completed cycles per unit in gravity-led modes;
- at the default limiting profile, `circleRate = 1` and `gravity = 1`, the cycle duration is approximately \(0.642637682\) units, so the actual completion rate is approximately \(1.55609\) cycles per unit.

The code is coherent if the controls are understood this way, but the UI labels currently imply physical gravity and a literal circle completion rate.

Recommended fix before publication:

- rename `gravity` to `gravity ratio`, `inverse Froude`, or \(\Gamma\);
- rename `circle rate` to `reference frequency` or `speed scale`;
- or switch to physical inputs \(g,r\) and derive \(\Gamma\);
- state explicitly that radius independence is a nondimensional choice;
- replace copy saying the gravity-led mode “adds energy when needed” with “conserves mechanical energy after initialization.”

---

# 9. Moving-hand physics: the next real experiment

The fixed-pivot model cannot answer the full performer question because a real spinner moves the pivot.

Let poi position be:

\[
P(t)=H(t)+r\,e_r(\theta(t)),
\]

where \(H(t)\) is the hand position.

Hand acceleration appears as forcing in the relative tangential equation. In vector form, the hand’s component along the instantaneous tangent changes the angular acceleration. Hand motion along the tether also changes the work done through tension.

The next model should therefore not use one vague “energy input” scalar. It should author or measure a hand path:

```text
hand model = {
  position H(t),
  velocity dH/dt,
  acceleration d²H/dt²
}
```

Then derive:

- poi relative angle;
- tension;
- hand-to-poi power transfer;
- whether the tether stays taut;
- positive work, negative work, and peak force;
- world-head velocity at candidate stalls.

This also clarifies the user’s stall intuition. Moving the hand toward the poi at the side of the circle is primarily a radial pivot motion, not simply moving “with the tangent.” It can unload the tether, change the effective centre, and allow the poi to continue into a stall-like trajectory. A fixed-pivot speed curve cannot represent that.

The meaningful optimization choices include:

- minimize total positive mechanical work;
- minimize total absolute work;
- minimize peak hand force;
- minimize peak power;
- minimize speed subject to tautness;
- minimize deviation from a target visual rhythm.

These objectives will not generally produce the same hand motion.

---

# 10. Dead points as transition portals

A pendulum dead point has:

\[
\dot\theta_{\text{relative}}=0.
\]

That makes it stall-like, but it does not automatically make every plane change legal.

Two additional conditions matter.

## 10.1 Shared-axis geometry

A hard plane break is position-continuous only if the poi lies on the intersection of the old and new planes.

For a wall/wheel to floor break, a full-width lower pendulum reaches the horizontal shared axis at its left or right dead point. A smaller-amplitude pendulum may stop away from that intersection and cannot jump directly to the floor plane without:

- a positional discontinuity;
- a bent plane;
- or a transport interval.

## 10.2 World velocity

Relative tether velocity being zero does not imply world-head velocity is zero.

In an extendulum, the hand may still be moving when the tether reaches an apex. A true stall-like plane change needs:

- zero world-head velocity; or
- a remaining velocity compatible with the shared plane axis.

This points toward a future analytic velocity contract for built-in drivers:

```ts
evalDriverPose(...)
evalDriverVelocity(...)
```

For a two-node rig, the world-head velocity is the sum of hand and relative head contributions.

This would support:

- validated dead-point boundaries;
- stall detection;
- velocity-continuous motion-law joins;
- legal plane-break checks;
- better graphs without finite-difference ambiguity.

Runtime drivers would still report velocity as unknown unless they explicitly implement a richer lab contract.

---

# 11. Article strategy

## Option A: “Split time is a social construct”

Strengths:

- memorable;
- provocative;
- invites readers to reconsider familiar terminology.

Risks:

- sounds like the measurable phase offset is being denied;
- can read as dismissive of community vocabulary;
- requires immediate qualification;
- may distract from the stronger pendulum result.

Use only as a hook or subheading.

## Option B: “Timing is a relationship, not a property”

Strengths:

- mathematically accurate;
- works for circles, pendulums, hybrids, music, and body timing;
- naturally introduces relative phase and event clocks;
- supports later articles.

Risk:

- less provocative.

**Recommended main thesis.**

## Option C: “Pendulums break the timing/direction grid”

Strengths:

- concrete;
- visually demonstrable;
- gives the article a strong conceptual turn.

Risks:

- narrower;
- technically the grid is not broken if it is upgraded to phase-space state.

Use as the pendulum section title and visual climax.

## Recommended public structure

1. Start with familiar same/split circles.
2. Show continuous phase offset before naming quarter offsets.
3. State that direction reverses the phase map but does not create a new clock.
4. Introduce a pendulum with the same four oscillator offsets.
5. Reveal that a pendulum has two downbeats per oscillator cycle.
6. Show the four offsets collapsing into two downbeat classes.
7. Add the direction ribbon to show why the four states remain physically different.
8. Move to Rastaxel and hybrids: eight-slot macrocycles and changing timing.
9. End with the broader thesis: vocabulary is a useful overlay on phase relationships, not the engine of motion.

## Recommended article title

**Timing Is a Relationship**

Subtitle:

**What pendulums reveal about same time, split time, direction, and phase**

Possible promotional line:

**Split time is a convention. The offset is real.**

---

# 12. Visualization plan

## 12.1 Figure 1: circle timing and wave

Keep the existing orbit-plus-height-wave concept, but fix the caption and copy.

Show:

- same;
- right \(+\frac14\);
- split;
- left \(+\frac14\);
- same/opposite direction.

Key lesson:

> Reversing circle direction changes the route but, when anchored consistently, can leave the height trace unchanged because cosine is even.

## 12.2 Figure 2: pendulum phase-space clock

This should be the new central visualization.

Components:

- lower pendulum arc;
- oscillator phase wheel;
- position trace;
- velocity/direction ribbon;
- downbeat-event markers.

Controls:

- \(0\);
- right \(+\frac14\);
- half-cycle;
- left \(+\frac14\).

Dynamic captions:

- \(0\): downbeats together; position and travel match;
- \(+\frac14\): downbeats alternate; one is at a dead point when the other crosses down;
- \(+\frac12\): downbeats together; travel is opposite;
- \(+\frac34\): alternating with the other lead.

The upper half of a comparison circle can be muted to show that a normal pendulum does not have a top passage.

## 12.3 Figure 3: the quotient clock

Use two concentric rings:

- outer ring: four oscillator landmarks;
- inner ring: two downbeat states.

Connect:

```text
oscillator 0  -> downbeat 0
oscillator 1  -> alternating midpoint
oscillator 2  -> downbeat 0 again, opposite travel
oscillator 3  -> alternating midpoint, other lead
```

This makes \(\beta=2\psi\) visible without requiring group-theory language.

## 12.4 Figure 4: shared timing lattice

Horizontal lanes over one macroperiod:

- circle: 4 landmarks;
- pendulum full state: 4 oscillator landmarks but 2 downbeat classes;
- Rastaxel: 8 motif slots;
- extension versus triquetra: 4 versus 8 effective slots.

The reader should be able to see:

- which grid is authored;
- which events repeat;
- which offsets are equivalent under the chosen observable.

## 12.5 Figure 5: gravity-led circle

Show three synchronized plots against angle:

- speed;
- tension;
- signed assist power.

Include exact callouts:

- top: \(v^2=gr\), \(T=0\);
- side: \(v^2=3gr\), \(T=3mg\);
- bottom: \(v^2=5gr\), \(T=6mg\).

Use “gravity-led taut circle,” not “minimum effort,” in the plot legend.

## 12.6 Figure 6: Rastaxel offset wheel

Eight positions around a macrocycle:

```text
P0 P1 P2 P3 C0 C1 C2 C3
```

where \(P\) is a pendulum quarter and \(C\) is a circle quarter.

Rotating the right-hand ring shows offsets 0–7. Colour should encode motion law as well as position, because equal positions can have different speed and future evolution.

---

# 13. Claims to avoid

Do not publish these without qualification:

- “Timing only exists with two hands.”
  Better: timing is relational; two hands create inter-hand timing.

- “Direction is irrelevant to timing.”
  Better: relative phase can be defined independently of circle direction, but direction is required to reconstruct motion, and pendulum direction is phase-dependent.

- “Split-time pendulums do not exist.”
  Better: circle-style top-versus-bottom split does not transfer literally; alternating pendulum downbeats occur at quarter oscillator phase.

- “A Rastaxel has eight timings because it travels \(720^\circ\).”
  Better: the current motif has eight authored quarter-time offsets; its total absolute angular travel is also \(720^\circ\) at the \(90^\circ\) calibration.

- “The gravity circle adds energy only when needed.”
  The current limiting gravity-led model conserves energy after initialization. Constant speed requires both adding and absorbing energy.

- “Minimum effort.”
  This is only minimum tangential work after initialization in a fixed-pivot idealization.

- “The \(1.67\times\) and \(\sqrt5\) speed ratios are related constants.”
  They come from different paths and normalizations.

- “A pendulum dead point is automatically a legal plane break.”
  Position on the plane intersection and compatible world velocity are also required.

---

# 14. Recommended next work

## Priority 1: rewrite the timing article around event phase

Validation:

- every use of same/split states the observable being aligned;
- circle and pendulum cycles use distinct terminology;
- direction claims agree with phase-space behavior;
- the current placeholder caption and typos are removed;
- public claims are linked to community sources and clearly distinguished from new analysis.

## Priority 2: build the pendulum timing figure

Required invariants:

- one shared clock drives arc, graph, event markers, and direction ribbon;
- four oscillator offsets are exact;
- downbeat events repeat twice per oscillator cycle;
- half-cycle state shows simultaneous down crossings with opposite travel;
- quarter-cycle state alternates same/opposite instantaneous direction.

## Priority 3: clarify the taut-circle units and language

Choose one:

- A. Keep the nondimensional model and expose \(\Gamma\)/Froude semantics.
- B. Use physical \(g,r\), derive time scale, and make playback a separate display control.
- C. Offer both, with an explicit “dimensionless / physical” switch.

Recommendation: A for the current lab, because it matches the engine’s abstract units and keeps the model small. Add B only when testing against measured poi and hand trajectories.

## Priority 4: add analytic velocity for built-in drivers

Start with:

- circle;
- pendulum;
- point-to-point where defined.

Use it for lab diagnostics first. Do not silently change engine boundary acceptance until a narrow velocity-continuity contract is designed.

## Priority 5: moving-pivot experiment

Begin with one authored hand ellipse or cardinal hand path and compute:

- head trajectory;
- tension;
- hand power;
- positive/negative work;
- stall entry speed.

Do not start with an optimizer. First make the forcing and invariants inspectable.

## Priority 6: source-grounded public knowledge record

Treat timing and direction as the first vertical slice of the proposed Poi Atlas:

- preserve definitions and disagreements;
- index exact posts and videos;
- store alternative names;
- cite transitions and demonstrations;
- keep human/community provenance;
- let AI synthesize from the index rather than replacing it.

---

# 15. AI handoff: current truth and open questions

## Non-negotiable repository boundaries

- Engine behavior must remain deterministic for identical prepared inputs and times.
- The built-in pendulum remains kinematic unless a new engine decision is made.
- Gravity, nonlinear calibration, and taut-circle physics remain lab-owned.
- Runtime drivers are unsafe callbacks and are not persisted.
- Named moves and theory should compile into minimal engine primitives rather than leak into engine semantics.
- No silent fixups.
- Source and docs must change together for behavior changes.

## Current unknowns

- Does the community consistently use “split-time pendulums,” and if so, does it mean alternating downbeats, opposite apexes, or something else?
- Is “Rastaxel” the correct spelling and historical attribution? The source code uses `Rastaxel`; the user has also pronounced/spelled it variably.
- What exact hand and head trajectory defines the canonical Rastaxel pendulum outside the current normalized lab motif?
- Which observable should lead public notation: poi-head downbeats, hand cardinals, oscillator phase, or a selectable set?
- Should quarter timing be named by leading hand, signed phase, or landmark order in opposite-direction cases?
- How closely does a real performer’s circle speed follow the limiting ballistic curve?
- Which human-effort metric is actually useful: work, absolute work, peak tension, peak power, or perceived exertion?
- Can a compact built-in velocity contract cover plane-break validation without expanding the engine into a solver?

## Tests that would falsify the current theory

- A paired pendulum recording where quarter oscillator phase does not alternate down crossings.
- A claimed half-cycle “split pendulum” whose event definition is neither position nor downbeat recurrence.
- A Rastaxel reference whose macroperiod or motion-law order differs from pendulum-cycle then circle.
- Motion capture showing that normal slow circles are better explained by active hand translation than any fixed-pivot gravity-led profile.
- Community terminology using “beat” in a way that makes the article’s selected clock misleading.

## Minimal source-reading order for another AI

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PHASE_SEMANTICS.md`
4. `research/decisions.md` entries dated 2026-07-22 and 2026-07-23
5. `src/engine/types.ts`
6. `src/engine/drivers.ts`
7. `src/engine/sequence.ts`
8. `src/lab/experiments/pendulum/pendulumPresets.ts`
9. `src/lab/experiments/pendulum/circlePendulumExperiment.ts`
10. `src/lab/experiments/pendulum/rastaxelPendulumExperiment.ts`
11. `src/lab/experiments/pendulum/tautCircleMath.ts`
12. `src/lab/experiments/qt-stall-graph/quarter-timing-direction.md`
13. relevant tests under `test/engine`, `test/authoring`, and `test/lab`

## Relevant session-store tasks reviewed

- `019f89fa-3982-7d23-8b5c-339397910970` — Pendulum Timing
- `019f8aa3-1dae-7b32-bd0b-7c774b28487a` — Rastaxel Pends
- `019f9005-f7bb-7c82-b6c6-9202732717d6` — Circles and gravity
- `019f8f7b-6b3f-7af2-81bf-753afd80abe5` — Pendulum Authoring
- `019f667e-56b5-7792-850d-9fb53c53d56a` — Stall Graph Improvements
- `019f898d-f543-7823-84cc-437725c2cd51` — Poi Knowledge Engine
- `6a60a74d-dc20-83ed-83e5-0a37ba95fe70` — Poi Knowledge Preservation
- `6a60a6c1-57cc-83eb-a656-92392d394c7f` — Poi Knowledge Extraction

---

# 16. Public and technical source notes

Community sources are evidence of vocabulary and historical practice, not immutable laws.

1. Home of Poi, “Poi terminology.” Defines same/split using circular position, describes a pendulum as two stall-like reversals, and discusses isolation and point isolation.
   https://www.homeofpoi.com/en/lessons/teach/POI/Poi-terminology/Poi-terminology

2. Home of Poi forum, “Poi Theory of Everything — An ongoing collaboration.” Explicitly discusses 0°, 90°, and 180° pendulum phase relationships and distinguishes same/split downbeat timing.
   https://www.homeofpoi.com/us/community/forums/topics/886966/Poi-Theory-of-Everything-An-ongoing-collaboration

3. DrexFactor, “A Beginners’ guide to Poi (QFT) Notation.” Represents a pendulum as an eight-step down-only path and later adds movement direction because position samples alone cannot distinguish motion.
   https://www.drexfactor.com/weirdscience/2011/05/18/beginners_guide_poi_qft_notation

4. DrexFactor, “Basic Poi Dancing Tutorial: Pendulums and 1.5s.” Describes pendulums as motion that does not complete a circle and reverses at the height of the arc.
   https://drexfactor.com/weirdscience?device=mobile&page=32

5. DrexFactor, Tech Poi Blog #253, “quarter-time from triquetra vs pendulum.” Demonstrates quarter-time transitions at intermediate hybrid positions.
   https://drexfactor.com/category/tags/triquetra

6. Physics LibreTexts, “The Simple Plane Pendulum — Exact Solution.” Gives the exact amplitude-dependent period in terms of the complete elliptic integral.
   https://phys.libretexts.org/Courses/Prince_Georges_Community_College/General_Physics_I%3A_Classical_Mechanics/66%3A_Appendices/66.19%3A_The_Simple_Plane_Pendulum-_Exact_Solution

---

# 17. Compact formula sheet

Kinematic engine pendulum:

\[
\theta(t)=\theta_0+A[\sin(s+2\pi f t)-\sin s].
\]
Head centre constraint:

\[
\theta_0=-\pi/2+A\sin s.
\]

Relative timing:

\[
\Delta\psi=\psi_R-\psi_L.
\]

Pendulum position and velocity:

\[
\theta=c+A\sin\psi,
\qquad
\dot\theta=A\omega\cos\psi.
\]

Pendulum downbeat phase:

\[
\beta=2\psi\pmod{2\pi}.
\]

Pendulum pair downbeat offset:

\[
\Delta\beta=2\Delta\psi\pmod{2\pi}.
\]

Shared rational landmark grid:

\[
M_i=n_iq_i,
\qquad
N=\operatorname{lcm}(M_i).
\]

Distinct observable offset classes:

\[
N_{\text{distinct}}=\frac{N}{|H|}.
\]

Exact physical pendulum period:

\[
T=4\sqrt{L/g}\,K(\sin(A/2)).
\]

Period-normalized pendulum bottom speed relative to a one-turn circle:

\[
R(A)=\frac{4K(\sin(A/2))\sin(A/2)}{\pi}.
\]

At \(A=\pi/2\):

\[
R\approx1.669253683.
\]

Vertical-loop tension:

\[
T=m(v^2/r+g\cos\theta).
\]

Limiting top condition:

\[
v_{\text{top}}^2=gr.
\]

Limiting ballistic loop:

\[
v^2=gr(3+2\cos\theta).
\]

Limiting ballistic tension:

\[
T=3mg(1+\cos\theta).
\]

Safety-margin loop:

\[
v^2=gr(3+\varepsilon+2\cos\theta),
\]

\[
T=mg(3+\varepsilon+3\cos\theta).
\]

Constant-speed Froude number:

\[
\mathrm{Fr}=v_0^2/(gr)\ge1.
\]

Constant-speed assist power:

\[
P_{\text{assist}}=mgv_0\sin\theta.
\]

Limiting ballistic loop period:

\[
T_{\text{loop}}
=
\frac{4}{\sqrt5}
K(2/\sqrt5)
\sqrt{r/g}
\approx
4.03781164\sqrt{r/g}.
\]

Current lab nondimensional gravity ratio:

\[
\Gamma=\frac{g}{r\omega_{\text{ref}}^2}
=
\frac{1}{\mathrm{Fr}_{\text{ref}}}.
\]

Current lab gravity-led angular-speed scale:

\[
\frac{\omega(\theta)}{\omega_{\text{ref}}}
=
\sqrt{\Gamma(3+\varepsilon+2\cos\theta)}.
\]
