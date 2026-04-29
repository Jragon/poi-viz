<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))] text-slate-100"
  >
    <nav class="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
      <div class="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 px-6 py-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-500">poi-vis</p>
          <p class="text-sm text-slate-300">
            The messy, over complicated, hard to use, poi visualiser
          </p>
        </div>

        <div class="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-1 text-sm">
          <RouterLink
            to="/"
            class="rounded-xl px-4 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            active-class="bg-sky-400 text-slate-950 hover:bg-sky-300"
          >
            Visualizer
          </RouterLink>
          <RouterLink
            to="/authoring"
            class="rounded-xl px-4 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            active-class="bg-sky-400 text-slate-950 hover:bg-sky-300"
          >
            Authoring
          </RouterLink>
        </div>
      </div>
    </nav>

    <RouterView />
  </div>
</template>
