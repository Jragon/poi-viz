# Solver review 001

> **Superseded sampling experiment.** This broad diversity pack is retained as generator history,
> but it is not the next physical-review input. Use
> [`../low-weave-opposite-review-001/workbench.json`](../low-weave-opposite-review-001/workbench.json)
> for the focused opposite-direction left low-weave review.

> **Status: superseded without review, generated 2026-07-30.**

This is the first deterministic review pack from the low-reel preparation/turn/recovery solver. It
contains 16 complete finite sequences:

- cases 01–04 are physically verified controls;
- cases 05–16 are six paired comparisons with identical endpoints inside each pair;
- the batch covers TO, SO, TS, and SS timing, both body-turn directions, mill and weave endpoints,
  and direct, preparation, recovery, and combined route shapes.

Import [`workbench.json`](workbench.json) into the Turning Pattern Verifier at
`/lab/mel-turning/review`. Review one complete route at a time and record one outcome:
`possible`, `not-possible`, or `inconclusive`. The notes field is deliberately freeform so it can
capture whatever matters for that particular pattern without treating skill, familiarity, or body
semantics as structured movement properties.

Notation edits are stored beside the immutable generated route. The workbench can change compact
locations, A/B side, phase, continuation kind, row count, and the selected turn boundary. It does
not modify solver output in place or promote a review into runtime evidence.

[`cases.csv`](cases.csv) and [`steps.csv`](steps.csv) are read-only diagnostic projections for
inspection or external analysis. Review state belongs in the exported JSON artifact.

Each step table includes one full source cycle, the complete bridge, and one full target cycle.
`left_anchor_body` and `right_anchor_body` are Mel-compiler-resolved body-relative hand positions.
The observer columns mirror the horizontal coordinate after facing changes to 180 degrees.

`model_status=valid` means the current discrete model accepts the route. It does not mean the route
is physically verified. Circle extensions remain unresolved hypotheses unless the whole route is
an exact verified control.

To reproduce the batch in another directory:

```sh
pnpm generate:mel-turning-review -- --output /path/to/review-directory
```

The generator refuses to overwrite existing batch files by default. Export and preserve reviewed
JSON before using `--force` on a directory that also contains generated input.
