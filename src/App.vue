<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { labLinks } from "@/lab/labLinks";

const route = useRoute();
const labMenu = ref<HTMLDetailsElement | null>(null);

const isLabRoute = computed(() => route.path.startsWith("/lab/"));

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
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_35%),linear-gradient(180deg,rgba(15,23,42,1),rgba(2,6,23,1))] text-ui-text"
  >
    <nav class="relative z-50 border-b border-ui-border bg-ui-page/95 backdrop-blur">
      <div
        class="mx-auto flex w-full max-w-360 flex-col items-stretch gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium uppercase tracking-[0.14em] text-ui-text">poi-vis</p>
          <p class="max-w-72 text-sm text-ui-text-secondary sm:max-w-none">
            The messy, over complicated, hard to use, poi visualiser
          </p>
        </div>

        <div
          class="flex w-full min-w-0 gap-1 rounded-2xl border border-ui-border bg-ui-surface p-1 text-sm sm:w-auto sm:gap-2"
        >
          <RouterLink
            to="/"
            class="min-w-0 flex-1 rounded-xl px-3 py-2 text-center text-ui-text-secondary transition hover:bg-ui-surface-raised hover:text-ui-text sm:flex-none sm:px-4"
            active-class="bg-sky-400 text-slate-950 hover:bg-sky-300"
          >
            Visualizer
          </RouterLink>
          <RouterLink
            to="/authoring"
            class="min-w-0 flex-1 rounded-xl px-3 py-2 text-center text-ui-text-secondary transition hover:bg-ui-surface-raised hover:text-ui-text sm:flex-none sm:px-4"
            active-class="bg-sky-400 text-slate-950 hover:bg-sky-300"
          >
            Authoring
          </RouterLink>
          <details ref="labMenu" class="group relative flex-1 sm:flex-none">
            <summary
              class="list-none rounded-xl px-3 py-2 text-ui-text-secondary transition marker:content-none hover:bg-ui-surface-raised hover:text-ui-text sm:px-4"
              :class="isLabRoute ? 'bg-sky-400 text-slate-950 hover:bg-sky-300' : ''"
            >
              <span class="flex items-center justify-center gap-2">
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
              class="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-52 overflow-hidden rounded-2xl border border-ui-border bg-ui-surface-raised p-1.5 shadow-2xl shadow-slate-950/40"
            >
              <RouterLink
                v-for="link in labLinks"
                :key="link.to"
                :to="link.to"
                class="block rounded-xl px-3 py-2 text-sm text-ui-text-secondary transition hover:bg-ui-surface hover:text-ui-text"
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
