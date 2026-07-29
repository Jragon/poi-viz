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
| `verified/low-reels-two-hand-split-opposite-non-native-turn-left.csv` | Original four low-non-native SO transitions; three remain normalized as verified and chasing-2→2 is superseded by the correction candidate |
| `verified/low-reels-two-hand-together-same-turn-left.csv` | Four verified low-native TS chasing-offset transitions; both poi clockwise; turn left |
| `verified/low-reels-two-hand-split-same-turn-left.csv` | Four verified low-native SS unison/counter transitions; both poi clockwise; turn left |
| `verified/low-reels-two-hand-together-same-turn-right.csv` | Four verified low-native TS chasing-offset transitions; both poi clockwise; turn right |
| `verified/low-reels-two-hand-split-same-turn-right.csv` | Four verified low-native SS unison/counter transitions; both poi clockwise; turn right |

## Candidate sets

| File | Contents |
| --- | --- |
| `candidates/low-reels-two-hand-together-opposite-non-native-turn-left.csv` | Four low-non-native TO unison/counter transitions; inward to outward |
| `candidates/low-reels-turn-edge-corrections.csv` | Full-context recheck of five suspect turn edges, including two alternative routes for each ambiguous low-back case |
| `candidates/unresolved-turning-issues.csv` | Consolidated register of the eight remaining rule/notation questions, with full routes for the unresolved low-back, SO, SS, and TO cases |
| `candidates/low-weaves-left-clockwise-fixed-targets.csv` | Eight fixed source/target searches for the left low weave: TS offset 0→0/2 and SS offset 1→1/3, each turning left/right; includes every equal-shortest candidate from the partial topology |

The verified same-direction files cover both left and right body turns while both poi move clockwise
in the observer frame. The turn-right routes were derived and checked independently rather than
being assumed to mirror the turn-left routes. The both-counterclockwise cases remain unverified.

The remaining TO non-native file still tests a topology hypothesis. Non-native and back reels use
the same plane topology, but they are not interchangeable movement rows: hand placement and the
path allowed by the surrounding sequence still matter.

The turn-edge correction file now supersedes the normalized rows for the five cases it rechecks.
Cases 1A, 1B, 2A, 2B, and 3 are marked verified. Cases 4 and 5 are normalized as unverified
candidates until their corrected rows are physically checked. The older right-hand low-back inward
right crossing is also downgraded because its midpoint direction conflicts with the newly stated
rear-circle gate rule.

The unresolved-issues file is the current physical-review queue. It distinguishes ordinary
`C b` from center-back `Cb b`, keeps the rejected low-back edge beside two gate-valid alternatives,
and separates per-hand topology validity from joint two-arm performability.

The current weave experiment fixes both endpoints before deriving a bridge. It starts with a
body-left low weave (`left low-native / right low-non-native`) and uses Mel's internal offsets:
source 0 (TS) targets 0/2, and source 1 (SS) targets 1/3. Every pair is searched independently for
left and right body turns. The endpoint cycles come directly from Mel; the target is compiled in
the performer-relative counterclockwise frame at facing 180 while observer-fixed poi motion remains
clockwise.

The partial topology predicts a one-halfbeat direct bridge for all eight endpoint pairs, with 20
equal-shortest candidates in total. These are candidates, not conclusions: the model validates each
hand separately and does not yet prove simultaneous two-arm anatomy. TO/SO inwards/outwards,
counterclockwise source weaves, right-side weaves, and longer fallback bridges remain untested.

## Runtime normalization

The isolated Mel-turning lab contains a typed, deterministic normalization of the verified evidence:

- 24 verified one-hand turns and 2 non-turning one-hand reference cycles;
- 26 verified two-hand turns across TO, SO, TS, and SS timing;
- 50 verified turn cases in total;
- 1 one-hand and 2 two-hand corrected or contradicted candidates kept explicitly unverified.

Each normalized fixture retains its CSV filename, exact case label, original first step, and original
turn step. Runtime code does not parse the CSVs. Source comparison is a manual audit step rather than
a CSV-conformance test.

Back notation remains explicit during normalization: `Cb`, `Lb`, and `Rb` carry
`behind-body` hand placement in addition to the ordinary five-column lane and A/B plane-side data.
Hand placement is not the same thing as the poi's performer-relative circle. `C`, `Lb`, and `Rb`
place the poi in front of the performer; `L`, `R`, and `Cb` place it behind.

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
- Three SO non-native bridges remain physically verified. The corrected chasing-2→2 bridge is kept
  as an unverified candidate with its turn on t6→t7.
- Midpoint poi direction identifies the crosspoint gate because every crossing must point outward:
  left arrow means left gate and right arrow means right gate. This can oppose the body-turn side.
  A front-circle crossing uses the turn-side gate; a rear-circle crossing uses the opposite gate.
- Holds are hand-specific anatomical transitions. For example, a right hand can hold B through
  `R → Lb` on a left turn, while the corresponding non-native `L` source cannot hold through a
  right turn. Unknown `Cb`, `Lb`, and `Rb` hold sources remain unresolved rather than inferred.
- A source state may have more than one legal shared turn edge. The corrected SO non-native source
  `left C a down / right L b up` can use left-cross/right-hold or hold/hold. Ergonomic preference
  for crossing during the turn is not part of legality.

## Adversarial findings

Seven deterministic mutations probe the current turn-edge boundary:

- phase reset, missing synchronized target, and unchanged facing are structurally rejected;
- moving the turn earlier without relabelling its targets, flipping one target plane side, reversing
  only the body turn, and removing a known preparation remain structurally coherent but are rejected
  by facing, hold, or crossing-gate topology.

Every mutation is stripped of verified status before analysis. This demonstrates the intended
boundary: the shared contract enforces timing and representation integrity; the partial low-reel
topology decides known crossings and holds while leaving unmodelled hold sources unresolved.

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

The performer-relative poi-circle classes are:

- front: `C`, `Lb`, `Rb`;
- back: `L`, `R`, `Cb`.

Facing 0 places the front class on A and the back class on B. Facing 180 reverses that relation.
Location labels do not name the crossing gate: an `L b → L a` rear-circle crossing can use the
right gate when its midpoint arrow points right.

## Invariants

- Poi timing and speed continue unchanged through a turn.
- Every hand continues alternating `up` and `down` on consecutive rows.
- A 180-degree body turn changes the body-relative inward/outward interpretation.
- A hold preserves plane side; a cross changes plane side.
- A crossing preserves the compact low-reel location while facing and plane side both flip.
- A crossing gate is the outward horizontal midpoint direction.
- A front-circle crossing uses the body-turn-side gate; a rear-circle crossing uses the opposite
  gate.
- Known holds are validated by hand, source location, and body-turn direction. Missing hold-table
  entries are unresolved, not automatically illegal.
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
| `archive/incorrect-low-weave-first-pass.csv` | Superseded local-edge weave derivation; its SS continuation entered a reel because no exact target cycle was enforced |
