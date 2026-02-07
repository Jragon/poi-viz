import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildAllPresetFixtures,
  buildFixtureManifest,
  getPresetFixtureFilename,
  type PresetFixtureFile
} from "../src/engine/fixtures";

async function main(): Promise<void> {
  const fixturesDirectory = resolve(process.cwd(), "fixtures");
  const manifestPath = resolve(fixturesDirectory, "manifest.json");
  const fixtures = buildAllPresetFixtures();
  const manifest = buildFixtureManifest(fixtures);

  await mkdir(fixturesDirectory, { recursive: true });
  await writeFixtureFiles(fixturesDirectory, fixtures);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function writeFixtureFiles(fixturesDirectory: string, fixtures: PresetFixtureFile[]): Promise<void> {
  const writes = fixtures.map(async (fixture) => {
    const fixturePath = resolve(fixturesDirectory, getPresetFixtureFilename(fixture.presetId));
    await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  });
  await Promise.all(writes);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
