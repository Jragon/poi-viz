import { describe, expect, it } from "vitest";

import {
  parseTurningReviewArtifact,
  serializeTurningReviewArtifact,
  type TurningReviewArtifact
} from "@/lab/experiments/mel-turning/review/turningReviewArtifact";
import {
  listTurningReviewWorkbenches,
  loadTurningReviewWorkbench,
  removeTurningReviewWorkbench,
  saveTurningReviewWorkbench,
  turningReviewStorageKey,
  type TurningReviewStorageLike
} from "@/lab/experiments/mel-turning/review/turningReviewStorage";

function artifactFixture(): TurningReviewArtifact {
  return {
    schemaVersion: 1,
    batch: {
      id: "review-test-001",
      generator: "test-generator",
      seed: 7,
      contentHash: "abc123",
      candidates: [
        {
          caseId: "case-01",
          routeId: "route-01",
          selectionReason: "test",
          source: {
            left: "low-native",
            right: "low-native",
            direction: { mode: "same", direction: "clockwise" },
            offset: 0
          },
          target: {
            left: "low-native",
            right: "low-native",
            direction: { mode: "same", direction: "counterclockwise" },
            offset: 0
          },
          turnDirection: "left",
          summary: {
            timing: "TS",
            sourceFamily: "mill",
            targetFamily: "mill",
            bridgeHalfbeats: 1,
            preparationHalfbeats: 0,
            recoveryHalfbeats: 0,
            shortestBridgeHalfbeats: 1,
            isShortest: true,
            modelStatus: "valid",
            evidenceStatus: "unreviewed",
            evidenceReferences: []
          },
          steps: [
            {
              step: 0,
              facing: 0,
              region: "source",
              left: {
                location: "C",
                planeSide: "a",
                phase: "up",
                handPointBody: { x: -0.5, y: -0.35 },
                handPointObserver: { x: -0.5, y: -0.35 }
              },
              right: {
                location: "C",
                planeSide: "a",
                phase: "up",
                handPointBody: { x: 0.5, y: -0.35 },
                handPointObserver: { x: 0.5, y: -0.35 }
              },
              outgoingEdge: {
                kind: "body-turn",
                leftAction: "cross",
                rightAction: "cross",
                modelStatus: "valid",
                provenance: ["fixture"]
              }
            },
            {
              step: 1,
              facing: 180,
              region: "target",
              left: {
                location: "C",
                planeSide: "b",
                phase: "down",
                handPointBody: { x: -0.5, y: -0.35 },
                handPointObserver: { x: 0.5, y: -0.35 }
              },
              right: {
                location: "C",
                planeSide: "b",
                phase: "down",
                handPointBody: { x: 0.5, y: -0.35 },
                handPointObserver: { x: -0.5, y: -0.35 }
              },
              outgoingEdge: null
            }
          ]
        }
      ]
    },
    reviews: {}
  };
}

class MemoryStorage implements TurningReviewStorageLike {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("turning review artifact", () => {
  it("validates and clones a self-contained generated batch", () => {
    const fixture = artifactFixture();
    const parsed = parseTurningReviewArtifact(JSON.parse(serializeTurningReviewArtifact(fixture)));

    expect(parsed).toEqual(fixture);
    expect(parsed).not.toBe(fixture);
  });

  it("rejects unsupported schemas and reviews for absent cases", () => {
    const fixture = artifactFixture();

    expect(() => parseTurningReviewArtifact({ ...fixture, schemaVersion: 2 })).toThrow(
      /schemaVersion/
    );
    expect(() =>
      parseTurningReviewArtifact({
        ...fixture,
        reviews: {
          missing: {
            outcome: "possible",
            notes: "",
            updatedAt: "2026-07-30T12:00:00.000Z"
          }
        }
      })
    ).toThrow(/absent from the batch/);
  });

  it("persists complete drafts by batch hash and restores them after refresh", () => {
    const storage = new MemoryStorage();
    const fixture = artifactFixture();
    const reviewed: TurningReviewArtifact = {
      ...fixture,
      reviews: {
        "case-01": {
          outcome: "inconclusive",
          notes: "Likely possible, but I cannot establish it yet.",
          updatedAt: "2026-07-30T12:00:00.000Z"
        }
      }
    };
    const saved = saveTurningReviewWorkbench(storage, {
      artifact: reviewed,
      activeCaseId: "case-01",
      updatedAt: "2026-07-30T12:00:00.000Z",
      lastExportedAt: "2026-07-30T11:00:00.000Z"
    });

    expect(saved.storageKey).toBe(turningReviewStorageKey(reviewed));
    expect(loadTurningReviewWorkbench(storage, saved.storageKey)).toEqual(saved);
    expect(listTurningReviewWorkbenches(storage)).toEqual([saved]);

    removeTurningReviewWorkbench(storage, saved.storageKey);
    expect(listTurningReviewWorkbenches(storage)).toEqual([]);
  });
});
