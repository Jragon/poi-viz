<div class="lab-entry-meta">
  <span>Blog</span>
  <span>Quarter Time</span>
  <span>Timing / Direction</span>
  <span>16 Jul 2026</span>
</div>

<p class="lab-entry-kicker">L L L L L L L L</p>

# Exploring _all_ the timing and directions

## The timings we already know

Clasically we're taught about two different timing modes. _Same / Together_ time and _Split_ time. Same and split are ways of describing the phase relationship between the two poi through a sequence. Though we do technically need to bring in direction here too now since same time / split time means something different depending on the directions of the poi.

Lets just deal with the cases where the poi are travelling in the same direction (ie both clockwise, or both counter-clockwise.) Same time same direction means that the poi's phase is the same throughout, ie when one poi is at 90 deg, so is the other, and they continue locked together like this.

Split time same direction means that throughout the move the two poi are always 180 degrees apart. ie when one poi is pointing up the other is pointing down. So their phase offset is 180 degrees.

In opposite directions the phase relationship changes a little. We now define what split and same time means in opposites, and it's a little more arbitrary.

Same time opposites means that at the bottom and top of the circles both poi are together. so when one poi is pointing up the other one is also. However since they're both travelling in opposite directions when we get to the the horiziontal axis, one poi will be pointing left and one will be pointing right.

Note to self: we should make a little phase offset diagram for the timing and directions.

In split time opposites, we have a similar relationship except the whole thing is rotated 90 degrees. So they meet on the sides and are split when up and down.

So the main reasoning for this relationship is how we feel the poi. When we're making a circle with a poi we feel the bottom of the swing the most. We also call the bottom of a swing in poi a _beat_. In same time the beat of both poi happens at the same time - ie the down swing of the poi is happening at the same time. In split time the down beat is separated by 180 degrees.

This is a really important realisation and it completely changes the way a pattern feels. Same time patterns feel quite slow - they're like using whole notes in music. Split time patterns almost double the feeling of speed, now you've got quarter notes - 1 + 2 + 3 + 4 + .... but the poi themselves are going at the same speed as they were before.

I guess the best way to define split and same time is really with the idea of the beat. Then we can use the phase offset as another way to look at it on top afterwards.

<LabFigure id="familiar-timing" width="wide">
  <template #title>Familiar timing</template>
  <FamiliarTimingFigure />
  <template #caption>
    Same time aligns the two downbeats. Split time places them half a cycle apart. Direction changes how the relationship appears on the wall plane.
  </template>
</LabFigure>

## Timing as an offset

Okay so what other timings exist? We can have pretty much any poi offset and call it a timing right, as long as we keep it consistent.

<!-- TODO Rory: hold one cycle fixed, shift the other, introduce 0/4, 1/4, 2/4, 3/4 and handedness. -->

<LabFigure id="offset-waves" width="wide">
  <template #title>Offset waves</template>
  <OffsetWavesFigure />
  <template #caption>
    Moving one poi phase around the cycle produces four quarter-step relationships. Same and split are two points in the same offset cycle.
  </template>
</LabFigure>

<LabFigure id="handed-quarter-timing" width="wide">
  <template #title>Handed quarter timing</template>
  <HandedQuarterTimingFigure />
  <template #caption>
    The two quarter offsets are mirror forms. Swapping the hands exchanges them, while same and split remain unchanged.
  </template>
</LabFigure>

## The same pattern through different lenses

<!-- TODO Rory: discuss choosing useful relationships and events without declaring one canonical feeling. -->

## Quarter-time stall graphs

<!-- TODO Rory: explain that the columns are synchronized quarter-step or stall checkpoints, and explain track shifting. -->

Use the below pattern galary to see the different timings possible using the simple 4 petal diamond mode anti spin.

<StallPatternGallery :patterns="wallPlaneAntispinsSameDirection" compact />

And below here we have the two timing and directions in opposites.
<StallPatternGallery :patterns="wallPlaneAntispinsOppositesDirection" compact />

## Outside the wall plane

<!-- TODO Rory: establish that complete loops may change planes and different routes can preserve an Infinite-L relationship. -->

## Other offsets

<!-- TODO Rory: decide whether continuous offsets and relationship loops belong in the main article or an expandable aside. -->

## Timing in 3d

<!-- TODO Rory: write the short authored bridge to the 3D article; do not duplicate the 3D explanation here. -->

<RouterLink to="/lab/quarter-time-3d">Quarter time in 3D</RouterLink>

## Polyryhtms / hybrid timings

There are many patterns where one poi will be travelling faster than the other - most classic is the triquetra vs extension. The poi making the triquetra has to travel twice as fast. And as such the timing is constantly changing. You can use this fact to neatly transition between timings. Ie at the top of the pattern it's in same opps, and ad the bottom it's in split opps.

<!-- TODO Rory: expand the changing-relative-timing example when you are ready; retain the triquetra/extension idea. -->

<script setup>
import {
  FamiliarTimingFigure,
  HandedQuarterTimingFigure,
  LabFigure,
  OffsetWavesFigure,
} from "@/lab/components/figures";
import StallPatternGallery from "./StallPatternGallery.vue";

const wallPlaneAntispinsSameDirection = [
  { codec: "q1.4.URDL.URDL", label: "Same time" },
  { codec: "q1.4.RDLU.URDL", label: "Quarter offset" },
  { codec: "q1.4.DLUR.URDL", label: "Half offset" },
  { codec: "q1.4.LURD.URDL", label: "Three-quarter offset" },
];

const wallPlaneAntispinsOppositesDirection = [
  { codec: "q1.4.ULDR.URDL", label: "Same time opposites" },
  { codec: "q1.4.RULD.URDL", label: "Quarter offset opposites" },
  { codec: "q1.4.DRUL.URDL", label: "Split time opposites" },
  { codec: "q1.4.LDRU.URDL", label: "Three-quarter offset opposites" },
];

const atomicAntispinsWheelWall = [
  { codec: "q1.4.UFDB.URDL", label: "Same L" },
  { codec: "q1.4.BUFD.URDL", label: "Infinite L" },
  { codec: "q1.4.DBUF.URDL", label: "Split L" },
  { codec: "q1.4.FDBU.URDL", label: "Infinite L" },
];


const atomicAntispinsWheelFloor = [
  { codec: "q1.4.UFDB.LFRB", label: "Same L" },
  { codec: "q1.4.BUFD.LFRB", label: "Infinite L" },
  { codec: "q1.4.DBUF.LFRB", label: "Split L" },
  { codec: "q1.4.FDBU.LFRB", label: "Infinite L" },
];
</script>
