# Naming Conventions — TypeScript / React

## Identifiers
- Use **camelCase** for variables, functions, hooks, and methods.
- Use **PascalCase** for components, classes, types, and interfaces (`GForm`, `GValidator`,
  `GFormState`, `GValidators`).
- Use **UPPER_SNAKE_CASE** for module-level constants.
- Boolean variables/props must start with: `is`, `has`, `should`, or `can`
  (e.g. `isValid`, `isInvalid`).
- Internal-only helpers in this codebase are conventionally prefixed with `_`
  (e.g. `_buildFormState`, `_merge`, `_clearDebounce`). Keep that convention for internals and do
  **not** export them from `src/index.ts`.

## Files
- Use **PascalCase** for component files → `ComponentName.tsx` (`GForm.tsx`, `RNGInput.tsx`).
- Use **camelCase** for utility / non-component modules → `helpers.ts`, `selectors.ts`,
  `useFormHandlers.ts`.
- Use **kebab-case** for multi-word non-component modules where it already exists
  (`form-context.tsx`).
- Test files → `[TargetName].test.tsx`, colocated next to the file under test.
- This is a TypeScript project: source files are `.ts` / `.tsx`, never `.js`.
