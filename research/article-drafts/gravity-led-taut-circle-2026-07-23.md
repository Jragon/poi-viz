# The gravity-led taut circle

## Working model

This experiment asks a narrow question: what is the least tangential energy a spinner must supply for a poi to complete a vertical wall-plane circle while keeping the string taut?

The model assumes a fixed hand, a fixed string length, an ideal point mass, and gravity acting in the plane of the circle. The string can pull the poi toward the hand, but it cannot push it away. This is a reference model for thinking, not yet a complete model of a spinner's arm.

## Tautness is the hard constraint

Let `r` be the string length, `g` gravity, `v` the poi speed, and `θ` the angle measured from the bottom of the circle. The radial force balance is:

```text
T = m (v² / r + g cos θ)
```

The string is taut only when `T >= 0`. The top of the circle is the limiting point. At the top, the minimum speed is:

```text
v_top² = g r
```

At exactly this boundary the tension is zero, so a practical spinner needs a small safety margin.

## Minimum constant speed and a gravity-led loop are different

A minimum constant-speed circle keeps the same speed everywhere. The hand must continuously exchange energy with the poi: gravity helps during one part of the circle and resists during another.

A gravity-led loop lets the poi accelerate and decelerate naturally. Once the poi has been given enough energy to meet the top-speed constraint, the ideal model does no further tangential work. Gravity supplies the changing speed profile. In technical terms this is the minimum-energy taut ballistic loop, not necessarily the motion requiring the least human effort.

Using energy conservation from the top of the circle gives:

```text
v(θ)² = g r (3 + 2 cos θ)
```

At the limiting case, the bottom speed is `sqrt(5 g r)` and the top speed is `sqrt(g r)`, so the bottom/top speed ratio is `sqrt(5)`, approximately `2.24`.

This ratio should not be confused with the approximately `1.65×` speed difference observed in the 90° pendulum calibration. That earlier value belongs to a different path and a different normalization; it is not a universal gravity constant.

## What the graphs should show

The speed graph compares a constant-speed circle with the gravity-led profile. The tension graph shows why the top matters: the limiting curve touches the zero-tension boundary there, while a safety margin lifts it above the boundary. A later power graph can show the signed work required to force a constant-speed circle.

The animation and the graphs use the same sampled model. The speed profile is defined against angle, then converted to time using `dt = r / v(θ) dθ`; it is not treated as a sine wave.

## Limits and next questions

This model does not yet include hand translation, energy absorption, string elasticity, stalls, or plane changes. Those behaviours should be added only after the fixed-pivot reference is understood.

The next useful question is how a real hand changes the reference profile. A hand can add or absorb energy through a moving tether. That can flatten the speed curve, but it also means human effort must eventually be defined in terms of a hand trajectory and not only a poi speed curve.

For now, this lab gives the project a durable baseline:

- the string-tension inequality is the physical constraint;
- the top of the circle determines the minimum viable speed;
- constant speed and minimum initial energy are distinct goals;
- gravity-led motion should be sampled as a time-warped angular path;
- the production pendulum driver remains a kinematic oscillator, while this physical model stays lab-owned.
