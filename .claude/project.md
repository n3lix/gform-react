# Project Layout — gform-react

> The source layout, build, and test setup for the library. Extends [`guidelines.md`](guidelines.md).

This is a **single-package React form library**. There is no app, no routing, no backend — just the
library source, its dual-target build, tests, and a local example playground.

---

## Tech Stack

**Follow `package.json` for exact versions.**

- **TypeScript** — strict type-check via `npm run tscheck` (`tsc --noEmit`).
- **React** `>=18.0.0` is a **peer dependency** (the form store relies on `useSyncExternalStore`,
  introduced in React 18). A separate **React Native** entry is published under `gform-react/native`.
- **Rollup** builds dual **CJS** (`dist/cjs`) + **ESM** (`dist/esm`) output, plus the `native/` build.
  Output is tree-shakable (`"sideEffects": false`) with dev/prod conditional `exports`.
- **ESLint** (flat config, `eslint.config.js`) — `npm run lint`.
- **Jest** + `@testing-library/react` + `jest-environment-jsdom` — `npm test`.

---

## Source layout (`src/`)

```
src/
  index.ts            ← public API barrel (the package's export surface)
  GForm.tsx           ← web form component
  RNGForm.tsx         ← React Native form component
  form.ts             ← form store / core logic
  state.ts            ← GFormState / RNGFormState (form state shape)
  selectors.ts        ← field selection / fetchDeps logic
  form-context.tsx    ← context + useFormSelector
  useFormHandlers.ts  ← shared handlers hook
  helpers.ts          ← internal helpers (_buildFormState, _merge, …)
  fields/
    GInput.tsx        ← web input
    RNGInput.tsx      ← React Native input
    index.ts          ← field exports / types
  validations/
    GValidator.ts     ← validator builder
    index.ts          ← validation exports
  rn/                 ← React Native entry/package shim
```

Notes:
- **Web vs React Native parity:** most behavior is shared. When you change shared logic, update both
  the `G*` (web) and `RN*` (native) paths and keep their behavior in sync.
- The **public API** is exactly what `src/index.ts` re-exports. Anything not exported there is
  internal and may change freely.

---

## Tests

- A test runner **is installed and in use** — Jest + React Testing Library (jsdom).
- Tests are **colocated** next to the file under test as `*.test.tsx` (e.g.
  `src/GForm.test.tsx`, `src/fields/GInput.test.tsx`, `src/validations/GValidator.test.tsx`).
  There is **no** `__tests__/` folder convention in this repo.
- Run with `npm test`. Tests also run as part of `npm run prebuild` before any publish build.

See [`rules/test.md`](rules/test.md) for testing conventions.

---

## Build & scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch build + live example server (base example) |
| `npm run debug` / `npm run strict` | Dev server with debug / StrictMode example modes |
| `npm test` | Run the Jest suite |
| `npm run lint` / `lint:fix` | ESLint over `src` |
| `npm run tscheck` | Type-check only (`tsc --noEmit`) |
| `npm run build` | Clean + dev + prod Rollup builds (CJS/ESM + native) |
| `npm run prebuild` | `tscheck` → `lint` → `security:check` → `test` (gate before build) |

`dist/` and `native/` are **generated** — never edit them by hand.
