# gform-react — Agent Guidelines

This is the entry point for any contributor (human or AI agent) working on this repository.

---

## Project Overview

**gform-react** is a lightweight, dependency-free **React form library** published to npm. It provides
generic, type-safe form building with native HTML constraint validation, custom/async validators,
dynamic fields, file inputs, native `<form>`/Server-Action submission, and a React Native build.

This repo **is the library itself** — not an app that consumes it. There is **no backend** and
**no application UI**; everything here is library source, its build tooling, tests, and a local
example playground.

**Tech Stack**

- **Language:** TypeScript (strict `tsc --noEmit`)
- **Runtime target:** React `>=18.0.0` (peer dependency — the form store is built on `useSyncExternalStore`), plus a separate React Native entry (`./native`)
- **Build:** Rollup → dual CJS + ESM output, tree-shakable, with dev/prod conditional exports
- **Tests:** Jest + `@testing-library/react` + `jest-environment-jsdom`, run via `npm test`
- **Lint:** ESLint (flat config) — 4-space indent, semicolons required
- **No application frameworks** — no Next.js, Redux, i18n, or HTTP/service layer live here.

**Key Directories**

- `src/` — library source. Public API is re-exported from [`src/index.ts`](../src/index.ts).
  - `src/fields/` — `GInput` / `RNGInput`
  - `src/validations/` — `GValidator`
  - Core: `GForm.tsx`, `RNGForm.tsx`, `form.ts`, `state.ts`, `selectors.ts`, `form-context.tsx`, `helpers.ts`
  - Tests are colocated as `*.test.tsx` next to the source file.
- `example/` — local playground apps (base / MUI / PrimeReact / RN) used during `npm run dev`.
- `dist/`, `native/` — build output (generated; never edit by hand).

For the full source layout and conventions, see [`project.md`](project.md).

---

## Rules

Before starting a task, open the relevant file(s).

| Situation | Read |
|---|---|
| Any response to the user | [`rules/communication.md`](rules/communication.md) |
| Writing or changing any code | [`rules/coding-rules.md`](rules/coding-rules.md), [`rules/namings.md`](rules/namings.md) |
| Naming a new file or identifier | [`rules/namings.md`](rules/namings.md) |
| Touching the public form API | [`rules/forms.md`](rules/forms.md) |
| Starting a multi-step task | [`rules/task-workflow.md`](rules/task-workflow.md) |
| Adding or modifying tests | [`rules/test.md`](rules/test.md) |
| Questions about the source layout / build | [`project.md`](project.md) |

> This is a frontend-only package — there is no backend, so the rules are not split by stack.

---

## Task Management

- For **planning and execution logs** (`plan.md`, `progress.md`) on multi-step tasks, follow
  [`rules/task-workflow.md`](rules/task-workflow.md) — it is the single source of truth for where
  those files live and how to maintain them.

---

## General Guidelines

- This is a published package: treat the public API (everything exported from
  [`src/index.ts`](../src/index.ts)) as a stable contract. A breaking change requires a matching
  `changelog.md` entry, a version bump, and updated `README.md`/example coverage.
- Keep the bundle small and tree-shakable — avoid adding runtime dependencies.
- Every change must keep `npm run prebuild` green (`tscheck` → `lint` → `security:check` → `test`).
- Maintain parity between the web (`GForm`/`GInput`) and React Native (`RNGForm`/`RNGInput`) paths
  when a change affects shared behavior.
