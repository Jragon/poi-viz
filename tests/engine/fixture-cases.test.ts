import { describe, expect, it } from "vitest";
import { buildFixtureCaseSet, DEFAULT_FIXTURE_ID, parseFixtureCasesFile } from "@/engine/fixtureCases";
import { createDefaultState } from "@/state/defaults";

function createSerializedCases(cases: unknown[], schemaVersion = 1): string {
  return JSON.stringify({
    schemaVersion,
    cases
  });
}

describe("fixture case parsing", () => {
  it("parses valid full AppState cases", () => {
    const defaults = createDefaultState();
    const state = createDefaultState();
    state.global.bpm = 14;
    state.hands.L.armSpeed = 3.5;
    const parsed = parseFixtureCasesFile(
      createSerializedCases([
        {
          id: "slow-case",
          state
        }
      ]),
      defaults
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe("slow-case");
    expect(parsed[0]?.state.global.bpm).toBe(14);
    expect(parsed[0]?.state.hands.L.armSpeed).toBe(3.5);
  });

  it("rejects schema mismatch", () => {
    expect(() => parseFixtureCasesFile(createSerializedCases([], 99), createDefaultState())).toThrow("schema mismatch");
  });

  it("rejects duplicate ids", () => {
    const defaults = createDefaultState();
    const state = createDefaultState();
    expect(() =>
      parseFixtureCasesFile(
        createSerializedCases([
          { id: "dup-case", state },
          { id: "dup-case", state }
        ]),
        defaults
      )
    ).toThrow('Duplicate fixture case id "dup-case"');
  });

  it("rejects invalid or reserved ids", () => {
    const defaults = createDefaultState();
    const state = createDefaultState();
    expect(() => parseFixtureCasesFile(createSerializedCases([{ id: "BadId", state }]), defaults)).toThrow("kebab-case");
    expect(() => parseFixtureCasesFile(createSerializedCases([{ id: DEFAULT_FIXTURE_ID, state }]), defaults)).toThrow("reserved");
  });

  it("accepts partial state payloads and merges with defaults", () => {
    const defaults = createDefaultState();
    defaults.global.loopBeats = 9;
    defaults.hands.R.poiRadius = 33;
    const parsed = parseFixtureCasesFile(
      createSerializedCases([
        {
          id: "partial-state",
          state: {
            global: {
              phaseReference: "up",
              bpm: 22
            },
            hands: {
              L: {
                armSpeed: 2
              }
            }
          }
        }
      ]),
      defaults
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.state.global.phaseReference).toBe("up");
    expect(parsed[0]?.state.global.bpm).toBe(22);
    expect(parsed[0]?.state.global.loopBeats).toBe(9);
    expect(parsed[0]?.state.hands.L.armSpeed).toBe(2);
    expect(parsed[0]?.state.hands.R.poiRadius).toBe(33);
  });

  it("rejects payloads missing required phase-reference metadata", () => {
    const defaults = createDefaultState();

    expect(() =>
      parseFixtureCasesFile(
        createSerializedCases([
          {
            id: "missing-phase-reference",
            state: {
              global: {
                bpm: 10
              }
            }
          }
        ]),
        defaults
      )
    ).toThrow("invalid state payload");
  });
});

describe("fixture case set builder", () => {
  it("prepends default fixture case and clones state snapshots", () => {
    const defaultState = createDefaultState();
    const customState = createDefaultState();
    customState.global.bpm = 25;

    const cases = buildFixtureCaseSet(defaultState, [
      {
        id: "custom",
        state: customState
      }
    ]);

    expect(cases.map((entry) => entry.id)).toEqual([DEFAULT_FIXTURE_ID, "custom"]);
    expect(cases[1]?.state.global.bpm).toBe(25);

    customState.global.bpm = 999;
    defaultState.global.bpm = 888;
    expect(cases[0]?.state.global.bpm).not.toBe(888);
    expect(cases[1]?.state.global.bpm).toBe(25);
  });
});
