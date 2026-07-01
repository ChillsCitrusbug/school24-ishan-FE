# school24-ishan-FE

School24 frontend — React + TypeScript + Vite. Consumes the shared Tailwind
theme and approved components from the sibling `school24-DESIGN/` repo; see
`agents/frontend.md` and `agents/design-handoff.md` in the workspace root
for the architecture and hand-off rules.

This repo is currently at **scaffold state**: structure, config, and
dependency manifests only. No feature screens exist yet — those land
per-ticket via the dev-kit flow (`prompts/_inject-ui-spec.md`).

## Setup

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL
```

## Run

```bash
npm run dev        # start the Vite dev server
npm run build       # typecheck + production build
npm run preview     # preview the production build
```

## Verify

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest run --coverage (80% threshold, passWithNoTests)
npm run test:visual  # playwright e2e / visual-regression
```

## Structure

Atomic design (`atoms` → `molecules` → `organisms`), feature modules under
`src/features/<feature_name>/`, centralized API client in `src/api/`,
route table + guards in `src/routes/`. See `agents/frontend.md` for the
full structure contract.
