import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import ControlsGlobalPanel from "@/components/controls/ControlsGlobalPanel.vue";
import ControlsHandPanel from "@/components/controls/ControlsHandPanel.vue";
import ControlsPresetLibraryPanel from "@/components/controls/ControlsPresetLibraryPanel.vue";
import ControlsTransportPanel from "@/components/controls/ControlsTransportPanel.vue";
import { createDefaultState } from "@/state/defaults";

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

function findButtonByText(wrapper: VueWrapper, buttonText: string) {
  const button = wrapper.findAll("button").find((candidate) => candidate.text().trim() === buttonText);
  if (!button) {
    throw new Error(`Expected button "${buttonText}"`);
  }

  return button;
}

describe("Controls panel emit contracts", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("transport panel emits playback, static-view, and scrub events", async () => {
    wrapper = mount(ControlsTransportPanel, {
      props: {
        isPlaying: true,
        isStaticView: false,
        loopedPlayheadBeats: 0,
        loopBeats: 4,
        scrubStep: 0.01
      }
    });

    await findButtonByText(wrapper, "Pause").trigger("click");
    await wrapper.find("input[type='checkbox']").setValue(true);
    await wrapper.find("input[type='range']").setValue("1.25");

    expect(wrapper.emitted("toggle-playback")).toEqual([[]]);
    expect(wrapper.emitted("set-static-view")).toEqual([[true]]);
    expect(wrapper.emitted("set-scrub")).toEqual([[1.25]]);
  });

  it("global panel commits numbers on blur and emits unit/reference toggles", async () => {
    const state = createDefaultState();

    wrapper = mount(ControlsGlobalPanel, {
      props: {
        global: state.global,
        phaseUnit: "degrees",
        speedUnit: "cycles",
        showAdvanced: false,
        draftResetVersion: 0
      }
    });

    const bpmInput = findNumberInputByLabel(wrapper, "BPM");
    await bpmInput.setValue("42");
    await bpmInput.trigger("blur");

    await findButtonByText(wrapper, "Radians").trigger("click");
    await findButtonByText(wrapper, "Up").trigger("click");
    await findButtonByText(wrapper, "Degrees / Beat").trigger("click");
    await wrapper.find("input[type='checkbox']").setValue(true);

    expect(wrapper.emitted("set-global-number")).toEqual([["bpm", 42]]);
    expect(wrapper.emitted("set-phase-unit")).toEqual([["radians"]]);
    expect(wrapper.emitted("set-phase-reference")).toEqual([["up"]]);
    expect(wrapper.emitted("set-speed-unit")).toEqual([["degrees"]]);
    expect(wrapper.emitted("set-show-advanced")).toEqual([[true]]);
  });

  it("hand panel commits base and poi-speed fields as set-hand-number events", async () => {
    const state = createDefaultState();

    wrapper = mount(ControlsHandPanel, {
      props: {
        handId: "L",
        hand: state.hands.L,
        phaseUnit: "degrees",
        speedUnit: "cycles",
        showAdvanced: true,
        draftResetVersion: 0
      }
    });

    const armSpeedInput = findNumberInputByLabel(wrapper, "Arm Speed (a)");
    await armSpeedInput.setValue("2");
    await armSpeedInput.trigger("blur");

    const absoluteHeadInput = findNumberInputByLabel(wrapper, "Absolute Head Speed (h)");
    await absoluteHeadInput.setValue("3");
    await absoluteHeadInput.trigger("blur");

    const emitted = wrapper.emitted("set-hand-number") ?? [];
    expect(emitted.some((event) => event[0] === "armSpeed")).toBe(true);
    expect(emitted.some((event) => event[0] === "poiSpeed")).toBe(true);
  });

  it("preset library panel emits save/load/delete/export/import events", async () => {
    wrapper = mount(ControlsPresetLibraryPanel, {
      props: {
        userPresets: [{ id: "abc", name: "Test Preset", savedAt: new Date().toISOString() }],
        presetLibraryStatus: "",
        speedUnit: "cycles",
        phaseUnit: "degrees"
      }
    });

    const nameInput = wrapper.find("input[type='text']");
    await nameInput.setValue("My Preset");

    await findButtonByText(wrapper, "Save Current").trigger("click");
    await findButtonByText(wrapper, "Load").trigger("click");
    await findButtonByText(wrapper, "Export").trigger("click");
    await findButtonByText(wrapper, "Delete").trigger("click");

    const fileInput = wrapper.find("input[type='file']");
    const file = new File(["{}"], "preset.json", { type: "application/json" });
    Object.defineProperty(fileInput.element, "files", {
      configurable: true,
      value: [file]
    });
    await fileInput.trigger("change");

    expect(wrapper.emitted("save-user-preset")).toEqual([["My Preset"]]);
    expect(wrapper.emitted("load-user-preset")).toEqual([["abc"]]);
    expect(wrapper.emitted("delete-user-preset")).toEqual([["abc"]]);
    expect(wrapper.emitted("export-user-preset")).toEqual([
      [{ presetId: "abc", speedUnit: "cycles", phaseUnit: "degrees" }]
    ]);
    expect(wrapper.emitted("import-user-preset")).toEqual([[file]]);
  });
});
