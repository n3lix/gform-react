# Testing Guidelines

> These rules apply to **all code** in this repository.

---

## Tooling (installed and in use)

- **Jest** + **`@testing-library/react`** + **`jest-environment-jsdom`**.
- Config: `jest.config.js` (jsdom env, `babel-jest` transform, `jest.setup.js` for
  `@testing-library/jest-dom` matchers).
- Run with **`npm test`** (also runs in `npm run prebuild` before any publish build).

---

## 1. General Philosophy
- No change is considered complete without corresponding tests for its logic.
- Tests should cover both "happy paths" and edge cases.
- Aim for high confidence rather than just high percentage coverage.
- The suite must stay green.

## 2. Test Types

### Unit Tests
- **Scope:** Individual functions, helpers, validators, and selectors (`GValidator`, `selectors`,
  `helpers`, etc.).
- **Goal:** Ensure logic is correct in isolation.
- **Requirement:** Every new helper/validator/selector path must have a unit test.

### Component / Integration Tests
- **Scope:** `GForm` / `GInput` (and the RN variants) plus the hooks/selectors that drive them —
  multiple modules working together through the public API.
- **Goal:** Verify the public behavior consumers rely on (submission gating, serialization, dynamic
  fields, validity, optimized mode) end to end.

## 3. Best Practices
- **Naming:** Test files follow `[TargetName].test.tsx`.
- **Location:** **Colocate** the test next to the file under test (e.g. `src/GForm.test.tsx`,
  `src/fields/GInput.test.tsx`, `src/validations/GValidator.test.tsx`). This repo does **not** use a
  `__tests__/` folder.
- **Accessibility:** Query the way users interact — by role or label, not by class name. This also
  exercises the library's automatic `aria-*` wiring.
- **Mocks / async / timers:** Mock external dependencies; use fake timers for debounce; `await`
  `findBy*`/`waitFor` for async validators.
- **Web/RN parity:** When a behavior is shared, cover it for both paths where practical.
- **Coverage:** Cover core logic, negative scenarios (invalid input), and key edge cases.

## 4. What to cover for form behavior
Mirror the existing `GForm` suite: submission gating (invalid forms don't submit), `toRawData()` /
`toFormData()` serialization, `onInit`/`stateRef`, validity flags, dynamic add/remove of fields,
optimized mode, and initial-value validation (errors on first paint + native validity sync).
