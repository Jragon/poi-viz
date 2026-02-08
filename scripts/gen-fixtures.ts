import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildAllStateFixtures,
  buildFixtureManifest,
  getFixtureFilename,
  type StateFixtureFile
} from "../src/engine/fixtures";
import { buildFixtureCaseSet, parseFixtureCasesFile } from "../src/engine/fixtureCases";
import { createDefaultState } from "../src/state/defaults";

const MANIFEST_FILENAME = "manifest.json";
const CASES_FILENAME = "state-cases.json";
const CASES_SCHEMA_FILENAME = "state-cases.schema.json";

async function readManualFixtureCases() {
  const casesPath = resolve(process.cwd(), "fixtures", CASES_FILENAME);
  const serialized = await readFile(casesPath, "utf8");
  return parseFixtureCasesFile(serialized);
}

async function main(): Promise<void> {
  const fixturesDirectory = resolve(process.cwd(), "fixtures");
  const manifestPath = resolve(fixturesDirectory, MANIFEST_FILENAME);
  const defaultState = createDefaultState();
  const manualCases = await readManualFixtureCases();
  const fixtureCases = buildFixtureCaseSet(defaultState, manualCases);
  const fixtures = buildAllStateFixtures(fixtureCases);
  const manifest = buildFixtureManifest(fixtures);

  await mkdir(fixturesDirectory, { recursive: true });
  await writeFixtureFiles(fixturesDirectory, fixtures);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await removeStaleFixtureFiles(
    fixturesDirectory,
    new Set([CASES_FILENAME, CASES_SCHEMA_FILENAME, MANIFEST_FILENAME, ...fixtures.map((fixture) => getFixtureFilename(fixture.fixtureId))])
  );
}

async function writeFixtureFiles(fixturesDirectory: string, fixtures: StateFixtureFile[]): Promise<void> {
  const writes = fixtures.map(async (fixture) => {
    const fixturePath = resolve(fixturesDirectory, getFixtureFilename(fixture.fixtureId));
    await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  });
  await Promise.all(writes);
}

async function removeStaleFixtureFiles(fixturesDirectory: string, keepJsonFiles: Set<string>): Promise<void> {
  const entries = await readdir(fixturesDirectory, { withFileTypes: true });

  const removals = entries.map(async (entry) => {
    if (!entry.isFile()) {
      return;
    }
    if (!entry.name.endsWith(".json")) {
      return;
    }
    if (keepJsonFiles.has(entry.name)) {
      return;
    }
    await unlink(resolve(fixturesDirectory, entry.name));
  });

  await Promise.all(removals);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
