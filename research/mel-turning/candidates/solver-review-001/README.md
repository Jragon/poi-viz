# Solver review 001

> **Status: awaiting physical review, generated 2026-07-30.**

This is the first deterministic review pack from the low-reel preparation/turn/recovery solver. It
contains 16 complete finite sequences:

- cases 01–04 are physically verified controls;
- cases 05–16 are six paired comparisons with identical endpoints inside each pair;
- the batch covers TO, SO, TS, and SS timing, both body-turn directions, mill and weave endpoints,
  and direct, preparation, recovery, and combined route shapes.

Use [`cases.csv`](cases.csv) for one verdict per complete route. Fill in `review_verdict`,
`naturalness`, and `review_notes`. Use [`steps.csv`](steps.csv) when a particular halfbeat needs a
correction; its `physical_correction` and `review_notes` columns are deliberately blank.

Each step table includes one full source cycle, the complete bridge, and one full target cycle.
`left_anchor_body` and `right_anchor_body` are Mel-compiler-resolved body-relative hand positions.
The observer columns mirror the horizontal coordinate after facing changes to 180 degrees.

`model_status=valid` means the current discrete model accepts the route. It does not mean the route
is comfortable or physically verified. Circle extensions remain unresolved hypotheses unless the
whole route is an exact verified control.

To reproduce the batch in another directory:

```sh
pnpm generate:mel-turning-review -- --output /path/to/review-directory
```

The generator refuses to overwrite existing CSVs by default. Preserve completed annotations before
using `--force`.
