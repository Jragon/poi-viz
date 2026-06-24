<div class="lab-entry-meta">
  <span>Experiment</span>
  <span>Quarter Time</span>
  <span>Stall Graph</span>
  <span>18 Jun 2026</span>
</div>

<p class="lab-entry-kicker">Lab note 002</p>

# Antispin Quarter-Time Stall Graph

A row-complete looping directed-graph notation for 3D antispin quarter-time flower and stall patterns.

Each **row** is a beat. Each **column** is a cardinal direction (F U R D L B — the six axes of the sphere). Mark where each hand stalls.

Adjacent marks define one quarter arc. The plane the poi travels in is uniquely determined by the pair of cardinals — no extra information needed.

<StallGraphEditor />

## How to read it

- **○** left hand · **×** right hand
- Each click sets (or clears) where that hand stalls on that beat
- Every played hand needs one mark on every beat row
- The arc between two consecutive marks is always a quarter-circle on the unique plane those two cardinals share
- At a stall, the hand, arm, and poi head are all colinear — pointing the same direction

## Cardinal → plane lookup

| Transition                 | Plane |
| -------------------------- | ----- |
| U ↔ R, U ↔ L, D ↔ R, D ↔ L | Wall  |
| U ↔ F, U ↔ B, D ↔ F, D ↔ B | Wheel |
| L ↔ F, L ↔ B, R ↔ F, R ↔ B | Floor |

Opposite pairs (U–D, L–R, F–B) are illegal — they would be a half-circle, not a quarter.

## Example: wall plane 4-petal flower (clockwise)

```
  F  U  R  D  L  B
     ○
        ○
           ○
              ○
```

Right hand traces U → R → D → L → (back to U).

## Example: mirrored wall flowers (same time)

```
  F  U  R  D  L  B
     ○×
        ×     ○
           ○×
        ○     ×
```

<script setup>
import StallGraphEditor from "./StallGraphEditor.vue";
</script>
