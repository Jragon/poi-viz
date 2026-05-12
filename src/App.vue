<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const labMenu = ref<HTMLDetailsElement | null>(null);

const isLabRoute = computed(() => route.path.startsWith("/lab/"));

const labLinks = [
  {
    label: "Quarter Time",
    to: "/lab/quarter-time-3d"
  },
  {
    label: "Archer Weaves",
    to: "/lab/archer-weaves"
  },
  {
    label: "Body Tracing",
    to: "/lab/body-tracing"
  },
  {
    label: "Body Tracing Planes",
    to: "/lab/body-tracing/planes"
  },
  {
    label: "Poi Beat Graph",
    to: "/lab/poi-beat-graph"
  },
  {
    label: "Reel Explorer",
    to: "/lab/reel-explorer"
  },
  {
    label: "Wrap Explorer",
    to: "/lab/wrap-explorer"
  }
];

function closeLabMenu() {
  if (labMenu.value) {
    labMenu.value.open = false;
  }
}

watch(
  () => route.path,
  () => {
    closeLabMenu();
  }
);
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_35%),linear-gradient(180deg,rgba(15,23,42,1),rgba(2,6,23,1))] text-slate-100"
  >
    <nav class="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
      <div class="mx-auto flex w-full max-w-360 items-center justify-between gap-4 px-6 py-4">
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
          <details ref="labMenu" class="group relative">
            <summary
              class="list-none rounded-xl px-4 py-2 text-slate-300 transition marker:content-none hover:bg-slate-800 hover:text-white"
              :class="isLabRoute ? 'bg-sky-400 text-slate-950 hover:bg-sky-300' : ''"
            >
              <span class="flex items-center gap-2">
                <span>Lab</span>
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  class="h-3.5 w-3.5 transition group-open:rotate-180"
                >
                  <path
                    d="M5.25 7.5 10 12.25 14.75 7.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                  />
                </svg>
              </span>
            </summary>

            <div
              class="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-52 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/98 p-1.5 shadow-2xl shadow-slate-950/40"
            >
              <RouterLink
                v-for="link in labLinks"
                :key="link.to"
                :to="link.to"
                class="block rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                active-class="bg-sky-400 text-slate-950 hover:bg-sky-300"
                @click="closeLabMenu"
              >
                {{ link.label }}
              </RouterLink>
            </div>
          </details>
        </div>
      </div>
    </nav>

    <RouterView />
  </div>
</template>
