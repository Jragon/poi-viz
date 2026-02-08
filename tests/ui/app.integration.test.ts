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

let latestState: AppState | null = null;

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
    </div>
  `
});

const PatternCanvasStub = defineComponent({
  name: "PatternCanvas",
  template: "<div />"
});

const WaveCanvasStub = defineComponent({
  name: "WaveCanvas",
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

describe("App orchestration integration", () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    latestState = null;
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
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
});
