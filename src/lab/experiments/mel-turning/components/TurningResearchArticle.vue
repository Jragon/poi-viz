<template>
  <article class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
    <header class="border-b border-ui-border-subtle px-4 py-3">
      <p class="text-[0.625rem] font-semibold uppercase tracking-[0.17em] text-ui-text-muted">
        Working model
      </p>
      <h2 class="mt-1 text-base font-semibold text-slate-100">
        What the turning evidence says so far
      </h2>
      <p class="mt-1.5 max-w-4xl text-xs leading-5 text-ui-text-secondary">
        This is a partial, evidence-led model of a shared 180° body turn over Mel’s beat graph. It
        keeps structural rules, physical verification, and unresolved topology separate.
      </p>
    </header>

    <div class="grid gap-px bg-ui-border-subtle md:grid-cols-2 xl:grid-cols-3">
      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Observer and performer frames</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          A/B plane sides and poi rotation remain fixed for the observer. L/C/R, native versus
          non-native, and inward versus outward are performer-relative. They must not be treated as
          one coordinate system.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Facing and mirroring</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          Facing changes once, from 0° to 180°, on one shared halfbeat edge. A body-relative view
          keeps anatomical lanes fixed; an observer-relative view mirrors left and right lanes after
          the turn. Both views project the same trace.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Compact low-reel locations</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          C, L, and R are wall hand placements; Cb, Lb, and Rb are behind-body placements. The
          compact location does not specify a unique hand coordinate or continuous path.
        </p>
        <p class="mt-1.5 text-[0.6875rem] leading-5 text-ui-text-muted">
          C/Lb/Rb use the performer-front poi circle. L/R/Cb use the performer-back circle.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Plane side, hold, and cross</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          A/B is observer-fixed. A hold keeps the same plane side while facing changes; a cross
          changes A↔B. A legal crossing also needs the appropriate side gate. Known hold relations
          are specific to hand, source location, and turn direction.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Direction is preserved in world space</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          Poi timing, speed, and observer-fixed rotation continue through the turn. After a 180°
          facing change, the target’s performer-relative CW/CCW interpretation reverses. The poi
          does not pause or reset phase on the turn edge.
        </p>
      </section>

      <section class="bg-ui-surface px-4 py-3">
        <h3 class="text-xs font-semibold text-sky-200">Offset and timing are not identity</h3>
        <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
          Mel’s numeric offset rotates the right-hand cycle relative to the left. TS, SS, TO, and SO
          are derived timing summaries. Offsets 1 and 3 are both called “chasing,” but remain
          distinct exact phases and must not be collapsed.
        </p>
      </section>
    </div>

    <div class="grid gap-3 border-t border-ui-border-subtle p-4 lg:grid-cols-2">
      <section class="rounded-md border border-emerald-700/50 bg-emerald-950/20 px-3 py-2.5">
        <h3 class="text-xs font-semibold text-emerald-200">Known from current evidence</h3>
        <ul class="mt-1.5 grid gap-1 text-xs leading-5 text-ui-text-secondary">
          <li>• Both hands share one synchronized facing transition.</li>
          <li>• Consecutive rows preserve uninterrupted up/down poi phase.</li>
          <li>• Some low-reel hold and cross edges have been physically verified.</li>
          <li>• More than one discrete turn edge can be legal for the same endpoint cycles.</li>
        </ul>
      </section>

      <section class="rounded-md border border-amber-700/50 bg-amber-950/20 px-3 py-2.5">
        <h3 class="text-xs font-semibold text-amber-200">Still unresolved or physical</h3>
        <ul class="mt-1.5 grid gap-1 text-xs leading-5 text-ui-text-secondary">
          <li>• Missing back-position hold evidence is unresolved, not automatically illegal.</li>
          <li>• Two individually legal hand edges do not prove comfortable joint execution.</li>
          <li>
            • Collisions, arm openness, ergonomics, and preferred paths remain physical evidence.
          </li>
          <li>
            • The graph does not determine a unique anatomical hand path or torso timing window.
          </li>
        </ul>
      </section>
    </div>

    <footer class="border-t border-ui-border-subtle bg-ui-surface-raised px-4 py-3">
      <h3 class="text-xs font-semibold text-slate-200">Scope of the first explorer</h3>
      <p class="mt-1.5 text-xs leading-5 text-ui-text-secondary">
        The first interactive slice can compare exact source and target cycles and inspect one
        direct shared turn edge at a time. A later path-search view can add departure phase,
        setup/recovery rows, one shared turn, and first target-cycle entry. The endpoint cycles stay
        closed; the selected bridge between them is a finite path.
      </p>
    </footer>
  </article>
</template>
