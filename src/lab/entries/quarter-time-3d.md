<div class="lab-entry-meta">
  <span>Experiment</span>
  <span>Quarter Time</span>
  <span>Atomic 3D</span>
  <span>2 May 2026</span>
</div>

<p class="lab-entry-kicker">Lab note 001</p>

# Quartertime 3d Explorations

In this document I aim to explore a few of the fundimental 3d quarter time patterns. I hope to build up the peices in a digestible way. Anti spun quarter time stall points are a relatively simple concept, which can build in to fun complex parts.

## Where are we going?

Before hitting you with a bunch of text lets start with a concrete demo to whet your appettite.

<PatternCell id="pasted-quarter-time" />

## Elements

Imagine a 4 petal diamond mode anti spin flower on the wall plane. At the apex of each petal (antilobe) you can make a stall point.

First what is quick reminder, we have same time and split time: when you are at the cardinals you are on the same axis. For example when your arms are both pointing up they're both on the vertical (same time), when they're both pointing to the right they're both on the horizontal (split time, or one pointing up one pointing down, both are now on the vertical axis and split.)

Quarter time instead is when, at the cardinals, your arms and poi are on different axis, creating a right angle between them. Ie, one hand point up the other right.

If you move a quarter your arms a quarter of a circle and end up again with your arms making a right angle, you've done quarter time! You can move in and out of all the timings and directions very easily once you become used to the quarter time stall points.

As with many things in poi, it's worth breaking it down into the most managable peaces. Below is an interactive demo of the quarter time stall elements. You can select the quarter arc you want to explore for each hand, and then see what same time looks like and what quarter time looks like. You don't need to practice all of these at the start, but you will eventually come back to them. Also, the stalls from bottom are always hard, and just take practice.

<QuarterTimeExplorer />

## Personal notes

- Same time: the movement starts or resolves with both hands sharing an axis.
- Quarter time: the movement starts and resolves with the hands on different axes.
- can we actually make a stall point with any anti spin? From reading Zaltymbunk's cap math document I realised that we get much cleaner stall points if we reduce the length of the tether relative to the arm span.
- We probably need to go through and start mapping what actually constitutes a stall.

## What's actually next what are we doing here?

- Okay next I want to make a component with elementary quarter time quarters. In forward there should be x: ie wall plane, 0 to 90, 90 to 180, 180 to 270 and 270 to 0. In wheel and floor lets only have the forward facing ones.
- I want a selector which can generate the sequence for the visualiser. The user gets to select which plane and which quarter they want per hand, and the vis will show it. Interactive demo style for an intro to 3d.
- we can make the actual cavas smaller so it doesn't take up soooo much space. Custom components are nice :) should be a cool experiment to see what we can do as a learning place
