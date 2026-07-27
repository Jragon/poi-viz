<script setup lang="ts">
import LaunchEnergyExperiment from "./LaunchEnergyExperiment.vue";
import MathEquation from "./MathEquation.vue";
import MovingHandExperiment from "./MovingHandExperiment.vue";
</script>

<template>
  <main class="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-5 py-8 md:px-8 md:py-12">
    <header class="grid gap-3">
      <p class="text-xs font-medium uppercase tracking-[0.22em] text-amber-300">Gravity lab</p>
      <h1 class="text-3xl font-semibold text-slate-100 md:text-4xl">What does gravity make the poi do?</h1>
      <p class="max-w-4xl text-base leading-7 text-slate-400">
        This lab treats the string as a one-way constraint. It can pull the poi toward the hand,
        but it cannot push it away. That single fact turns a smooth-looking circle into a hybrid
        system with taut motion, slack flight, and catches.
      </p>
    </header>

    <section class="grid gap-4 rounded-xl border border-ui-border-subtle bg-ui-surface p-4 md:p-5">
      <div class="grid gap-2">
        <h2 class="text-xl font-semibold text-slate-100">The model</h2>
        <p class="max-w-4xl text-sm leading-6 text-slate-400">
          We begin with a fixed hand, a point-mass poi, a massless string, and no drag. This is an
          intentionally small model: it lets us see exactly when gravity can carry the motion and
          exactly when the string must let go.
        </p>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <div class="rounded-lg border border-ui-border-subtle bg-slate-950/60 p-4">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Taut string</p>
          <MathEquation tex="\mathbf P=\mathbf H+L\mathbf e_r" />
          <MathEquation tex="T=m\left(L\dot\theta^2+g\cos\theta\right)" />
          <p class="text-sm leading-6 text-slate-400">Tension must stay non-negative.</p>
        </div>
        <div class="rounded-lg border border-ui-border-subtle bg-slate-950/60 p-4">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Fixed-hand energy</p>
          <MathEquation tex="E=\frac12mL^2\dot\theta^2+mgL(1-\cos\theta)" />
          <MathEquation tex="v_{\mathrm{top}}^2\ge gL" />
          <p class="text-sm leading-6 text-slate-400">The top is the limiting point of a taut loop.</p>
        </div>
      </div>
    </section>

    <LaunchEnergyExperiment />

    <MovingHandExperiment />

    <section class="grid gap-3 rounded-xl border border-ui-border-subtle bg-ui-surface p-4 md:p-5">
      <h2 class="text-xl font-semibold text-slate-100">What these experiments establish</h2>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        Move the launch-energy slider across 1 and 2.5. The first threshold is the energy needed to
        reach horizontal. The second is the energy needed to arrive at the top with a taut string.
        Everything between those values is the interesting region: the poi gets high enough to look
        like a circle, but the string has to release because gravity cannot provide the required pull.
      </p>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        A constant-speed circle remains a target curve, not a claim about an available actuator. It
        needs signed energy exchange: gravity helps on one half and resists on the other. The moving
        hand experiment asks how much of that modulation a small pivot motion can provide. Its
        ellipse, circle, and line modes are scored over the first complete poi loop so phase can be
        compared as a timing relationship rather than judged only by eye.
      </p>
    </section>

    <section class="grid gap-3 rounded-xl border border-ui-border-subtle bg-ui-surface p-4 md:p-5">
      <h2 class="text-xl font-semibold text-slate-100">Timing calibration</h2>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        A physical pendulum and a circle can both be normalized to one authored cycle without
        having the same instantaneous speed. At 90° amplitude, the gravity pendulum reaches about
        1.67 times the uniform circle's bottom speed. That is a peak-speed comparison; the average
        absolute angular travel can still match.
      </p>
      <MathEquation tex="\frac{v_{\mathrm{pendulum,bottom}}}{v_{\mathrm{circle}}}\approx1.669" />
    </section>

    <section class="grid gap-3 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-slate-300 md:p-5">
      <h2 class="text-xl font-semibold text-amber-100">Later: measure real poi</h2>
      <p class="max-w-4xl">
        A useful validation rig would mark handles and poi heads with bright LEDs, add IMUs for
        angular velocity, and record high-frame-rate video. Optical tracking can reconstruct the
        hand path, tether direction, and speed profile; a later tension sensor can validate the
        force model. The simulation should be compared with measurements before adding string mass,
        drag, or a full 3D model.
      </p>
    </section>
  </main>
</template>
