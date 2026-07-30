# Opposite left-weave review 001

> **Status: awaiting physical review, generated 2026-07-30.**

This is the first focused Pattern Verifier batch. It keeps the ordered hand positions fixed as a
left low weave:

- left hand: `low-native`;
- right hand: `low-non-native`;
- source direction: opposite inwards;
- target direction: opposite outwards;
- body turn: both left and right cases;
- bridge: exactly one halfbeat, with no preparation or recovery.

Import [`workbench.json`](workbench.json) into `/lab/mel-turning/review`.

## Selection

The batch contains 16 routes:

- all four SO offset 0→0 phase variants for a left turn;
- all four SO offset 0→0 phase variants for a right turn;
- both TO offset 1→1 phase variants for a left turn;
- both TO offset 1→1 phase variants for a right turn;
- one SO offset 0→2 phase representative for each body-turn direction;
- one TO offset 1→3 phase representative for each body-turn direction.

The first twelve routes therefore exhaust the solver's direct same-offset phase variants for this
matrix. Cases 13–16 introduce the alternate compatible offset while keeping SO, TO, and both
body-turn directions represented.

Four alternate-offset partners are deliberately deferred to the next batch:

- the second SO offset 0→2 left-turn route;
- the second SO offset 0→2 right-turn route;
- the second TO offset 1→3 left-turn route;
- the second TO offset 1→3 right-turn route.

This is a batch-size decision, not an equivalence claim. The omitted departure/arrival phases remain
valid first-class solver routes.

[`cases.csv`](cases.csv) and [`steps.csv`](steps.csv) are diagnostic projections only. Review state
belongs in the workbench's exported JSON.
