# VRM rig lab fixture

## Visual default: Aurora

`Aurora.vrm` is the lab's current visual default. Its embedded VRM 0.x metadata records:

- Title: Aurora
- Author: Polygonal Mind (`www.PolygonalMind.com`)
- Version: 1.0
- Licence: CC0
- Permitted users: everyone
- Commercial use: allowed

The checked-in file is the user-supplied binary with SHA-256
`9c205fb2b3188b6b37a7e089ee45a32f5602684929076fa71253fcd61f11151d`. It includes every humanoid
bone required by the standing adapter. The loader uses `three-vrm`'s normalized humanoid contract, so
the VRM 0.x asset does not introduce model-specific raw bone names into the solver.

## Regression fixture

`VRM1_Constraint_Twist_Sample.vrm` is copied from the official VRM
specification samples:

- Source: https://github.com/vrm-c/vrm-specification/tree/master/samples/VRM1_Constraint_Twist_Sample
- Copyright: (c) 2022 pixiv Inc.
- License: https://vrm.dev/licenses/1.0/

The embedded VRM 1.0 metadata permits avatar use by everyone, corporate
commercial use, redistribution, modification, and redistribution of modified
versions. Credit notation is marked unnecessary. The file is retained
unmodified as a deterministic lab fixture for humanoid loading, skinning, and
twist-constraint validation.

A replacement visual model must be exported as VRM 1.0 and provide normalized
humanoid mappings for hips, spine, chest, both shoulder/arm/hand chains, and
both upper-leg/lower-leg/foot chains. Keep this sample as the constraint and
loader regression fixture when changing the lab's visual default.
