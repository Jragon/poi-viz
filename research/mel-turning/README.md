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
| `verified/low-reels-split-opposite.csv` | The four verified split-opposite offset transitions for a turn to the left |

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

`C` is a compact front-plane equivalence class rather than a literal hand coordinate. Performer
left/right labels remain body-relative; plane sides `a` and `b` remain observer-relative.

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

- `candidates/low-reels-two-hand-ts-turn-left.csv`
- `candidates/low-reels-two-hand-ss-turn-left.csv`
- `candidates/low-back-two-hand-turn-left.csv`
- `candidates/weave-two-hand-turn-left.csv`

## Archive provenance

| File | Origin |
| --- | --- |
| `archive/initial-one-hand-derivations.csv` | Initial handwritten one-hand reel derivations |
| `archive/early-two-hand-derivations.csv` | Early TO and SO two-hand tables |
| `archive/generated-outward-and-to-candidates.csv` | Generated verification set before physical corrections |
