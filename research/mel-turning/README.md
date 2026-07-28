# Mel turning research

This directory contains the working evidence for extending Mel's body-tracing beat graphs with
180-degree body turns. The CSV files are research fixtures, not production engine semantics.
Normative application decisions remain in [`../decisions.md`](../decisions.md).

## Directory status

| Directory | Meaning |
| --- | --- |
| `verified/` | Patterns that have been physically reviewed and corrected |
| `candidates/` | New patterns awaiting physical verification |
| `archive/` | Superseded derivations retained as provenance |
| `local/` | Numbers/XLSX working files; deliberately ignored by Git |

## Verified sets

| File | Contents |
| --- | --- |
| `verified/low-reels-one-hand-and-together-opposite.csv` | One-hand low native, non-native, and back turns, plus together-opposite two-hand turns |
| `verified/low-reels-split-opposite.csv` | The four verified split-opposite chasing-offset transitions for a turn to the left |
| `verified/low-reels-two-hand-split-opposite-non-native-turn-left.csv` | Four verified low-non-native SO chasing-offset transitions; inward to outward |
| `verified/low-reels-two-hand-together-same-turn-left.csv` | Four verified low-native TS chasing-offset transitions; both poi clockwise; turn left |
| `verified/low-reels-two-hand-split-same-turn-left.csv` | Four verified low-native SS unison/counter transitions; both poi clockwise; turn left |
| `verified/low-reels-two-hand-together-same-turn-right.csv` | Four verified low-native TS chasing-offset transitions; both poi clockwise; turn right |
| `verified/low-reels-two-hand-split-same-turn-right.csv` | Four verified low-native SS unison/counter transitions; both poi clockwise; turn right |

## Candidate sets

| File | Contents |
| --- | --- |
| `candidates/low-reels-two-hand-together-opposite-non-native-turn-left.csv` | Four low-non-native TO unison/counter transitions; inward to outward |

The verified same-direction files cover both left and right body turns while both poi move clockwise
in the observer frame. The turn-right routes were derived and checked independently rather than
being assumed to mirror the turn-left routes. The both-counterclockwise cases remain unverified.

The remaining TO non-native file still tests a topology hypothesis. Non-native and back reels use
the same plane topology, but they are not interchangeable movement rows: hand placement and the
path allowed by the surrounding sequence still matter.

## Runtime normalization

The isolated Mel-turning lab contains a typed, deterministic normalization of the verified evidence:

- 24 one-hand turns and 2 non-turning one-hand reference cycles;
- 28 two-hand turns across TO, SO, TS, and SS timing;
- 52 verified turn cases in total.

Each normalized fixture retains its CSV filename, exact case label, original first step, and original
turn step. Runtime code does not parse the CSVs. Source comparison is a manual audit step rather than
a CSV-conformance test.

Back notation remains explicit during normalization: `Cb`, `Lb`, and `Rb` carry
`behind-body` hand placement in addition to the ordinary five-column lane and A/B plane-side data.
This prevents low-back evidence from being flattened into front-wall `C`, `L`, and `R` shorthand.

## Verified findings

- All four proposed TS bridge combinations were physically valid. Keeping the same chasing offset
  preserves the same diagonal `A/B` circle in world space; what changes after the turn is which
  top/bottom meeting point is perceived as being in front of the performer.
- The SS bridge matrix was valid, but both unison-source preparations exposed a limit in the `C`
  shorthand. `C` is laterally flexible within a chosen front wall plane; it cannot make simultaneous
  `C a` and `C b` positions freely equivalent. The corrected B-side source is `L b up`, not
  `C b up`.
- All eight clockwise turn-right TS/SS bridges were physically valid. The common SS route is
  `counter → counter`; the other SS transitions work but feel less natural.
- TS `chasing-2 → chasing-1` on the right turn is legal because it first changes into the
  chasing-1 node and then uses the familiar turn bridge. A graph should represent this as a
  preparation edge followed by a body-turn edge, allowing minimum-path search to distinguish it
  from a direct bridge.
- All four SO non-native bridges were valid, though physically difficult. Their plane topology is
  effectively the same as back reels; what changes is where the hand is and which path the sequence
  allows it to take.

## Notation

- `facing`: `0` before the turn and `180` after it.
- A body turn occurs over one halfbeat between adjacent rows.
- `a`: plane side towards the observer.
- `b`: plane side away from the observer.
- `C`, `L`, `R`: center, performer left, and performer right.
- `Cb`, `Lb`, `Rb`: center-back, left-low-back, and right-low-back locations.
- `up`, `down`: the poi's halfbeat phase.
- `hold`: the poi remains on the same world plane side while the body turns.
- `cross`: the poi changes world plane side through a crosspoint.
- `TO`, `SO`, `TS`, `SS`: together/split timing combined with opposite/same direction.
- `chasing-1`: SO reference row `left C a up / right C a down`.
- `chasing-2`: SO reference row `left C a up / right R b down`.

`C` is a compact front-plane equivalence class rather than a literal hand coordinate, but it is not
permission to move the hand arbitrarily. Lateral freedom is constrained by the surrounding
sequence. In reels, keep the hand on its existing path unless a bridge explicitly moves it; this is
especially important for non-native reels, where the hands are crossed. Performer left/right labels
remain body-relative; plane sides `a` and `b` remain observer-relative.

## Invariants

- Poi timing and speed continue unchanged through a turn.
- Every hand continues alternating `up` and `down` on consecutive rows.
- A 180-degree body turn changes the body-relative inward/outward interpretation.
- A hold preserves plane side; a cross changes plane side.
- Two-hand patterns share one body-facing transition even when their individual plane changes need
  preparation on different halfbeats.

## Workflow

1. Add a clearly named CSV to `candidates/`.
2. Keep enough surrounding rows to show the stable pattern before and after the turn.
3. Physically test every candidate and correct the CSV directly.
4. Mark rejected candidates explicitly rather than silently removing the evidence.
5. Move a completed file into `verified/` without adding `final`, a person's name, or version
   suffixes.
6. Update the verified-set table above.

Suggested future names:

- `candidates/low-back-two-hand-turn-left.csv`
- `candidates/weave-two-hand-turn-left.csv`

## Archive provenance

| File | Origin |
| --- | --- |
| `archive/initial-one-hand-derivations.csv` | Initial handwritten one-hand reel derivations |
| `archive/early-two-hand-derivations.csv` | Early TO and SO two-hand tables |
| `archive/generated-outward-and-to-candidates.csv` | Generated verification set before physical corrections |
