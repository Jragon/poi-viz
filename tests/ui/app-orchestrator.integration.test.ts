import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppOrchestrator, type AppOrchestrator } from "@/composables/useAppOrchestrator";

let orchestrator: AppOrchestrator | null = null;
let queuedRafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 1;

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

function installMockRaf(): void {
  queuedRafCallbacks = new Map<number, FrameRequestCallback>();
  nextRafId = 1;

  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback): number => {
      const rafId = nextRafId;
      nextRafId += 1;
      queuedRafCallbacks.set(rafId, callback);
      return rafId;
    })
  );

  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((rafId: number): void => {
      queuedRafCallbacks.delete(rafId);
    })
  );
}

function runAnimationFrame(frameTimeMs: number): void {
  const callbacks = Array.from(queuedRafCallbacks.values());
  queuedRafCallbacks.clear();

  for (const callback of callbacks) {
    callback(frameTimeMs);
  }
}

describe("useAppOrchestrator", () => {
  beforeEach(() => {
    orchestrator = null;
    queuedRafCallbacks = new Map<number, FrameRequestCallback>();
    window.localStorage.clear();
    setLocationHref("http://localhost/");
    installMockRaf();
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

  it("does not mutate loaded preset snapshots from transport progression", async () => {
    const wrapper = mount(OrchestratorHarness);
    await nextTick();

    expect(orchestrator).not.toBeNull();
    if (!orchestrator) {
      wrapper.unmount();
      return;
    }

    orchestrator.state.global.t = 0;
    orchestrator.handleSaveUserPreset("Transport Snapshot");
    const savedPresetId = orchestrator.userPresetSummaries.value[0]?.id;
    expect(savedPresetId).toBeTruthy();
    if (!savedPresetId) {
      wrapper.unmount();
      return;
    }

    orchestrator.state.global.t = 2;
    orchestrator.handleLoadUserPreset(savedPresetId);
    expect(orchestrator.state.global.t).toBe(0);

    runAnimationFrame(1000);
    await nextTick();
    runAnimationFrame(1100);
    await nextTick();
    expect(orchestrator.state.global.t).toBeGreaterThan(0);

    orchestrator.handleLoadUserPreset(savedPresetId);
    expect(orchestrator.state.global.t).toBe(0);

    wrapper.unmount();
  });
});
