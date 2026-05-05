import { compileAuthoredDocument } from "@/authoring/compile";
import type { AuthoredDocumentEntry } from "@/authoring/types";
import type { MultiRigSequence } from "@/engine/types";

export const pastedQuarterTimePattern: AuthoredDocumentEntry = {
  id: "d113ba1c-34ae-4b09-ab40-78501fdf5147",
  document: {
    name: "1/4 time 3d idk",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 0.25,
            hand: {
              startPose: {
                phaseDeg: 270,
                radius: 1
              },
              driver: {
                kind: "circle",
                omega: 0,
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
                omega: 0,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.5,
            planeId: "wall",
            hand: {
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.5,
            planeId: "wheel",
            hand: {
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "wall",
            hand: {
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "floor",
            hand: {
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "floor",
            hand: {
              driver: {
                kind: "circle",
                omega: 6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: -18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "wall",
            hand: {
              driver: {
                kind: "circle",
                omega: 6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: -18.84955592153876,
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
            durationUnits: 0.5,
            planeId: "wall",
            hand: {
              startPose: {
                phaseDeg: 270,
                radius: 1
              },
              driver: {
                kind: "circle",
                omega: 6.283185307179586,
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
                omega: -18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.5,
            planeId: "wheel",
            hand: {
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "wall",
            hand: {
              driver: {
                kind: "circle",
                omega: 6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: -18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "floor",
            hand: {
              driver: {
                kind: "circle",
                omega: 6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: -18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "floor",
            hand: {
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "wall",
            hand: {
              driver: {
                kind: "circle",
                omega: -6.283185307179586,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 18.84955592153876,
                omegaUnit: "radians-per-unit"
              }
            }
          },
          {
            kind: "continuation",
            durationUnits: 0.25,
            planeId: "wall",
            hand: {
              driver: {
                kind: "circle",
                omega: 0,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              driver: {
                kind: "circle",
                omega: 0,
                omegaUnit: "radians-per-unit"
              }
            }
          }
        ]
      }
    }
  }
};

export function getPastedQuarterTimeSequence(): MultiRigSequence {
  const result = compileAuthoredDocument(pastedQuarterTimePattern.document);

  if (!result.ok) {
    const codes = result.errors.map((error) => error.code).join(", ");
    throw new Error(`Pasted quarter-time pattern failed to compile: ${codes}`);
  }

  return result.sequence;
}
