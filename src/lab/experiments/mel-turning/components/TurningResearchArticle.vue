<template>
  <article class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
    <header class="border-b border-ui-border-subtle px-4 py-3">
      <p class="text-[0.625rem] font-semibold uppercase tracking-[0.17em] text-ui-text-muted">
        Working research model
      </p>
      <h2 class="mt-1 text-base font-semibold text-slate-100">
        What the turning evidence says so far
      </h2>
      <p class="mt-1.5 max-w-4xl text-xs leading-5 text-ui-text-secondary">
        This explorer separates endpoint compatibility, model-generated routes, and physical
        evidence. The new route solver is a candidate generator for review, not a complete movement
        law.
      </p>
    </header>

    <div class="grid gap-px bg-ui-border-subtle md:grid-cols-2 xl:grid-cols-3">
      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Compatible endpoints only</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          Source and target keep the same TO, SO, TS, or SS timing. Same CW becomes same CCW;
          opposite inwards becomes opposite outwards. Target direction is derived, and only the two
          offsets that preserve timing remain available.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Observer and performer frames</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          A/B and visible poi rotation remain fixed for the observer. L/C/R, native versus
          non-native, and inward versus outward are performer-relative. Facing changes from 0° to
          180° while observer-fixed poi motion continues.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">A complete playback context</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          The visualizer shows one full source cycle, the selected bridge, then one full target
          cycle. Reset returns to the start; repeat replays this finite path. A single 180° turn
          does not yet claim to form a closed physical cycle.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Compact labels are not hand coordinates</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          C, L, and R are wall placements; Cb, Lb, and Rb are behind-body placements. Mel’s cyclic
          compiler resolves the actual hand anchor, so a reel’s symbolic C row can remain at its low
          outside position instead of pulling the hand to the torso.
        </p>
        <p class="mt-1.5 text-[0.6875rem] leading-5 text-ui-text-muted">
          C/Lb/Rb use the performer-front poi circle. L/R/Cb use the performer-back circle.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Preparation → turn → recovery</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          The experimental solver searches ordinary halfbeats before and after exactly one shared
          one-halfbeat body turn. It starts at any source phase and stops at first entry into the
          exact target cycle, returning shortest routes deterministically.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Circle extension is a hypothesis</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          Some verified routes prepare by staying on the same physical circle for one extra halfbeat
          while poi phase continues. The solver can generate that same-anchor extension, but marks
          it unresolved unless the complete route matches physical evidence.
        </p>
      </section>
    </div>

    <div class="grid gap-3 border-t border-ui-border-subtle p-4 lg:grid-cols-2">
      <section class="rounded-md border border-emerald-700/50 bg-emerald-950/20 px-3 py-2.5">
        <h3 class="text-xs font-semibold text-emerald-200">Known from current evidence</h3>
        <ul class="mt-1.5 grid gap-1 text-xs leading-5 text-ui-text-secondary">
          <li>• Both hands share one synchronized facing transition.</li>
          <li>• Poi speed, direction, and alternating up/down phase continue through the turn.</li>
          <li>• Some endpoints have several legal departure phases or complete routes.</li>
          <li>• At least one verified route needs preparation before its body-turn edge.</li>
          <li>• A hold keeps A/B; a cross changes A↔B through the appropriate outward gate.</li>
        </ul>
      </section>

      <section class="rounded-md border border-amber-700/50 bg-amber-950/20 px-3 py-2.5">
        <h3 class="text-xs font-semibold text-amber-200">Still unresolved or physical</h3>
        <ul class="mt-1.5 grid gap-1 text-xs leading-5 text-ui-text-secondary">
          <li>• A generated circle extension is not automatically a reusable physical rule.</li>
          <li>• Two individually legal hand actions do not prove joint two-arm execution.</li>
          <li>• Back-position holds and several direction/turn-side families lack evidence.</li>
          <li>• Collisions, balance, comfort, and preferred routes remain physical judgements.</li>
          <li>• Resolved endpoints do not yet prove a unique continuous hand path between them.</li>
        </ul>
      </section>
    </div>

    <footer class="border-t border-ui-border-subtle bg-ui-surface-raised px-4 py-3">
      <h3 class="text-xs font-semibold text-slate-200">The review loop</h3>
      <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
        The explorer now plays every materialized shortest solver route, including clearly marked
        unresolved hypotheses. The Pattern Verifier remains the evidence boundary: each review
        records possible, not possible, or inconclusive with freeform notes and optional notation
        edits. Exported reviews are normalized before they alter solver rules or evidence status.
      </p>
    </footer>
  </article>
</template>
