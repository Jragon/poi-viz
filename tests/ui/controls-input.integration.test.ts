import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Controls from "@/components/Controls.vue";
import { createDefaultState } from "@/state/defaults";
import type { AppState } from "@/types/state";

interface MountControlsOptions {
  state?: AppState;
}

const VtgPanelStub = defineComponent({
  name: "VtgPanel",
  template: "<div data-testid='vtg-panel-stub' />"
});

function mountControls(options: MountControlsOptions = {}): VueWrapper {
  return mount(Controls, {
    props: {
      state: options.state ?? createDefaultState(),
      loopedPlayheadBeats: 0,
      scrubStep: 0.01,
      isStaticView: false,
      userPresets: [],
      presetLibraryStatus: ""
    },
    global: {
      stubs: {
        VtgPanel: VtgPanelStub
      }
    }
  });
}

function findNumberInputByLabel(wrapper: VueWrapper, labelText: string) {
  const labels = wrapper.findAll("label");
  const match = labels.find((label) => label.text().includes(labelText));
  if (!match) {
    throw new Error(`Expected number input label containing "${labelText}"`);
  }
  const input = match.find("input[type='number']");
  if (!input.exists()) {
    throw new Error(`Label "${labelText}" does not contain a number input`);
  }
  return input;
}

describe("Controls numeric commit integration", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("commits global numeric edits on blur only", async () => {
    wrapper = mountControls();

    const bpmInput = findNumberInputByLabel(wrapper, "BPM");
    await bpmInput.setValue("42");

    expect(wrapper.emitted("set-global-number")).toBeUndefined();

    await bpmInput.trigger("blur");

    expect(wrapper.emitted("set-global-number")).toEqual([["bpm", 42]]);
  });

  it("uses Enter to invoke blur commit flow for numeric inputs", async () => {
    wrapper = mountControls();

    const blurSpy = vi.spyOn(HTMLInputElement.prototype, "blur");
    const loopBeatsInput = findNumberInputByLabel(wrapper, "Loop Beats");
    await loopBeatsInput.setValue("6");
    await loopBeatsInput.trigger("keydown", { key: "Enter" });
    expect(blurSpy).toHaveBeenCalled();

    await loopBeatsInput.trigger("blur");

    const emitted = wrapper.emitted("set-global-number") ?? [];
    expect(emitted.some((args) => args[0] === "loopBeats" && args[1] === 6)).toBe(true);
  });
});
