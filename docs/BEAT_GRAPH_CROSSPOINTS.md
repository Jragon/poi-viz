# Beat-graph crosspoints

Beat-graph rows are the authored source of truth. Crosspoints are compiler-derived facts on the
cyclic interval between adjacent rows; they are not extra graph rows and they do not contain
visualizer plane offsets.

## Plane-side transition invariant

An interval whose resolved row sides differ has one plane-side transition:

- the transition starts on `fromSide`;
- its crosspoint is exactly at interval progress `0.5`;
- depth is zero at the crosspoint and the semantic state is `crossing`;
- it finishes on `toSide`.

Plane A/B display widths belong to the visualizer. With unequal widths, display depth follows two
linear pieces pinned through source depth, zero at `0.5`, and destination depth. The compiler's
crosspoint and legality do not change when those widths change.

## Legality

Crosspoint legality is symbolic and independent of avatar proportions:

- `x < 0` resolves to the left body gate and requires the poi to point left;
- `x > 0` resolves to the right body gate and requires the poi to point right;
- `x = 0` is not a legal plane-side crosspoint;
- high-to-high resolves high, low-to-low resolves low, and a direct high-to-low or low-to-high
  transition resolves mid.

The compiler reports `CENTERLINE_CROSSPOINT` or `POI_POINTS_THROUGH_BODY` without correcting the
graph. Structural compilation diagnostics remain separate so experiments can preview and inspect an
illegal graph.

## Single-hand wrap oracle

Wrap legality is tested per hand. Two-hand combinations and visualizer offsets are not part of the
oracle. Each family is checked for left/right hands and inward/outward flow.

| Family                       | Pair                             | Expected crosspoint levels |
| ---------------------------- | -------------------------------- | -------------------------- |
| Low horizontal               | low-native / low-non-native      | low, low, low, low         |
| High horizontal              | high-native / high-non-native    | high, high, high, high     |
| Diagonal down                | high-native / low-non-native     | high, low, low, high       |
| Diagonal up                  | low-native / high-non-native     | low, high, high, low       |
| Vertical native, inward      | high-native / low-native         | low, high                  |
| Vertical native, outward     | high-native / low-native         | high, low                  |
| Vertical non-native, inward  | high-non-native / low-non-native | high, low                  |
| Vertical non-native, outward | high-non-native / low-non-native | low, high                  |
| High BTB                     | high-native / high-back          | high, high, high, high     |
| Low BTB                      | low-native / low-back            | low, low, low, low         |

The exact interval, side direction, body gate, level, and poi direction are encoded in
`wrapCrosspointOracle.test.ts`. Reversing a valid pair must keep all crosspoints legal. Cycle
rotation is not a distinct semantic case; the closing last-to-first interval is tested as part of
every cyclic track.

The first legality pass found that outward vertical non-native wraps used outward row ordering with
inward poi rotation. The generator now resolves the requested outward directions directly instead of
flipping only the row template.

## Single-hand reel oracle

Reels have two side-changing intervals. Inward/outward flow changes the poi's rotation direction,
while the derived initial phase keeps both crosspoints outward on the selected body gate.

| Reel position   | Left-hand gate | Right-hand gate | Level | Side motion |
| --------------- | -------------- | --------------- | ----- | ----------- |
| High native     | left           | right           | high  | B→A, A→B    |
| Low native      | left           | right           | low   | B→A, A→B    |
| High non-native | right          | left            | high  | B→A, A→B    |
| Low non-native  | right          | left            | low   | B→A, A→B    |
| High back       | right          | left            | high  | A→B, B→A    |
| Low back        | right          | left            | low   | A→B, B→A    |

The oracle validates left and right hands separately for both inward and outward flow. Two-hand
combinations and cycle offsets are not separate legality cases.
