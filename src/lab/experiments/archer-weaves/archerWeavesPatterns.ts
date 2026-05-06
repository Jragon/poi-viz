import { compileAuthoredDocument } from "@/authoring/compile";
import type { AuthoredDocumentEntry } from "@/authoring/types";
import type { MultiRigSequence } from "@/engine/types";

export const sixBeatSameDirection: AuthoredDocumentEntry = {
  id: "34f191da-8ad3-4d1c-850b-51177c15b222",
  document: {
    name: "6 beat inspin",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            hand: {
              startPose: {
                phaseDeg: 0,
                radius: 1
              },
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              startPose: {
                phaseDeg: 270,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: -37.69911184307752,
                omegaUnit: "radians-per-unit"
              }
            }
          }
        ]
      },
      right: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            hand: {
              startPose: {
                phaseDeg: 0,
                radius: 1
              },
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              startPose: {
                phaseDeg: 90,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: -37.69911184307752,
                omegaUnit: "radians-per-unit"
              }
            },
            planeId: "wall"
          }
        ]
      }
    }
  }
};

export const sixBeatArcherRadiusShift: AuthoredDocumentEntry = {
  id: "ce944d83-eb3e-460d-b4b2-e99d86a7d44d",
  document: {
    name: "6 beat inspin radius shift archer",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            hand: {
              startPose: {
                phaseDeg: 0,
                radius: 1
              },
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit",
                radiusProfile: {
                  kind: "time-keyed",
                  keys: [
                    {
                      t: 0.25,
                      radius: 1
                    },
                    {
                      t: 0.5,
                      radius: 0.5
                    },
                    {
                      t: 0.75,
                      radius: 1
                    },
                    {
                      t: 1,
                      radius: 1
                    }
                  ]
                }
              }
            },
            head: {
              startPose: {
                phaseDeg: 270,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: -37.69911184307752,
                omegaUnit: "radians-per-unit"
              }
            }
          }
        ]
      },
      right: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            hand: {
              startPose: {
                phaseDeg: 0,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit",
                radiusProfile: {
                  kind: "time-keyed",
                  keys: [
                    {
                      t: 0.25,
                      radius: 1
                    },
                    {
                      t: 0.75,
                      radius: 1
                    },
                    {
                      t: 1,
                      radius: 0.5
                    }
                  ]
                }
              }
            },
            head: {
              startPose: {
                phaseDeg: 90,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: -37.69911184307752,
                omegaUnit: "radians-per-unit"
              }
            },
            planeId: "wall"
          }
        ]
      }
    }
  }
};

export const fiveBeatSplitOppositeEarthHandRadiusShiftPattern: AuthoredDocumentEntry = {
  id: "140aec9e-e925-41c2-b2f2-536e5331ba2d",
  document: {
    name: "5 beat split op earth hand with radius shif",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            hand: {
              startPose: {
                phaseDeg: 0,
                radius: 1
              },
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit",
                radiusProfile: {
                  kind: "time-keyed",
                  keys: [
                    {
                      t: 0.25,
                      radius: 1
                    },
                    {
                      t: 0.5,
                      radius: 0.5
                    },
                    {
                      t: 0.75,
                      radius: 1
                    },
                    {
                      t: 1,
                      radius: 1
                    }
                  ]
                }
              }
            },
            head: {
              startPose: {
                phaseDeg: 0,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: -31.41592653589793,
                omegaUnit: "radians-per-unit"
              }
            }
          }
        ]
      },
      right: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            hand: {
              startPose: {
                phaseDeg: 0,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit",
                radiusProfile: {
                  kind: "time-keyed",
                  keys: [
                    {
                      t: 0.25,
                      radius: 1
                    },
                    {
                      t: 0.75,
                      radius: 1
                    },
                    {
                      t: 1,
                      radius: 0.5
                    }
                  ]
                }
              }
            },
            head: {
              startPose: {
                phaseDeg: 0,
                radius: 0.5
              },
              driver: {
                kind: "circle",
                omega: 31.41592653589793,
                omegaUnit: "radians-per-unit"
              }
            },
            planeId: "wall"
          }
        ]
      }
    }
  }
};

export function getFiveBeatSplitOppositeEarthHandRadiusShiftSequence(): MultiRigSequence {
  const result = compileAuthoredDocument(fiveBeatSplitOppositeEarthHandRadiusShiftPattern.document);

  if (!result.ok) {
    const codes = result.errors.map((error) => error.code).join(", ");
    throw new Error(`Archer-weaves pattern failed to compile: ${codes}`);
  }

  return result.sequence;
}
