import type { AuthoredSequenceDocument } from "@/authoring/types";

export function createDefaultAuthoringDocument(): AuthoredSequenceDocument {
  return {
    name: "Untitled",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            planeId: "wall",
            planeSide: "a",
            hand: {
              startPose: { phaseDeg: 0, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            },
            head: {
              startPose: { phaseDeg: 0, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            }
          }
        ]
      }
    }
  };
}
