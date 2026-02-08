<template>
  <details class="mt-4 rounded border border-cyan-900/60 bg-cyan-950/20 p-4" open>
    <summary class="cursor-pointer text-sm font-semibold text-cyan-200">How This Works and How To Use It</summary>
    <div class="mt-3">
      <p class="text-sm leading-6 text-zinc-200">
        This tool models each hand with two coupled rotations: arm rotation around center and poi rotation relative to
        the hand. The pattern viewport shows the physical result (hands, tethers, heads, and trails), while the wave
        inspector shows the sin/cos oscillator channels that generate that motion.
      </p>
      <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-300">
        <li>
          Use the VTG panel to choose arm/poi relationships and phase in discrete steps, then refine timing and
          geometry with the hand controls.
        </li>
        <li>
          Use Transport to play or pause motion and scrub to any beat in the loop. Scrubbing pauses playback so you can
          inspect exact positions.
        </li>
        <li>
          Set Loop Beats to choose how long one phrase is before it wraps. BPM changes real-time speed only; beat-space
          math stays deterministic.
        </li>
        <li>
          Edit absolute poi head speed <span class="font-mono">h</span> directly for poi-centric tuning. In advanced mode,
          you can also inspect and edit relative speed <span class="font-mono">r</span>.
        </li>
        <li>
          Inputs validate on blur so typing negative or partial numbers is not interrupted mid-edit. Keyboard arrows use
          whole-number steps.
        </li>
        <li>
          Toggle Trails to inspect path geometry over time and toggle Waves to focus on oscillator signals when tuning
          phase relationships.
        </li>
      </ol>
    </div>
  </details>
</template>
