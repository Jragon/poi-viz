import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PRESET_CATALOG } from "../src/state/presets";

interface FixtureManifest {
  phase: number;
  note: string;
  generatedAtIso: string;
  presetIds: string[];
}

async function main(): Promise<void> {
  const fixturesDirectory = resolve(process.cwd(), "fixtures");
  const manifestPath = resolve(fixturesDirectory, "manifest.json");

  const manifest: FixtureManifest = {
    phase: 2,
    note: "Fixture position sampling will be added with the engine implementation in a later phase.",
    generatedAtIso: new Date().toISOString(),
    presetIds: PRESET_CATALOG.map((preset) => preset.id)
  };

  await mkdir(fixturesDirectory, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

