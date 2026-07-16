<div class="lab-entry-meta">
  <span>Blog</span>
  <span>Quarter Time</span>
  <span>Timing / Direction</span>
  <span>16 Jul 2026</span>
</div>

<p class="lab-entry-kicker">L L L L L L L L</p>

# Exploring timing on the wall plane

## The timings we already know

A lot of poi has to do with the way the two rotating objects relate to each other. Clasically there are two variables to play with - timing, and direction. There two timings, **same / together** and **split**, and two directions, **same** and **opposite** direction.

In poi we usually count and feel down swings, this is the point in a poi's circle with the most force and feeling on it. When we're playing to music we may be syncing the down beat of the poi to the beat of the track. Likewise our definitions of timing are based on this reference.

- **Same time** is where the poi heads go past the bottom together at the same time (or go past the top at the same time.)
- **Split time** is where the one poi head goes past the bottom whilst the other poi head us up.

The <LabFigureRef figureId="familiar-timing">illustration below</LabFigureRef> shows the four combinations of timing and direction.

<LabFigure id="familiar-timing" width="wide">
  <template #title>Familiar timing</template>
  <FamiliarTimingFigure />
  <template #caption>
    Same time aligns the two downbeats. Split time places them half a cycle apart.
  </template>
</LabFigure>

## Timing as an offset

Okay so what other timings exist? We can have pretty much any poi offset and call it a timing right, as long as we keep it consistent.

Before, we were thinking about when the poi goes past the bottom of the circle. When they go past the bottom together they're in same time. In split time one poi goes through the bottom and then half a cycle later the next poi goes past the botttom. We could say that in split time one poi is offset by half a cycle.

If we take the sine component from the poi (the up and down, check Drex's math paper for more nerdiness) and plot it for same time, we have two over lapping waves, they're at the bottom together and ad the top together. If we now hold one wave steady (say left hand) and offset the right hand wave by half a cycle we'll get split time. When left id down, right is up, and when right is down left is up.

So what happens if we try other offsets too? In <LabFigureRef figureId="familiar-timing">this figure</LabFigureRef> I show what happens when we offset by one quarter of a cycle each time (one quarter phase offset).

<!-- NOTE TO AI: Remove the down beat graph not needed. -->
<!-- FROM AI: Done in the figure code. The separate downbeat timeline repeated the bottom markers already visible on the waves, so the four panels now keep only the waves. -->

<LabFigure id="offset-waves" width="wide">
  <template #title>Offset waves</template>
  <OffsetWavesFigure />
  <template #caption>
    Moving one poi phase around the cycle produces four quarter-step relationships. Same and split are two points in the same offset cycle.
  </template>
</LabFigure>

So, what do we have here? More timings! Here we've discovered two timings, they are the two quarter timings. **Right + 1/4**, ie right hand is 1/4 of a cycle in front of left and **Left + 1/4**. You can also think of it as right leading or left leading, though that can get a little confusing when the hands aren't actually following each other ...

Now obvoiusly you could offset by fraction of a cycle that you like. Quarters are particularly nice though as they map well on to our cardinal system and are generally visually appealing. I have not explored other timings as of yet.

<!-- (NOTE TO AI: what other math's benefits to quarters?)

Note to AI: the handed-quarter-timing diagram I'm not sure I fully understand. It's useful though to show the circles. I think perhaps this next figure should be a little interactive one, which can choose direction, and then timing offset, and it just shows the circles going round and round and the graph changing / moving. -->
<!-- FROM AI: Quarters are useful because a quarter turn is pi/2, sine and cosine land on the cardinal axes at each step, and four shifts form a closed cycle back to the start. The same quarter clock also lines up with the four cardinal checkpoints of the diamond antispin. A short explanation could say that 0, 1/4, 2/4 and 3/4 are not the only possible timings, but they are the cleanest discrete set because they map directly onto up, right, down and left. -->
<!-- FROM AI: The figure below is now the interactive version we discussed. It keeps one shared orbit and one wall-height graph, animates both from the same clock, and adds Same / R +1/4 / Split / L +1/4 plus Same direction / Opposite directions. R +1/4 means the right downbeat leads the left downbeat by a quarter cycle; L +1/4 means the reverse. Timing or direction changes restart the clock. The graph deliberately stays the same when direction changes while the route around the circle reverses, showing that direction is not part of timing. -->
<!-- FROM AI: A little maths explanation for the graph: it is one coordinate of the circle unfolded over time, not a different motion. If the poi angle is theta, its wall-plane position can be described with x = sin(theta) and y = cos(theta), depending on where zero is chosen. This graph plots only y, the vertical height. A quarter timing shift adds or subtracts pi/2 from theta, which slides the wave by one quarter of its period. Reversing direction changes theta to -theta, but the height trace is unchanged when it is anchored at the bottom because cos(-theta) = cos(theta). That is why the orbit can show direction while this graph only shows timing. The moving playhead and coloured dots make the practical link: at each instant, each graph dot is simply that poi's current height on the circle. -->

<LabFigure id="handed-quarter-timing" width="prose">
  <template #title>Handed quarter timing</template>
  <HandedQuarterTimingFigure />
  <template #caption>
    The two quarter offsets are mirror forms. Swapping the hands exchanges them, while same and split remain unchanged.
  </template>
</LabFigure>
<!-- FROM AI: Suggested replacement caption for you to add manually: "The circle and graph show the same motion. Timing changes when each poi reaches its downbeat; direction changes the route around the circle without changing this wall-height graph." -->
<!-- FROM AI: The title could also change from "Handed quarter timing" to "Orbit and wave timing" now that the figure teaches all four timings and both direction relationships rather than only the two handed quarter forms. -->

## The same pattern through different lenses

<!-- TODO Rory: discuss choosing useful relationships and events without declaring one canonical feeling. -->
<!-- FROM AI: I would remove or defer this section for now. The article has not introduced competing feelings yet, so it interrupts the move from timing offsets into antispin. It could become useful later when comparing downbeats, angular phase, cardinal checkpoints and physical feel as different views of one pattern. -->

<!-- note to ai: idk if we actually need this one yet since we haven't really introduced any feelings. -->
<!-- FROM AI: Agreed, not yet. Nothing in the current article needs this heading before the antispin section. -->

## Timing and anti spin flowers

<!--
NOTE TO AI: We don't actually need this it's in the next figure anyway...
<LabFigure id="stall-offset-cycle" width="wide">
  <template #title>The offset cycle</template>
  <StallOffsetCycleFigure />
  <template #caption>
    Each column is one quarter-step. Shifting one complete track by one column cycles through same, the two handed quarter relationships, and split.
  </template>
</LabFigure> -->
<!-- FROM AI: Agreed. Keep this removed: the timing and direction matrix below already contains the same four-step offset cycle and adds the useful live preview. -->

So who actually cares about static circles, we're here to talk about and do anti spins. Anti spins aren't anything more than a static circle who's center of rotation is rotated in the opposite direction to the spin of the poi. It makes those pretty flower patterns we all love. I'm not going to go too much into detail as I assume if you've made it to my nerdy blog you'll know what an anti spin is (if not check out some of Nick's videos on youtube he explains it nice :D)

We're all used to thinking of of diamond anti spins as having petals on the four cardinals (up right down left). With a 4 petal anti spin there is one petal on each cardinal. So every quart of a cycle the poi is pointing outwards in line with the arm. These points are important and probably warrent more discussion and termonology. Drex calls them anti lobes (lobe if inspin).

<!-- Note to AI: need to add some more detail here and get all the terms right and what not. -->
<!-- FROM AI: Important terminology correction for the later copy pass: lobe does not mean inspin and antilobe does not mean antispin. Drex defines a lobe as a region where the hand and poi velocity vectors are parallel in the same direction, and an antilobe as parallel in opposite directions. The outward tips of this familiar diamond antispin are antilobes. It is probably enough here to explain that the graph samples those four outward cardinal checkpoints; the full lobe/antilobe theory can stay in another article. -->

Anyway, so we have a cycle with four distinct parts. We can do that cycle with both hands. So we now have two cycles running next to each other - lets call this same time. Both poi are up, then right, then down, then left, then up, and so on. So if we offset the left poi by half a cycle what do we get? **Split** time! Wow, who would have thought. Now when right is up, left is down.

If we try the quarter offsets again we get the other two nice timings, which are Right +1/4 and Left +1/4. Have a play with the <LabFigureRef figureId="familiar-timing">toy below</LabFigureRef>, you can click on each of the graphs and see the little man do the anti spins.

It's probably worth quickly introducing the quarter stall graph idea: each of the 4 cardinals (plus front and back) are rows, then each column is one time unit. Each each column a circle on the row means that the poi will and arm will be pointing out at that cardinal. It can be used to describe all sorts of anti spin pattern (more on this later.) There's a more detailed post and the editor on another page. Click here to play with it. <!-- Note to AI: add a link to the stall graph page here. -->

<!-- FROM AI: The route is /lab/qt-stall-graph. Suggested markup for you to insert manually around the eventual link text: <RouterLink to="/lab/qt-stall-graph">quarter-time stall graph</RouterLink>. Also worth describing these as six cardinal directions and each column as one quarter-step or beat when you do the copy pass. -->

<LabFigure id="timing-direction-matrix" width="wide">
  <template #title>Timing and direction matrix</template>
  <TimingDirectionMatrixFigure />
  <template #caption>
    The same four offsets can be traversed with same or opposite directions. The graph also shows the order in which each track visits the cardinals.
  </template>
</LabFigure>
<!--
## Outside the wall plane -->

<!-- TODO Rory: establish that complete loops may change planes and different routes can preserve an Infinite-L relationship. -->
<!-- FROM AI: This is a useful setup for the 3D article rather than this wall-plane article. The key later point is that timing can remain a relationship between recurring events even when the two complete routes use different planes. -->
<!-- NOTE TO AI: I think all this should stay in the next article.  -->

<!--
<LabFigure id="mixed-plane-cycles" width="wide">
  <template #title>A cycle need not stay planar</template>
  <MixedPlaneCyclesFigure />
  <template #caption>
    A four-step loop need not stay in one plane. The first pair shares a route; the second follows different routes while retaining an Infinite-L relationship at each checkpoint.
  </template>
</LabFigure> -->
<!-- FROM AI: Agreed. Keep the mixed-plane cycle and Infinite-L discussion in the next article; the short link below is enough of a hand-off here. -->

## Timing in 3d

So what happens when things aren't all on the wall plane? It gets a bit weird, and is the topic of the next post here: <RouterLink to="/lab/quarter-time-3d">Timing in 3D</RouterLink>

## Polyryhtms / hybrid timings

<!-- FROM AI: I would either defer this whole section or frame it as changing timing in hybrids, not automatically as a polyrhythm. Unequal angular frequencies make the timing relationship move around the cycle. For the triquetra versus extension example, be precise later about which rotation is twice as fast and treat same-at-top / split-at-bottom as a chosen phase example rather than a rule for every version of the hybrid. -->

idk if I have anything to add here but it's worth thinking about. we're mainly talking about quarter timing atm

There are many patterns where one poi will be travelling faster than the other - most classic is the triquetra vs extension. The poi making the triquetra has to travel twice as fast. And as such the timing is constantly changing. You can use this fact to neatly transition between timings. Ie at the top of the pattern it's in same opps, and ad the bottom it's in split opps.

<script setup>
import {
  FamiliarTimingFigure,
  HandedQuarterTimingFigure,
  LabFigure,
  MixedPlaneCyclesFigure,
  OffsetWavesFigure,
  LabFigureRef
} from "@/lab/components/figures";
import StallOffsetCycleFigure from "./StallOffsetCycleFigure.vue";
import TimingDirectionMatrixFigure from "./TimingDirectionMatrixFigure.vue";

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
