# Low-reel route solver: working research model

> **Status: non-normative working model, 2026-07-30.**
>
> This document describes the current deterministic research solver in
> `src/lab/experiments/mel-turning/model/lowReelRouteSolver.ts`. It is a candidate generator for
> physical review, not a complete movement law and not built-in engine behavior. Current source of
> truth remains the implementation; normative repository decisions remain in
> [`../decisions.md`](../decisions.md).

## Purpose and decision boundary

The solver answers a deliberately narrow question:

> Given two structurally compatible low-reel cycles and a left or right 180-degree body turn, what
> are the shortest modelled preparation → turn → recovery bridges between them?

It does not decide whether a route is comfortable, collision-free, anatomically simultaneous, or
preferred. Those are physical-review results. It also does not change poi direction, timing, or
phase continuity to make incompatible endpoints connect.

The interactive explorer still uses the exact direct-turn search as its default bridge selector.
The wider route solver exists alongside it so candidate routes can be inspected and exported for
review before becoming explorer behavior.

## Compatible endpoints

Compatibility is checked before a route graph is built:

- target timing must equal source timing: TO, SO, TS, or SS;
- same clockwise becomes same counterclockwise, and vice versa;
- opposite inwards becomes opposite outwards, and vice versa;
- both poi therefore remain either same-direction or opposite-direction throughout;
- observer-fixed poi rotation does not reverse during the turn.

For any selected target hand-position pair, exactly two of Mel's four offsets preserve source
timing. If source and target are both mills or both weaves, target offset parity matches source
parity. If one is a mill and the other is a weave, target parity flips. Offsets with the same parity
remain distinct exact phases; they are not aliases.

Mel provides 144 exact low-reel configurations:

```text
3 left positions × 3 right positions × 4 direction modes × 4 offsets
```

Once a source is fixed, target direction is derived and each of the nine target position pairs has
two valid offsets. This gives 2,592 structurally compatible ordered endpoint pairs before selecting
body-turn direction.

The explorer prevents ordinary users from creating an incompatible target: direction is derived
and locked, and only the two timing-compatible offsets are enabled. URL parsing and direct solver
calls still normalize or reject incompatible inputs defensively.

## Resolved boundary state

A compact beat-graph row is not a complete physical pose. In particular, a reel's symbolic `C` row
does not mean that the hand moves to the centre of the torso. Mel's cyclic compiler can resolve that
row as a hold at the existing low hand anchor.

Each solver boundary therefore contains:

- body facing, `0` before the turn or `180` after it;
- timing class;
- left and right compact lane, A/B side, phase, and hand placement;
- each hand's Mel-compiler-resolved body-relative point;
- each poi's observer-fixed rotation direction;
- every exact Mel configuration and cycle step represented by that resolved state.

State identity uses all of those physical boundary fields, with hand coordinates normalized to six
decimal places. Two occurrences may share a state only when their resolved signatures match. A
matching `C a up` label alone is not enough.

The solver currently retains resolved interval endpoints and Mel configuration/step provenance. It
does not yet carry the compiler's complete continuous hand driver as an edge witness.

## Edge vocabulary

The search graph intentionally has only three edge kinds.

### Reel continuation

An exact synchronized halfbeat from a compiled Mel reel. Both hands follow a joint edge that occurs
in at least one exact compatible reel configuration. Its provenance names those configuration
intervals.

`valid` here means valid as a Mel continuation in the current model. It is not a physical
verification badge for the complete turning route.

### Circle extension

A generated halfbeat in which at least one hand remains on the same resolved anchor, lane, A/B side,
placement, and observer-fixed direction while its up/down phase advances. The other hand may either
do the same or follow an exact reel continuation into a synchronized state that exists in the Mel
catalogue.

This edge models the preparation seen in a verified TS route, where a hand stays on its existing
circle for one extra halfbeat before turning. It is an explicit hypothesis, not a general permission
to join similar compact nodes. Every generated circle-extension edge is `unresolved` unless an
exact physically verified route supplies stronger evidence for the whole path.

### Body turn

Exactly one synchronized halfbeat from facing 0 to facing 180. Both poi advance phase without
pausing. Each hand is checked by the partial low-reel turn topology and classified as hold or cross:

- known-invalid turn edges are omitted;
- known-valid edges remain model-valid;
- missing hold-table knowledge remains unresolved and is included by default for research.

There are no turn edges from facing 180 back to facing 0 in this solver. A second turn and genuine
cycle closure are separate work.

## Search semantics

The source catalogue contains all low-reel configurations with the selected source direction and
timing. The target catalogue contains all configurations with the derived target direction and the
same timing.

Search starts at every row of the exact source cycle and stops on first entry into any row of the
exact target cycle. Resolved-state merging allows a path to enter another exact Mel configuration
only at a fully matching physical boundary. The graph direction enforces the route shape:

```text
zero or more preparation edges → one body-turn edge → zero or more recovery edges
```

A deterministic breadth-first search finds the minimum number of bridge halfbeats. The solver
counts all shortest routes, with overflow saturated at JavaScript's maximum safe integer, while
materializing only a bounded deterministic prefix:

- 40 routes by default, configurable from 1 to 500;
- shortest routes only by default;
- simple near-shortest alternatives up to two extra halfbeats when requested;
- first target-cycle entry always ends the bridge.

Route identifiers are deterministic hashes of exact endpoints, body-turn direction, and ordered
edge identities. Identical inputs and options must return identical ordering and output.

## Model status and evidence status

These are separate axes:

| Signal             | Current meaning                                                                 |
| ------------------ | ------------------------------------------------------------------------------- |
| Model `valid`      | Every edge is accepted by current Mel continuation or known turn-topology rules |
| Model `unresolved` | At least one edge uses an unverified circle extension or incomplete topology    |
| Exact verified     | The complete ordered route matches a specifically normalized physical fixture   |
| Unreviewed         | No exact complete-route match is currently encoded                              |

The current matcher recognizes the focused verified low-weave direct routes and one verified TS
preparation route. It is not yet a general normalization of every verified CSV. A route may contain
a familiar turn edge without being a verified complete route.

Exact physical evidence may promote the status of the complete route; it does not silently turn
every structurally similar generated edge into a universal rule.

## Playback context

The route bridge and the animation context are different objects. For a selected bridge of `k`
halfbeats, the intended explorer trace is:

```text
4 source-cycle halfbeats → k bridge halfbeats → 4 target-cycle halfbeats
```

The current direct explorer now shows one complete source cycle, its one-halfbeat turn bridge, and
one complete target cycle. It uses Mel-resolved hand anchors, so symbolic centre rows no longer pull
low-reel hands to the torso.

The trace is finite. Reset returns to its beginning, and repeat replays the same finite trace; repeat
does not claim that one 180-degree turn is a closed physical cycle.

## Candidate-review loop

The solver is useful only if generated routes remain easy to falsify:

1. Generate a deterministic, diverse review pack rather than a uniform random sample.
2. Include known verified controls, new shortest preparation routes, recovery alternatives, and
   unresolved/back-position probes.
3. Record exact endpoints, route ID, every resolved state, every edge kind, provenance, model
   status, and evidence status.
4. Physically perform the complete route and record legality, naturalness, corrections, and notes.
5. Normalize reviewed results explicitly; do not treat edited CSV rows as runtime truth
   automatically.
6. Refine the edge vocabulary or state identity only when repeated evidence demonstrates the need.
7. Integrate expanded routes into the explorer only after the candidate grammar survives review.

Paired alternatives for the same endpoints are more informative than unrelated random routes. They
can isolate whether preparation placement, recovery placement, turn direction, or hold/cross
topology caused the physical difference.

The first review pack lives in
[`candidates/solver-review-001/`](candidates/solver-review-001/). Its four verified controls make
notation or playback misunderstandings visible before the twelve unreviewed candidates. The
candidate cases are six endpoint-matched pairs, so each comparison changes route shape or turn
edge while holding the query fixed.

Generate the same deterministic batch elsewhere with:

```sh
pnpm generate:mel-turning-review -- --output /path/to/review-directory
```

The default output is the checked-in `solver-review-001` directory. Existing review CSVs are
protected because they may contain physical annotations; `--force` is required to replace them
intentionally.

## Known limits and open research

- Same-anchor circle extension is the only generated preparation/recovery mechanism.
- A fully matching boundary does not prove the incoming and outgoing continuous hand paths join
  naturally.
- Individually accepted hand actions do not prove simultaneous two-arm anatomy.
- The solver has no collision, joint-limit, balance, comfort, or naturalness evaluator.
- Exact-route evidence matching covers only a small curated subset of the CSV corpus.
- Back-position holds and some both-counterclockwise/opposite-direction cases remain sparsely
  verified.
- Entry history may eventually be needed if the resolved boundary state is insufficient for
  centre-back or crossing behavior.
- Poi stalls, reversals, wraps, cosmos, arbitrary Mel graphs, and a second closing turn are outside
  this model.

## Validation invariants

The implementation should retain these measurable properties:

- incompatible direction or timing returns no route graph;
- every endpoint pairing exposes exactly two timing-compatible target offsets;
- every route has exactly one body-turn edge;
- `bridgeHalfbeats = preparationHalfbeats + 1 + recoveryHalfbeats`;
- phase alternates on every edge and observer-fixed poi direction remains unchanged;
- direct verified weave routes remain one halfbeat;
- the known verified TS preparation remains circle extension → body turn;
- distinct latent centre anchors never merge merely because their compact notation matches;
- shortest counts, materialized order, route IDs, and diagnostics are deterministic;
- original Mel body tracing and the engine do not depend on the turning solver.
