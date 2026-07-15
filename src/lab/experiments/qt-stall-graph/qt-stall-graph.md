<div class="lab-entry-meta">
  <span>Experiment</span>
  <span>Quarter Time</span>
  <span>Stall Graph</span>
  <span>15 Jul 2026</span>
</div>

<p class="lab-entry-kicker">Lab note 002</p>

# Antispin Quarter-Time Stall Graph

A compact looping notation for 3D antispin quarter-time flowers and stall patterns.

In the default horizontal view, time runs left to right like a short line of music. Each column is a beat and each row is one cardinal direction (F U R D L B — the six axes of the sphere). Cyan marks are the left hand; pink marks are the right. The vertical view carries the same information with the axes swapped.

Adjacent marks define one quarter arc. The plane the poi travels in is uniquely determined by the pair of cardinals, so the notation does not need a separate plane field.

<StallGraphEditor />

## Editing and sharing

- Click a cardinal at a beat to set it; click the same point again to clear it.
- Offset either hand earlier or later to inspect phase relationships.
- Move the cycle start without changing the relationship between the hands.
- Add or remove beats and switch between the horizontal and vertical views.
- Every edit is encoded in the page URL as a compact codec such as `q1.4.URDL.RDLU`.

The codec is the pattern definition. It does not require a name or a separate database record: `q1` is the codec version, `4` is the number of beats, then the left- and right-hand tracks follow. `_` is an unfinished beat and `-` means that hand is absent.

## Codec-backed article patterns

An article can keep a small local registry of codec strings. The full-pattern graph remains recognizable at thumbnail size, so the same renderer works as a selector. Selecting a thumbnail below drives one shared live preview; **Edit** opens that exact codec in the editor.

<StallPatternGallery :codecs="articlePatterns" />

## Cardinal → plane lookup

| Transition                 | Plane |
| -------------------------- | ----- |
| U ↔ R, U ↔ L, D ↔ R, D ↔ L | Wall  |
| U ↔ F, U ↔ B, D ↔ F, D ↔ B | Wheel |
| L ↔ F, L ↔ B, R ↔ F, R ↔ B | Floor |

Opposite pairs (U–D, L–R, F–B) are illegal because they describe a half-circle rather than a quarter-circle. The editor reports these transitions and does not silently correct them.

<script setup>
import StallGraphEditor from "./StallGraphEditor.vue";
import StallPatternGallery from "./StallPatternGallery.vue";

const articlePatterns = [
  "q1.4.URDL.RDLU",
  "q1.4.URDL.DLUR",
  "q1.4.FUBD.UBDF",
  "q1.8.URDLURDL.RDLURDLU",
  `q1.24.${"URDL".repeat(6)}.${"RDLU".repeat(6)}`
];
</script>
