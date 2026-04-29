import type { AuthoredDocumentEntry } from "@/authoring/types";

export const seedDocuments: AuthoredDocumentEntry[] = [
  {
    id: "f80e2f41-1a12-4380-977e-99c712de5968",
    document: {
      name: "switchbacks",
      description: "idk fun poi fu stuff",
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 0.75,
              hand: {
                startPose: {
                  phaseDeg: 0,
                  radius: 1.5
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              },
              head: {
                startPose: {
                  phaseDeg: 180,
                  radius: 1
                },
                driver: {
                  kind: "circle",
                  omega: 18.84955592153876,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.75,
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
              durationUnits: 0.75,
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
              durationUnits: 0.75,
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
                  omega: 18.84955592153876,
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
              durationUnits: 0.75,
              hand: {
                startPose: {
                  phaseDeg: 0,
                  radius: 1.5
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              },
              head: {
                startPose: {
                  phaseDeg: 0,
                  radius: 1
                },
                driver: {
                  kind: "circle",
                  omega: 18.84955592153876,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.75,
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
                  omega: 18.84955592153876,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.75,
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
              durationUnits: 0.75,
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
            }
          ]
        }
      }
    }
  },
  {
    id: "ecfe3470-e11c-462b-b37c-9977a5b1b7c4",
    document: {
      name: "c caps",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 0.5,
              hand: {
                startPose: {
                  phaseDeg: 90,
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
                  radius: 1
                },
                driver: {
                  kind: "circle",
                  omega: -6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  radius: 1
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
            }
          ]
        }
      }
    }
  },
  {
    id: "a1031a07-3bc1-45b6-bcf8-7be26bd64581",
    document: {
      name: "4 beat archer",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 5,
              hand: {
                startPose: {
                  phaseDeg: 90,
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
                  phaseDeg: 90,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: -25.132741228718345,
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
              durationUnits: 5,
              hand: {
                startPose: {
                  phaseDeg: 90,
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
                  omega: 25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "0995b8f5-c5ac-488c-a66d-db100e23b3b7",
    document: {
      name: "5 beat split opp archer top orient",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 5,
              hand: {
                startPose: {
                  phaseDeg: 90,
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
                  phaseDeg: 90,
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
              durationUnits: 5,
              hand: {
                startPose: {
                  phaseDeg: 90,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "12d9baa2-25bb-48f9-8576-405c1f8563f4",
    document: {
      name: "water 4 petal anti spin",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 3,
              hand: {
                startPose: {
                  phaseDeg: 0,
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
                  phaseDeg: 0,
                  radius: 0.75
                },
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
              durationUnits: 3,
              hand: {
                startPose: {
                  phaseDeg: 180,
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
                  phaseDeg: 180,
                  radius: 0.75
                },
                driver: {
                  kind: "circle",
                  omega: -18.84955592153876,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "96f211fa-58f0-400b-be5b-4db36638b2ad",
    document: {
      name: "4 beat bottom cap split op earth hand",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 0.5,
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
                  omega: -25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -25.132741228718345,
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
                  omega: 25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 25.132741228718345,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "125cbf56-0951-469c-9bae-01ddd3493bd2",
    document: {
      name: "5 beat bottom cap split op earth hand",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 0.5,
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
                  phaseDeg: 0,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
              durationUnits: 0.5,
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
                  phaseDeg: 0,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "89c6f1c8-79c0-4ff5-b4a7-dda104a3a1f8",
    document: {
      name: "5 beat archer opps side",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 5,
              hand: {
                startPose: {
                  phaseDeg: 0,
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
              durationUnits: 5,
              hand: {
                startPose: {
                  phaseDeg: 0,
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
                  phaseDeg: 0,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "46ca4b34-d083-44ce-95ea-9e42e539970a",
    document: {
      name: "5 beat top cap split op earth hand",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 0.5,
              hand: {
                startPose: {
                  phaseDeg: 0,
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
                  phaseDeg: 0,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
              durationUnits: 0.5,
              hand: {
                startPose: {
                  phaseDeg: 0,
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
                  phaseDeg: 0,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "687ab563-c4d8-453d-a173-b2874aa32d60",
    document: {
      name: "isolation",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 10,
              hand: {
                startPose: {
                  phaseDeg: 0,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              },
              head: {
                startPose: {
                  phaseDeg: 180,
                  radius: 1
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "2baae611-ed98-417a-bd75-2c2ee5eadb19",
    document: {
      name: "triquetra vs isolation?",
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
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              },
              head: {
                startPose: {
                  phaseDeg: 180,
                  radius: 1
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
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
                  phaseDeg: 180,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: 6.283185307179586,
                  omegaUnit: "radians-per-unit"
                }
              },
              head: {
                startPose: {
                  phaseDeg: 0,
                  radius: 1
                },
                driver: {
                  kind: "circle",
                  omega: -12.566370614359172,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: "42317fcf-80d3-488f-9ff7-ccc02144b3b5",
    document: {
      name: "5 beat side cap split op earth 90 deg offset",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 0.5,
              hand: {
                startPose: {
                  phaseDeg: 90,
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
                  phaseDeg: 90,
                  radius: 0.5
                },
                driver: {
                  kind: "circle",
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: -31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
              durationUnits: 0.5,
              hand: {
                startPose: {
                  phaseDeg: 90,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 0.5,
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
                  omega: 31.41592653589793,
                  omegaUnit: "radians-per-unit"
                }
              }
            }
          ]
        }
      }
    }
  }
];
