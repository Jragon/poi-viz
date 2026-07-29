import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SELECT_FILE = resolve(process.cwd(), "src/components/FrameStableSelect.vue");
const NUMBER_INPUT_FILE = resolve(process.cwd(), "src/components/FrameStableNumberInput.vue");

describe("frame-stable controls", () => {
  it("owns the native select and its options below the animation-driven parent boundary", () => {
    const source = readFileSync(SELECT_FILE, "utf8");

    expect(source).toContain("defineOptions({ inheritAttrs: false })");
    expect(source).toContain('<select v-bind="$attrs" :value="modelValue"');
    expect(source).toContain('v-for="option in options"');
    expect(source).not.toContain("<slot");
  });

  it("keeps a local numeric draft and publishes valid values on input", () => {
    const source = readFileSync(NUMBER_INPUT_FILE, "utf8");

    expect(source).toContain("const draft = ref(String(props.modelValue))");
    expect(source).toContain("@input=\"onInput\"");
    expect(source).toContain('emit("update:modelValue", input.valueAsNumber)');
    expect(source).toContain('draft.value = String(props.modelValue)');
  });
});
