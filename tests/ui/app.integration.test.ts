import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, nextTick, watchEffect } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App.vue";
import { TWO_PI } from "@/state/constants";
import { createDefaultState } from "@/state/defaults";
import { buildStateUrl, LOCAL_STORAGE_STATE_KEY, serializeState } from "@/state/persistence";
import type { AppState } from "@/types/state";
import { classifyVTG } from "@/vtg/classify";

interface ControlsStubProps {
  state: AppState;
}

interface PatternCanvasStubProps {
  tBeats: number;
}

interface WaveCanvasStubProps {
  tBeats: number;
}

let latestState: AppState | null = null;
let latestPatternBeat = 0;
let latestWaveBeat = 0;
let queuedRafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 1;

const ControlsStub = defineComponent({
  name: "Controls",
  props: {
    state: {
      type: Object as () => AppState,
      required: true
    }
  },
  emits: [
    "toggle-playback",
    "set-static-view",
    "set-scrub",
    "set-global-number",
    "set-global-boolean",
    "set-phase-reference",
    "set-hand-number",
    "apply-vtg",
    "save-user-preset",
    "load-user-preset",
    "delete-user-preset",
    "export-user-preset",
    "import-user-preset"
  ],
  setup(props: ControlsStubProps) {
    watchEffect(() => {
      latestState = props.state;
    });
  },
  template: `
    <div>
      <button data-testid="toggle-playback" type="button" @click="$emit('toggle-playback')">toggle</button>
      <button data-testid="static-on" type="button" @click="$emit('set-static-view', true)">static-on</button>
      <button data-testid="static-off" type="button" @click="$emit('set-static-view', false)">static-off</button>
      <button data-testid="scrub-1-25" type="button" @click="$emit('set-scrub', 1.25)">scrub</button>
      <button data-testid="set-phase-reference-up" type="button" @click="$emit('set-phase-reference', 'up')">set-phase-ref-up</button>
      <button
        data-testid="apply-vtg-air-water"
        type="button"
        @click="$emit('apply-vtg', { armElement: 'Air', poiElement: 'Water', phaseDeg: 90, poiCyclesPerArmCycle: -3 })"
      >
        apply-vtg
      </button>
      <button
        data-testid="apply-vtg-earth-earth"
        type="button"
        @click="$emit('apply-vtg', { armElement: 'Earth', poiElement: 'Earth', phaseDeg: 0, poiCyclesPerArmCycle: -3 })"
      >
        apply-vtg-earth-earth
      </button>
    </div>
  `
});

const PatternCanvasStub = defineComponent({
  name: "PatternCanvas",
  props: {
    tBeats: {
      type: Number,
      required: true
    }
  },
  setup(props: PatternCanvasStubProps) {
    watchEffect(() => {
      latestPatternBeat = props.tBeats;
    });
  },
  template: "<div />"
});

const WaveCanvasStub = defineComponent({
  name: "WaveCanvas",
  props: {
    tBeats: {
      type: Number,
      required: true
    }
  },
  setup(props: WaveCanvasStubProps) {
    watchEffect(() => {
      latestWaveBeat = props.tBeats;
    });
  },
  template: "<div />"
});

function setLocationHref(nextHref: string): void {
  const url = new URL(nextHref);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function mountApp(): VueWrapper {
  return mount(App, {
    global: {
      stubs: {
        Controls: ControlsStub,
        PatternCanvas: PatternCanvasStub,
        WaveCanvas: WaveCanvasStub
      }
    }
  });
}

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

function findCopyLinkButton(wrapper: VueWrapper): ReturnType<VueWrapper["find"]> {
  const button = wrapper.findAll("button").find((candidate) => candidate.text() === "Copy Link");
  if (!button) {
    throw new Error("Expected to find Copy Link button");
  }
  return button;
}

describe("App orchestration integration", () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    latestState = null;
    latestPatternBeat = 0;
    latestWaveBeat = 0;
    installMockRaf();
    window.localStorage.clear();
    setLocationHref("http://localhost/");
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    window.localStorage.clear();
    setLocationHref("http://localhost/");
    vi.unstubAllGlobals();
  });

  it("hydrates using URL state before localStorage and strips query state after mount", async () => {
    const urlState = createDefaultState();
    const storageState = createDefaultState();

    urlState.global.bpm = 30;
    storageState.global.bpm = 60;

    window.localStorage.setItem(LOCAL_STORAGE_STATE_KEY, serializeState(storageState));
    setLocationHref(buildStateUrl(urlState, "http://localhost/"));

    wrapper = mountApp();
    await nextTick();

    expect(latestState?.global.bpm).toBe(30);
    expect(new URL(window.location.href).searchParams.get("state")).toBeNull();
  });

  it("advances transport time only while playing and keeps both canvases synchronized", async () => {
    wrapper = mountApp();
    await nextTick();

    expect(latestState).not.toBeNull();
    if (!latestState) {
      return;
    }

    const startingBeat = latestState.global.t;

    runAnimationFrame(1000);
    await nextTick();

    runAnimationFrame(1100);
    await nextTick();

    const advancedBeat = latestState.global.t;
    expect(advancedBeat).toBeGreaterThan(startingBeat);
    expect(latestPatternBeat).toBeCloseTo(advancedBeat, 10);
    expect(latestWaveBeat).toBeCloseTo(advancedBeat, 10);

    await wrapper.get("[data-testid='toggle-playback']").trigger("click");
    await nextTick();

    runAnimationFrame(1200);
    await nextTick();

    expect(latestState.global.t).toBeCloseTo(advancedBeat, 10);
    expect(latestPatternBeat).toBeCloseTo(advancedBeat, 10);
    expect(latestWaveBeat).toBeCloseTo(advancedBeat, 10);
  });

  it("enforces transport semantics for scrub, static-view playback lock, and toggle resume", async () => {
    wrapper = mountApp();
    await nextTick();

    expect(latestState?.global.isPlaying).toBe(true);

    await wrapper.get("[data-testid='scrub-1-25']").trigger("click");
    await nextTick();
    expect(latestState?.global.isPlaying).toBe(false);
    expect(latestState?.global.t).toBeCloseTo(1.25, 10);

    await wrapper.get("[data-testid='static-on']").trigger("click");
    await nextTick();
    await wrapper.get("[data-testid='toggle-playback']").trigger("click");
    await nextTick();
    expect(latestState?.global.isPlaying).toBe(false);

    const staticBeat = latestState?.global.t ?? 0;
    runAnimationFrame(1300);
    await nextTick();
    expect(latestState?.global.t).toBeCloseTo(staticBeat, 10);

    await wrapper.get("[data-testid='static-off']").trigger("click");
    await nextTick();
    await wrapper.get("[data-testid='toggle-playback']").trigger("click");
    await nextTick();
    expect(latestState?.global.isPlaying).toBe(true);
  });

  it("applies VTG descriptors through the App event pipeline", async () => {
    wrapper = mountApp();
    await nextTick();

    await wrapper.get("[data-testid='apply-vtg-air-water']").trigger("click");
    await nextTick();

    expect(latestState).not.toBeNull();
    if (!latestState) {
      return;
    }

    expect(classifyVTG(latestState)).toEqual({
      armElement: "Air",
      poiElement: "Water",
      phaseDeg: 90
    });

    const rightHeadCyclesPerBeat = (latestState.hands.R.armSpeed + latestState.hands.R.poiSpeed) / TWO_PI;
    expect(rightHeadCyclesPerBeat).toBeCloseTo(-3, 10);
  });

  it("updates phase-reference metadata without mutating canonical arm phases", async () => {
    wrapper = mountApp();
    await nextTick();

    expect(latestState).not.toBeNull();
    if (!latestState) {
      return;
    }

    const initialLeftArmPhase = latestState.hands.L.armPhase;
    const initialRightArmPhase = latestState.hands.R.armPhase;

    await wrapper.get("[data-testid='set-phase-reference-up']").trigger("click");
    await nextTick();

    expect(latestState?.global.phaseReference).toBe("up");
    expect(latestState?.hands.L.armPhase).toBeCloseTo(initialLeftArmPhase, 10);
    expect(latestState?.hands.R.armPhase).toBeCloseTo(initialRightArmPhase, 10);
  });

  it("applies VTG descriptors independently of global phase-reference setting", async () => {
    wrapper = mountApp();
    await nextTick();

    await wrapper.get("[data-testid='apply-vtg-earth-earth']").trigger("click");
    await nextTick();

    expect(latestState).not.toBeNull();
    if (!latestState) {
      return;
    }

    const baselineLeftArmPhase = latestState.hands.L.armPhase;
    const baselineRightArmPhase = latestState.hands.R.armPhase;
    const baselineLeftPoiPhase = latestState.hands.L.poiPhase;
    const baselineRightPoiPhase = latestState.hands.R.poiPhase;

    await wrapper.get("[data-testid='set-phase-reference-up']").trigger("click");
    await nextTick();
    await wrapper.get("[data-testid='apply-vtg-earth-earth']").trigger("click");
    await nextTick();

    expect(latestState.hands.L.armPhase).toBeCloseTo(baselineLeftArmPhase, 10);
    expect(latestState.hands.R.armPhase).toBeCloseTo(baselineRightArmPhase, 10);
    expect(latestState.hands.L.poiPhase).toBeCloseTo(baselineLeftPoiPhase, 10);
    expect(latestState.hands.R.poiPhase).toBeCloseTo(baselineRightPoiPhase, 10);
  });

  it("generates share links without mutating the current editing URL", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    setLocationHref("http://localhost/?foo=bar");
    wrapper = mountApp();
    await nextTick();

    const locationBeforeCopy = window.location.href;

    await findCopyLinkButton(wrapper).trigger("click");
    await nextTick();
    await Promise.resolve();

    expect(window.location.href).toBe(locationBeforeCopy);
    expect(writeText).toHaveBeenCalledTimes(1);

    const sharedUrl = writeText.mock.calls[0]?.[0];
    expect(typeof sharedUrl).toBe("string");
    expect(new URL(sharedUrl).searchParams.get("state")).not.toBeNull();
    expect(new URL(sharedUrl).searchParams.get("foo")).toBe("bar");
  });
});
