<script setup lang="ts">
import Controls from "@/components/Controls.vue";
import PatternCanvas from "@/components/PatternCanvas.vue";
import WaveCanvas from "@/components/WaveCanvas.vue";
import { useAppOrchestrator } from "@/composables/useAppOrchestrator";

const {
  state,
  loopedPlayheadBeats,
  scrubStep,
  copyLinkLabel,
  theme,
  isStaticView,
  presetLibraryStatus,
  userPresetSummaries,
  themeButtonLabel,
  handleTogglePlayback,
  handleSetStaticView,
  handleSetScrub,
  handleSetGlobalNumber,
  handleSetGlobalBoolean,
  handleSetPhaseReference,
  handleSetHandNumber,
  handleApplyVTG,
  handleSaveUserPreset,
  handleLoadUserPreset,
  handleDeleteUserPreset,
  handleExportUserPreset,
  handleImportUserPreset,
  handleToggleTheme,
  handleCopyLink
} = useAppOrchestrator();
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 text-zinc-100 md:p-6">
    <header class="rounded border border-zinc-800 bg-zinc-950/70 p-4">
      <div class="flex items-start justify-between gap-3">
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Poi Visuliser</h1>
        <div class="flex items-center gap-2">
          <button
            class="rounded border border-zinc-700 px-3 py-2 text-sm font-medium hover:border-zinc-500"
            type="button"
            @click="handleToggleTheme"
          >
            {{ themeButtonLabel }}
          </button>
          <button
            class="rounded border border-zinc-700 px-3 py-2 text-sm font-medium hover:border-zinc-500"
            type="button"
            @click="handleCopyLink"
          >
            {{ copyLinkLabel }}
          </button>
        </div>
      </div>
    </header>

    <section class="grid gap-4 lg:grid-cols-12">
      <article
        class="flex h-[360px] flex-col rounded border border-zinc-800 bg-zinc-950/70 p-2 sm:h-[480px]"
        :class="state.global.showWaves ? 'lg:col-span-7' : 'lg:col-span-12'"
      >
        <h2 class="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Pattern Viewport</h2>
        <div class="min-h-0 flex-1">
          <PatternCanvas :state="state" :t-beats="state.global.t" :is-static-view="isStaticView" :theme="theme" />
        </div>
      </article>

      <article
        v-if="state.global.showWaves"
        class="flex h-[360px] flex-col rounded border border-zinc-800 bg-zinc-950/70 p-2 sm:h-[480px] lg:col-span-5"
      >
        <h2 class="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Waveform Inspector</h2>
        <div class="min-h-0 flex-1">
          <WaveCanvas :state="state" :t-beats="state.global.t" :theme="theme" />
        </div>
      </article>

      <Controls
        :state="state"
        :looped-playhead-beats="loopedPlayheadBeats"
        :scrub-step="scrubStep"
        :is-static-view="isStaticView"
        :user-presets="userPresetSummaries"
        :preset-library-status="presetLibraryStatus"
        @toggle-playback="handleTogglePlayback"
        @set-static-view="handleSetStaticView"
        @set-scrub="handleSetScrub"
        @set-global-number="handleSetGlobalNumber"
        @set-global-boolean="handleSetGlobalBoolean"
        @set-phase-reference="handleSetPhaseReference"
        @set-hand-number="handleSetHandNumber"
        @apply-vtg="handleApplyVTG"
        @save-user-preset="handleSaveUserPreset"
        @load-user-preset="handleLoadUserPreset"
        @delete-user-preset="handleDeleteUserPreset"
        @export-user-preset="handleExportUserPreset"
        @import-user-preset="handleImportUserPreset"
      />
    </section>
  </main>
</template>
