# Fusion Fuse

This directory contains experimental Resolve/Fusion Fuse tools for the poi trail workflow.

## Current file

- `PoiTrailFuse.fuse`: first scaffold for a mask-driven poi trail tool

The current version is intentionally narrow:

- registers a custom tool called `Poi Trail Fuse`
- exposes `Source` and `Mask` image inputs
- samples prior `Source` and `Mask` frames using the current timeline time
- accumulates masked source pixels internally with fade
- composites the trail back over the current `Source`
- can preview the `Mask` input to verify graph wiring

It is still an early version. The accumulation rule is intentionally simple and may need tuning once it is exercised inside Resolve on more clips.

## Install locally

Create a symlink from the file in this repo to your user Fuses directory:

```bash
mkdir -p "$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/Fusion/Fuses"
ln -sf \
  "/Users/rory/code/notwork/poi-v2/experiments/cv/fuse/PoiTrailFuse.fuse" \
  "$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/Fusion/Fuses/PoiTrailFuse.fuse"
```

Then restart Resolve.

After the first install, the SDK notes that editing and reloading can be done on the fly without restarting the application.

## Usage

In Fusion, add the tool with `Shift+Space` and search for `Poi Trail Fuse`.

Current graph options:

```text
MediaIn1 -> PoiTrailFuse1 -> MediaOut1
```

or, with mask preview validation:

```text
MediaIn1 -----------------> PoiTrailFuse1 -> MediaOut1
        \
         -> your mask tree -> PoiTrailFuse1.Mask
```

If `Preview Mask` is enabled and the `Mask` input is connected, the tool outputs the mask image instead of the source image.

## Inspector controls

- `Preview Mask`: bypasses the effect and outputs the incoming mask image
- `Mask Gain`: scales the incoming mask before it is used as the temporal blend map
- `Trail Frames`: number of past frames sampled, including the current frame
- `Fade`: per-step trail decay before the next masked frame is merged in
- `Base Mix`: brightness multiplier applied to the current source image
- `Trail Mix`: brightness multiplier applied to the accumulated trail image

## Intended next step

The target design is still the same:

- Fusion builds the mask
- the Fuse samples prior `Source` and `Mask` frames
- masked source pixels are accumulated internally with fade
- the Fuse eventually outputs either a trail composite or a trail-only image

That should keep the visible Fusion graph small while preserving masking flexibility.
