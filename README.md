# Poi Phase Visualiser

A Vue 3 + TypeScript web app for visualizing poi wall-plane phase relationships (arm rotation + relative poi rotation).

## Status

This repository currently contains **Phase 1 and Phase 2** of the implementation plan:

- Project scaffold (Vite, Vue, Tailwind, Vitest, GitHub Pages workflow)
- Typed state schema and defaults from `spec.md`
- Preset parameter contracts (elements + flower presets)
- Initial tests for defaults and preset behavior

Engine math, canvas rendering, playback loop, trails, waveform plotting, and full fixture sampling are not yet implemented.

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- Vitest

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run test` - run Vitest suite once
- `npm run test:watch` - run Vitest in watch mode
- `npm run gen:fixtures` - generate the current fixture manifest scaffold

## Project Layout

```text
.
├── .github/workflows/deploy-pages.yml
├── fixtures/manifest.json
├── scripts/gen-fixtures.ts
├── src
│   ├── App.vue
│   ├── main.ts
│   ├── style.css
│   ├── state
│   │   ├── constants.ts
│   │   ├── defaults.ts
│   │   └── presets.ts
│   └── types/state.ts
├── tests/state
│   ├── defaults.test.ts
│   └── presets.test.ts
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Spec

Primary requirements are documented in [`spec.md`](./spec.md).

## Notes

If your machine has npm cache permission issues, use:

```bash
npm install --cache .npm-cache
```
