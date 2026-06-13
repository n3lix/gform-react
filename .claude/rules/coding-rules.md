# Coding Rules

> These rules apply to **all code** in this repository — a frontend-only React form library
> (TypeScript). For the public form API contract see [`forms.md`](forms.md).

---

# 1. General
- Always put `;` at the end of each statement (enforced by ESLint `semi: always`).
- Use 4 spaces for indentation (enforced by ESLint).
- Keep `npm run tscheck` and `npm run lint` clean — no new type or lint errors.

# 2. Core Principles
- Follow SOLID principles:
    - Single Responsibility
    - Open-Closed
    - Liskov Substitution
    - Interface Segregation
    - Dependency Inversion
- Always keep code DRY (don't repeat yourself) — extract shared logic into helpers/hooks.
- Always keep performance and efficiency in mind. This is a runtime form library: minimize
  re-renders, allocations, and work done during render.

# 3. Naming Conventions
- Follow naming conventions defined in [`namings.md`](namings.md).
- Use meaningful and descriptive names.

# 4. Public API
- The public API is exactly what [`src/index.ts`](../../src/index.ts) re-exports. Treat it as a
  stable contract.
- A breaking change to an exported symbol requires: a `changelog.md` entry, a version bump, and
  updated `README.md`/example coverage.
- Validate inputs at API boundaries; fail with clear, actionable error messages. Never swallow
  errors silently.

# 5. Dependencies & Security
- Avoid adding runtime dependencies — keep the package lightweight and tree-shakable.
  `react`/`react-dom` are peers; `@babel/runtime` is the only runtime dep.
- Never commit secrets or `.env*` files.
- `npm run security:check` (`npm audit --production`) must pass before a build.
- Never inject unsanitized HTML; do not introduce `dangerouslySetInnerHTML` into the library.

---

# 6. State & Re-renders
- No direct state mutation — produce new state objects.
- The form store is an external store; subscriptions use `useSyncExternalStore`/selectors so a field
  re-renders **only** when its own slice changes. Preserve this: never widen a subscription to the
  whole form when a field-level selector suffices.
- Keep references stable (validators, handlers) so consumers don't re-register on every render.

# 7. Components & Modules
- Keep modules small and single-purpose. Extract complex logic into hooks/helpers rather than
  growing a component.
- Web (`G*`) and React Native (`RN*`) variants must stay behavior-compatible. Factor shared logic
  into common helpers (`helpers.ts`, `form.ts`, `selectors.ts`) instead of duplicating it.
- Avoid inline functions in JSX on hot paths where they cause avoidable re-renders.
- The public surface is `src/index.ts`. Don't export internals you don't intend to support.

# 8. Hooks
- Never call hooks conditionally.
- Custom hooks must start with `use`.
- Side effects belong in `useEffect`/`useLayoutEffect`. The one deliberate exception — registering a
  field during render so its state exists on first paint — is documented in `TODO.md`; don't add new
  render-time side effects.

# 9. Types
- Prefer precise generics over `any`. The library's value proposition is type-safe forms
  (`GForm<MyForm>`, `GValidators<MyForm>`, `toRawData()` inference) — keep that inference intact.
- Public types are exported from `src/index.ts` / `src/fields/index.ts`. Changing them is an API
  change (see §4).

# 10. Performance
- Avoid unnecessary re-renders and per-render allocations.
- Memoize expensive computations; use `React.memo` only when justified.
- Keep the bundle small and tree-shakable (`"sideEffects": false`). Don't introduce imports that
  defeat tree-shaking or pull in runtime dependencies.

# 11. Accessibility (a11y)
- Preserve the library's automatic a11y wiring (`aria-required`, `aria-invalid`). Any new input
  behavior must keep these in sync with validation state.

# 12. Testing
- No change is considered complete without corresponding tests for its logic.
- Jest + React Testing Library are installed; new logic ships with tests (`*.test.tsx` colocated next
  to the source file). See [`test.md`](test.md).

# 13. Anti-Patterns to Avoid
- Global mutable state.
- Widening field-level subscriptions into whole-form re-renders.
- Diverging web vs. React Native behavior.
- New side effects during render.
- Loosening public generics to `any`.
- Duplicating logic instead of extracting a shared utility/hook.
- Deep prop drilling instead of context/composition.
- Adding heavy dependencies for trivial functionality.
