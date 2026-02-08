import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultState } from "@/state/defaults";

const { renderPatternMock, createWaveLanesFromSamplesMock, renderWavesMock } = vi.hoisted(() => ({
  renderPatternMock: vi.fn(),
  createWaveLanesFromSamplesMock: vi.fn(() => []),
  renderWavesMock: vi.fn()
}));

vi.mock("@/render/patternRenderer", () => ({
  renderPattern: renderPatternMock
}));

vi.mock("@/render/waveRenderer", () => ({
  createWaveLanesFromSamples: createWaveLanesFromSamplesMock,
  renderWaves: renderWavesMock
}));

import PatternCanvas from "@/components/PatternCanvas.vue";
import WaveCanvas from "@/components/WaveCanvas.vue";

class ResizeObserverStub {
  observe(): void {
    // noop
  }

  disconnect(): void {
    // noop
  }
}

describe("Canvas timing ownership", () => {
  beforeEach(() => {
    renderPatternMock.mockClear();
    createWaveLanesFromSamplesMock.mockClear();
    renderWavesMock.mockClear();

    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("PatternCanvas redraws from prop/state invalidation without owning RAF", async () => {
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

    expect(renderPatternMock).toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    const callsBeforeUpdate = renderPatternMock.mock.calls.length;
    await wrapper.setProps({ tBeats: 0.5 });
    await nextTick();

    expect(renderPatternMock.mock.calls.length).toBeGreaterThan(callsBeforeUpdate);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("WaveCanvas redraws from prop/state invalidation without owning RAF", async () => {
    const state = createDefaultState();
    state.global.showWaves = true;

    const wrapper = mount(WaveCanvas, {
      props: {
        state,
        tBeats: 0,
        theme: "dark"
      }
    });

    await nextTick();

    expect(createWaveLanesFromSamplesMock).toHaveBeenCalled();
    expect(renderWavesMock).toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    const callsBeforeUpdate = renderWavesMock.mock.calls.length;
    await wrapper.setProps({ tBeats: 0.25 });
    await nextTick();

    expect(renderWavesMock.mock.calls.length).toBeGreaterThan(callsBeforeUpdate);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
