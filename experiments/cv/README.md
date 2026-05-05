# CV Experiments

This folder is a notebook-first workspace for learning and prototyping a computer vision pipeline for poi videos.

The goal of the first slice is narrow:

- load video or synthetic frames
- inspect RGB / HSV / luma channels
- isolate bright poi-like signal with color and luminosity masks
- accumulate short histories into simple trail renders

It is deliberately separate from the main TypeScript app. Python stays here, and later exports can be consumed by TypeScript experiment scripts when the artifact shape is stable.

## Layout

- `notebooks/`: step-by-step notebooks
- `artifacts/`: tracked docs and notes about generated outputs
- `data/`: tracked notes about expected local input footage
- `fuse/`: experimental Resolve/Fusion Fuse files
- `.venv/`: local virtual environment (ignored)

## Environment setup

From the repo root:

```bash
/opt/homebrew/bin/python3 -m venv experiments/cv/.venv
source experiments/cv/.venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r experiments/cv/requirements.txt
python -m ipykernel install --user --name poi-v2-cv --display-name "Python (poi-v2-cv)"
```

In VS Code, select the kernel from `experiments/cv/.venv` or the installed `Python (poi-v2-cv)` kernel.

## First notebook

Start with `notebooks/01_toy_masks_and_trails.ipynb`.

It uses synthetic frames rather than a real poi video so the early pipeline stages are easy to inspect:

- two colored moving lights
- a dim body rectangle that occludes parts of the path
- HSV and luma masks
- simple temporal accumulation for trails

That gives you a baseline before you move to real footage in the next notebook.

## Notes

- Put local source clips under `data/raw/` if you want, but that directory is ignored.
- Generated PNGs and previews should go under `artifacts/generated/` and are ignored.
- Short-gap interpolation for trails disappearing behind the body is intentionally deferred until the raw mask and accumulation stages are understood.
