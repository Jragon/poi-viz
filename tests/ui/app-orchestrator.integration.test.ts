import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppOrchestrator, type AppOrchestrator } from "@/composables/useAppOrchestrator";

let orchestrator: AppOrchestrator | null = null;

function setLocationHref(nextHref: string): void {
  const url = new URL(nextHref);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

const OrchestratorHarness = defineComponent({
  name: "OrchestratorHarness",
  setup() {
    orchestrator = useAppOrchestrator();
    return () => h("div");
  }
});

describe("useAppOrchestrator", () => {
  beforeEach(() => {
    orchestrator = null;
    window.localStorage.clear();
    setLocationHref("http://localhost/");
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    window.localStorage.clear();
    setLocationHref("http://localhost/");
    vi.unstubAllGlobals();
  });

  it("owns transport lifecycle through mount/unmount", async () => {
    const wrapper = mount(OrchestratorHarness);
    await nextTick();

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("enforces static-view playback lock in orchestrator handlers", async () => {
    const wrapper = mount(OrchestratorHarness);
    await nextTick();

    expect(orchestrator).not.toBeNull();
    if (!orchestrator) {
      wrapper.unmount();
      return;
    }

    expect(orchestrator.state.global.isPlaying).toBe(true);

    orchestrator.handleSetStaticView(true);
    expect(orchestrator.state.global.isPlaying).toBe(false);

    orchestrator.handleTogglePlayback();
    expect(orchestrator.state.global.isPlaying).toBe(false);

    orchestrator.handleSetStaticView(false);
    orchestrator.handleTogglePlayback();
    expect(orchestrator.state.global.isPlaying).toBe(true);

    wrapper.unmount();
  });

  it("round-trips save/load preset actions through orchestrator", async () => {
    const wrapper = mount(OrchestratorHarness);
    await nextTick();

    expect(orchestrator).not.toBeNull();
    if (!orchestrator) {
      wrapper.unmount();
      return;
    }

    orchestrator.state.global.bpm = 34;
    orchestrator.handleSaveUserPreset("Phase G Baseline");

    expect(orchestrator.userPresetSummaries.value).toHaveLength(1);
    const savedPresetId = orchestrator.userPresetSummaries.value[0]?.id;
    expect(savedPresetId).toBeTruthy();

    orchestrator.state.global.bpm = 70;
    orchestrator.handleLoadUserPreset(savedPresetId as string);

    expect(orchestrator.state.global.bpm).toBe(34);
    expect(orchestrator.presetLibraryStatus.value).toContain("Loaded:");

    wrapper.unmount();
  });
});
