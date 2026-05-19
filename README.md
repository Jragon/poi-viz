# poi-v2 segmentation-first poi visualizer

TypeScript scaffold for a V2 poi segmentation-first engine and visualizer experiments.

## Scope

- Engine behavior remains deterministic and test-first; UI/lab surfaces are visual adapters over engine output
- Current engine evaluation is local 2D motion with atomic plane metadata
- Generic plane-side metadata is preserved by the engine for later body-tracing work
- Two-node chain: hand -> head
- Atomic plane breaks support `wall`, `wheel`, and `floor` with projected Canvas output and a narrow Three.js debug visualizer

## Commands

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
