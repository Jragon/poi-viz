import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultState } from "@/state/defaults";
import type { AppState } from "@/types/state";

const {
  createTrailSamplerMock,
  advanceTrailSamplerMock,
  getTrailPointsMock,
  getPositionsMock,
  renderPatternMock
} = vi.hoisted(() => ({
  createTrailSamplerMock: vi.fn(() => ({ id: "sampler" })),
  advanceTrailSamplerMock: vi.fn((state) => state),
  getTrailPointsMock: vi.fn(() => ({ L: [], R: [] })),
  getPositionsMock: vi.fn(() => ({
    L: {
      hand: { x: 0, y: 0 },
      head: { x: 0, y: 0 },
      tether: { x: 0, y: 0 }
    },
    R: {
      hand: { x: 0, y: 0 },
      head: { x: 0, y: 0 },
      tether: { x: 0, y: 0 }
    }
  })),
  renderPatternMock: vi.fn()
}));

vi.mock("@/engine/engine", () => ({
  createTrailSampler: createTrailSamplerMock,
  advanceTrailSampler: advanceTrailSamplerMock,
  getTrailPoints: getTrailPointsMock,
  getPositions: getPositionsMock
}));

vi.mock("@/render/patternRenderer", () => ({
  renderPattern: renderPatternMock
}));

import PatternCanvas from "@/components/PatternCanvas.vue";

class ResizeObserverStub {
  observe(): void {
    // noop
  }

  disconnect(): void {
    // noop
  }
}

function cloneState(state: AppState): AppState {
  return {
    global: { ...state.global },
    hands: {
      L: { ...state.hands.L },
      R: { ...state.hands.R }
    }
  };
}

describe("PatternCanvas trail persistence", () => {
  beforeEach(() => {
    createTrailSamplerMock.mockClear();
    advanceTrailSamplerMock.mockClear();
    getTrailPointsMock.mockClear();
    getPositionsMock.mockClear();
    renderPatternMock.mockClear();

    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps live trails when pattern parameters change", async () => {
    const state = createDefaultState();

    const wrapper = mount(PatternCanvas, {
      props: {
        state,
        tBeats: 0,
        isStaticView: false,
        theme: "dark"
      }
    });

    await nextTick();
    expect(createTrailSamplerMock).toHaveBeenCalledTimes(1);

    const changedPattern = cloneState(state);
    changedPattern.hands.R.poiSpeed = changedPattern.hands.R.poiSpeed + Math.PI;

    await wrapper.setProps({
      state: changedPattern,
      tBeats: 0.1
    });
    await nextTick();

    expect(createTrailSamplerMock).toHaveBeenCalledTimes(1);
    expect(advanceTrailSamplerMock).toHaveBeenCalled();

    wrapper.unmount();
  });

  it("recreates live trail sampler when trail config changes", async () => {
    const state = createDefaultState();

    const wrapper = mount(PatternCanvas, {
      props: {
        state,
        tBeats: 0,
        isStaticView: false,
        theme: "dark"
      }
    });

    await nextTick();
    expect(createTrailSamplerMock).toHaveBeenCalledTimes(1);

    const changedTrailConfig = cloneState(state);
    changedTrailConfig.global.trailSampleHz = changedTrailConfig.global.trailSampleHz + 1;

    await wrapper.setProps({
      state: changedTrailConfig,
      tBeats: 0.1
    });
    await nextTick();

    expect(createTrailSamplerMock).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });
});
