import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MEL_BODY_TRACING_DIRECTORY = resolve(process.cwd(), "src/lab/experiments/mel-body-tracing");
const MEL_TURNING_DIRECTORY = resolve(process.cwd(), "src/lab/experiments/mel-turning");
const ADAPTER_FILE = resolve(MEL_TURNING_DIRECTORY, "adapter/melBeatGraphAdapter.ts");

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("Mel turning dependency boundary", () => {
  it("does not make Mel body tracing depend on the turning extension", () => {
    for (const file of sourceFiles(MEL_BODY_TRACING_DIRECTORY)) {
      expect(readFileSync(file, "utf8"), file).not.toContain("mel-turning");
    }
  });

  it("allows Mel body-tracing imports only through the turning adapter", () => {
    const bypasses = sourceFiles(MEL_TURNING_DIRECTORY).filter(
      (file) => file !== ADAPTER_FILE && readFileSync(file, "utf8").includes("mel-body-tracing")
    );

    expect(bypasses).toEqual([]);
    expect(readFileSync(ADAPTER_FILE, "utf8")).toContain("mel-body-tracing/beat-graph");
  });
});
