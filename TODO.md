# gform-react — TODO / tech debt

Tracked follow-ups from the code review. Items here are **optional** improvements; the library
is functional without them. Ordered roughly by impact.

---

## Recently completed (context)

- ✅ `getInputElement` uses `elements.namedItem` (no longer shadowed by `HTMLFormElement` props).
- ✅ `makeSelectFields` guards `fields[key]?.value` (no crash on a not-yet-registered `fetchDeps` key).
- ✅ `toRawData` transform passes `fields[key]?.value` (dropped the falsy-value fallback bug).
- ✅ `fetchDeps` signature is `File`/`bigint`-aware (replacer; different files now re-trigger `fetch`).
- ✅ `dispatchChanges(changes, { validate: true })` re-validates programmatic updates.
- ✅ Debounce timer map auto-cleans on fire + `_clearDebounce` on field unmount (no unbounded growth; no fetch-after-unmount).
- ✅ Removed the dead `createSelector` memo (inlined `makeSelectFields`).
- ✅ Optimized-mode inputs get a shared no-op `onChange` (no more React "controlled value without onChange" warning).
- ✅ Test coverage expanded: `GValidator`, `selectors`/`fetchDeps`, `dispatchChanges`, debounce cleanup, and a broad `GForm` suite (submission gating, serialization, `onInit`, `stateRef`, validity, dynamic fields, optimized mode).

---

## Remaining

### 1. Register-in-render lifecycle (architectural) — `src/fields/GInput.tsx`, `src/fields/RNGInput.tsx`
**Priority:** high (only if using concurrent features around forms), otherwise medium.

Fields call `store.registerField(props)` in the render body so `inputState` is available on the
first render. This is a side effect during render. Consequences:
- **StrictMode:** self-heals via the unregister→notify→re-render cascade, but causes extra churn.
- **Concurrent/Suspense:** React can run render (→ `registerField`) for a tree it then **discards**;
  the effect (and its cleanup) never runs, leaving a **phantom field** in the store — it keeps
  `isValid` stuck and shows up in `toRawData()`/`toFormData()`.
- Violates render purity.

**Suggested fix (Option B from the review):**
- Compute a local initial state in render: `useMemo(() => _buildInputInitialValues(props), [])`.
- `const inputState = storedField ?? localInitial;`
- Move registration into `useIsomorphicLayoutEffect` (register + notify; unregister on cleanup).
- `registerField` must notify so the selector swaps from fallback → store value.

**Trade-offs:** extra render on mount, a local-fallback code path, SSR registers only client-side,
field insertion order shifts to effect order. Touches the core mount flow → needs a dedicated test
pass (StrictMode double-mount, dynamic add/remove, initial-value validation, SSR snapshot).

Related quirks caused by the current approach (would be fixed by Option B):
- Form-level state (render-prop `state` / `stateRef`) has **empty `fields` on the very first render**,
  because the parent reads the fields snapshot before children register; it populates after the
  post-mount re-render.

---

### 2. `onInit` pollutes `fields` with non-field state — `src/GForm.tsx`, `src/RNGForm.tsx`
**Priority:** medium (latent correctness).

`onInit` merges the **entire** form state into `fields`:
```ts
handlers._dispatchChanges({ fields: _merge({}, state, _c) });
```
`state` is `GFormState` — it carries `isValid`, `isInvalid`, `toRawData`, `toFormData`,
`checkValidity`, `dispatchChanges`, etc. Those keys get merged **into `fields`**, so after `onInit`
the fields map contains bogus entries (e.g. `fields.toRawData`). It doesn't crash today, but it's
incorrect and can leak into `toRawData()` output / field iteration.

**Suggested fix:** merge field changes into the existing **fields**, not the whole form state, e.g.
`_merge({}, getState().fields, _c)` (and the RN equivalent).

---

### 3. `checkValidity()` is stale before the first re-render — `src/helpers.ts` (`_buildFormState`)
**Priority:** low.

`_buildFormState(fields, formRef.current!, ...)` captures `formElement` at render time. On the
**first** render `formRef.current` is `null`, so the initial state's `checkValidity()`
(`formElement && formElement.checkValidity() || false`) returns `false` regardless of actual
validity until a re-render rebuilds the state with the committed form element. (`onSubmit` is
unaffected — it rebuilds state with `formRef.current` at submit time.)

**Suggested fix:** read `formRef.current` at call time inside `checkValidity` instead of capturing it,
or pass the ref rather than the resolved element.

---

### 4. Tighter types / fewer `any` (#9/#10) — `src/fields/GInput.tsx`, `src/fields/index.ts`, RN
**Priority:** low (DX/safety).

- `_props` in `GInput`/`RNGInput` is an untyped object literal. Typing it as the element's props
  would catch invalid props at compile time (this is what let the `files={...}` mistake through).
- Reduce `any`: `GInputInitialState`'s `[key: string]: any`, `forwardRef<any, …>` in RN, `element`
  casts. Consider a `File`-aware value type for the file variant's `element` handler.

---

### 5. `exports` map: expose `./package.json` — `package.json`
**Priority:** trivial.

`require('gform-react/package.json')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED` because the `exports`
map doesn't list it. Some tooling reads it.

**Suggested fix:** add to `exports`:
```json
"./package.json": "./package.json"
```