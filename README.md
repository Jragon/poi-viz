# poi-v2 segmentation-first poi visualizer

TypeScript and Vue application for a segmentation-first poi engine, authoring tools, visualizers, and lab experiments.

## Scope

- Built-in engine drivers are deterministic and test-first; UI and lab surfaces consume engine output rather than redefining its motion semantics
- Current engine evaluation is local 2D motion with atomic plane metadata
- Generic plane-side metadata is preserved by the engine for later body-tracing work
- Two-node chain: hand -> head
- Atomic plane breaks support `wall`, `wheel`, and `floor` with projected Canvas output and a narrow Three.js debug visualizer
- Runtime drivers are an explicitly unsafe flexibility escape hatch for lab evaluation; their output, purity, exceptions, and determinism are caller-owned

See [Repository Architecture](docs/ARCHITECTURE.md) for dependency boundaries and [Boundary-Explicit Sequence Model](docs/BOUNDARY_EXPLICIT_SEQUENCE_MODEL.md) for the engine execution contract.

## Prerequisites

- Node.js 22 (also pinned in `.node-version`)
- pnpm 10.34.5 (pinned by `packageManager` in `package.json`)

Install a clean checkout reproducibly with:

```sh
corepack pnpm install --frozen-lockfile
```

## Commands

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck` — runs `vue-tsc`, covering TypeScript and Vue single-file components

CI runs frozen install, lint, Vue-aware typecheck, tests, and build on pull requests and pushes to `main`.
