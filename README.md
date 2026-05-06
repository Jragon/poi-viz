# poi-v2 segmentation-first engine experiment

Minimal TypeScript-only scaffold for a V2 poi segmentation-first engine.

## Scope

- Engine-only (no UI, generators, rendering, or solver)
- Current engine evaluation is local 2D motion with atomic plane metadata
- Generic plane-side metadata is preserved by the engine for later body-tracing work
- Two-node chain: hand -> head
- Atomic plane breaks support `wall`, `wheel`, and `floor` with projected Canvas output

## Commands

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
