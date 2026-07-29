import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SELECT_FILE = resolve(process.cwd(), "src/components/FrameStableSelect.vue");
const NUMBER_INPUT_FILE = resolve(process.cwd(), "src/components/FrameStableNumberInput.vue");
const SRC_DIR = resolve(process.cwd(), "src");
const TIMING_ORBIT_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/timing-orbit/TimingOrbitLabPage.vue"
);

function collectVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectVueFiles(path);
    }
    return entry.isFile() && entry.name.endsWith(".vue") ? [path] : [];
  });
}

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

  it("routes every application select through the frame-stable component boundary", () => {
    const nativeSelectFiles = collectVueFiles(SRC_DIR)
      .filter((file) => readFileSync(file, "utf8").includes("<select"))
      .map((file) => relative(SRC_DIR, file));

    expect(nativeSelectFiles).toEqual(["components/FrameStableSelect.vue"]);
  });

  it("uses immediate frame-stable numeric fields for Timing Orbit parameters", () => {
    const source = readFileSync(TIMING_ORBIT_FILE, "utf8");

    expect(source.match(/<FrameStableNumberInput/g)).toHaveLength(3);
    expect(source).not.toMatch(/type="number"[\s\S]*?@change=/);
  });
});
