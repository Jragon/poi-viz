<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { labLinks } from "@/lab/labLinks";

const route = useRoute();
const labMenu = ref<HTMLDetailsElement | null>(null);

const isLabRoute = computed(() => route.path.startsWith("/lab/"));

const navItemBaseClass =
  "min-w-0 flex-1 rounded-lg border px-3 py-2 text-center font-medium transition-colors sm:flex-none sm:px-4";
const navItemActiveClass =
  "border-sky-400/80 bg-ui-selected text-ui-selected-text shadow-sm shadow-sky-950/30 hover:border-sky-300 hover:bg-sky-900 hover:text-white";
const navItemInactiveClass =
  "border-transparent text-ui-text-secondary hover:border-ui-border hover:bg-ui-surface-raised hover:text-ui-text";

function navItemClasses(isActive: boolean) {
  return [navItemBaseClass, isActive ? navItemActiveClass : navItemInactiveClass];
}

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
  <div class="app-shell min-h-screen text-ui-text">
    <nav
      aria-label="Primary navigation"
      class="relative z-50 border-b border-ui-border bg-ui-page/95 shadow-lg shadow-slate-950/20 backdrop-blur"
    >
      <div
        class="mx-auto flex w-full max-w-360 flex-col items-stretch gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold uppercase tracking-[0.14em] text-sky-100">poi-vis</p>
          <p class="max-w-72 text-sm text-ui-text-secondary sm:max-w-none">
            Poi motion authoring and simulation
          </p>
        </div>

        <div
          class="flex w-full min-w-0 gap-1 rounded-xl border border-ui-border bg-ui-surface/80 p-1 text-sm shadow-inner shadow-slate-950/30 sm:w-auto"
        >
          <RouterLink to="/" :class="navItemClasses(route.path === '/')"> Visualizer </RouterLink>
          <RouterLink to="/authoring" :class="navItemClasses(route.path === '/authoring')">
            Authoring
          </RouterLink>
          <details ref="labMenu" class="group relative flex-1 sm:flex-none">
            <summary
              class="list-none cursor-pointer marker:content-none"
              :class="navItemClasses(isLabRoute)"
              aria-label="Open lab navigation"
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
                class="block rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                :class="
                  route.path === link.to
                    ? 'bg-ui-selected text-ui-selected-text hover:bg-sky-900 hover:text-white'
                    : 'text-ui-text-secondary hover:bg-ui-surface hover:text-ui-text'
                "
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
