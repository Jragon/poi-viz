import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultState } from "@/state/defaults";

const { renderPatternMock, createWaveLanesFromSamplesMock, renderWavesMock } = vi.hoisted(() => ({
  renderPatternMock: vi.fn(),
  createWaveLanesFromSamplesMock: vi.fn(() => []),
  renderWavesMock: vi.fn()
}));

const { sampleLoopMock } = vi.hoisted(() => ({
  sampleLoopMock: vi.fn(() => [])
}));

vi.mock("@/render/patternRenderer", () => ({
  renderPattern: renderPatternMock
}));

vi.mock("@/engine/sampling", () => ({
  sampleLoop: sampleLoopMock
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
    sampleLoopMock.mockClear();

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

  it("PatternCanvas rotates rendered positions when phase-reference changes", async () => {
    const stateRight = createDefaultState();
    stateRight.global.phaseReference = "right";
    stateRight.global.showTrails = false;

    const wrapper = mount(PatternCanvas, {
      props: {
        state: stateRight,
        tBeats: 0,
        isStaticView: false,
        theme: "dark"
      }
    });

    await nextTick();

    const rightCall = renderPatternMock.mock.calls.at(-1);
    expect(rightCall).toBeTruthy();
    const rightInput = rightCall?.[3];
    expect(rightInput).toBeTruthy();
    if (!rightInput) {
      wrapper.unmount();
      return;
    }

    const stateUp = createDefaultState();
    stateUp.global.phaseReference = "up";
    stateUp.global.showTrails = false;

    await wrapper.setProps({ state: stateUp });
    await nextTick();

    const upCall = renderPatternMock.mock.calls.at(-1);
    expect(upCall).toBeTruthy();
    const upInput = upCall?.[3];
    expect(upInput).toBeTruthy();
    if (!upInput) {
      wrapper.unmount();
      return;
    }

    expect(upInput.positions.R.hand.x).toBeCloseTo(-rightInput.positions.R.hand.y, 10);
    expect(upInput.positions.R.hand.y).toBeCloseTo(rightInput.positions.R.hand.x, 10);
    expect(upInput.positions.R.head.x).toBeCloseTo(-rightInput.positions.R.head.y, 10);
    expect(upInput.positions.R.head.y).toBeCloseTo(rightInput.positions.R.head.x, 10);

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
    expect(sampleLoopMock).toHaveBeenCalledTimes(1);
    expect(renderWavesMock).toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    const callsBeforeUpdate = renderWavesMock.mock.calls.length;
    await wrapper.setProps({ tBeats: 0.25 });
    await nextTick();

    expect(renderWavesMock.mock.calls.length).toBeGreaterThan(callsBeforeUpdate);
    expect(sampleLoopMock).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
