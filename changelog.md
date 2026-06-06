## 2.9.0
* **File input support (`type="file"`)** — file inputs now store the real `File` object instead of the browser's `C:\fakepath\...` string. The stored value is `File | null` for a single file and `File[]` when the `multiple` attribute is set
* **File inputs are uncontrolled** — `GInput` no longer forces a `value`/`checked` prop on `type="file"`, complying with the DOM constraint that file inputs cannot be controlled; the selected `FileList` is owned by the DOM and reflected into form state on change
* **`required` validation for files** — empty required file inputs (including empty `File[]` for `multiple`) are correctly reported as `valueMissing`
* **Programmatic file values** — setting a file field's value via `dispatchChanges` (e.g. drag-and-drop) syncs the `File`/`File[]` into the native input's `FileList` using `DataTransfer`, so the picker, programmatic updates, reset, and `toFormData()` stay consistent (the `value` attribute can't be used — the DOM rejects non-empty file values)
* **Types** — the `file` variant of `GInputProps` is now typed `value?: File | File[] | null` with an optional `multiple` flag and a `File`-aware `element` render handler
* **Exported public types** — `GFormProps`, `GFormState`, `RNGFormState`, `GInputProps`, `GInputState`, and `GElementProps` are now re-exported from the package entry point
* **`dispatchChanges` validation option** — field- and form-level `dispatchChanges` now accept `{ validate: true }` to re-run validation against the updated value (state-based), refreshing `error`/`isValid` for programmatic updates (e.g. drag-and-drop). The default is unchanged (no validation), so manually-set `error`/`errorText` are preserved
* **`fetchDeps` change detection for non-serializable values** — the dependency signature now encodes `File` values by content descriptor and `bigint` by value. Previously `JSON.stringify` collapsed every `File` to `"{}"` (so a changed file never re-triggered `fetch`) and threw on `bigint`. Dependency keys that aren't registered yet are now also guarded
* **Fixed `toRawData` transform** — the field's `value` is passed to `transform`; previously a falsy value (`0`/`''`/`false`) caused the entire field-state object to be passed instead
* **Debounce timer cleanup** — pending `fetch`/async-validation timers are cancelled and removed when a field unmounts, and dropped automatically once they fire; this prevents the internal timer map from growing unbounded and stops a `fetch` from firing after unmount
* **Optimized mode no longer warns** — optimized inputs attach a shared no-op `onChange`, so React no longer warns about a controlled `value` without an `onChange` handler; change/blur/invalid remain delegated to the `<form>`
* **Initial-value validation no longer forces a re-render** — constraint validation for fields that mount with a value is now computed at registration, so constraint errors render on the first paint instead of after a follow-up validation re-render (each pre-filled input renders once instead of twice). Custom/async validation still runs in the field's mount effect and dispatches only when it actually changes the result. The mount validation also syncs native validity via `setCustomValidity`, so an **invalid initial value blocks form submission** (the browser doesn't natively flag initial values — e.g. a value shorter than `minLength` is only `tooShort` once edited — so without this an invalid pre-filled form would submit and refresh the page). Also removed a dead initial-value validation loop in `GForm` (it iterated the empty first-render `fields` snapshot) and the redundant one in `RNGForm`
* **Expanded test coverage** — added `GValidator` (unit + integration), `fetchDeps` `File` detection, field- and form-level `dispatchChanges`, debounce cleanup, initial-value validation (including native-validity submission blocking), and a broader `GForm` suite (submission gating, serialization, `onInit`, `stateRef`, validity, dynamic fields, optimized mode)

## 2.8.1
* **Refined documentation** — `withTypeMismatchMessage` description updated to be clearer and more professional, providing better guidance on using `type` vs `pattern`/custom validators
* **Improved Rollup configuration** — updated `GValidator` entry point, ensuring better consistency and access to related types in the ESM build

## 2.8.0
* **Lazy field registration** — fields now register themselves into the form state on mount and unregister on unmount, replacing the previous static pre-scan of children
* **Improved `touched` & `dirty` flag handling** — `touched` is now set immediately on the first change event; `dirty` is set when the value is updated, making form state more predictable
* **`number` input type** — inputs with `type="number"` now correctly default their value to `0` instead of an empty string
* **Initial value validation** — inputs with an initial value now trigger validation immediately on mount via `_viHandler`
* **Improved dev warning for `typeMismatch`** — more specific warning messages depending on whether a validator is missing entirely or does not satisfy the native constraint

## 2.7.5
* **Improved README layout** 
* **Updated feature list wording**

## 2.7.3
* **Expanded README** — added QuickStart code example, full API reference tables, and `GValidators` usage docs; badges are now linked and an npm downloads badge was added
* **Exported `GValidators` type** — `GValidators` is now re-exported from the package entry point (`src/index.ts`)
* **Build improvements** — rollup babel config now explicitly sets `babelrc: false`, adds `@babel/preset-typescript` and `@babel/preset-react` presets, and strips comments from output

## 2.7.1
* **Added Jest test suite** — `GForm.test.tsx` and `GInput.test.tsx` added with `@testing-library/react`; jest and babel configs set up for TypeScript and React
* **Refactored `RNGForm`** — extracted `_buildRNFormState` helper and simplified `RNGForm` internals; removed the `selectFirstInvalidField` selector; `onInit` and initial-value validation now use `getState()` directly
* **Removed `loader` prop** — the `loader` prop has been removed from `GFormProps` and `GForm`
* **Fixed `RNGInput` fetch deps** — removed intermediate `stableFetchDeps` memo; `fetchDeps` effect now depends directly on the selector result
* **TypeScript improvements** — `GInputState` generics updated to `GInputState<any>` in handler signatures; `IForm` index signature simplified; `__debounce` timer type changed from `NodeJS.Timeout` to `number` for better browser compatibility
* **Added `_buildRNFormState` helper** — React Native form state builder extracted to `helpers.ts`, reusing `_checkIfFormIsValid` and the same `dispatchChanges` API as the web version

## 2.6.0
* Fixed critical bug where the form is reset entirely on every parent render

## 2.5.0
* Significantly improved performance
* Added useFormSelector hook
* Added onKeyUp, onKeyDown events with state access
* Removed loading and setLoading
* Fixed a bug with inputs type email where validation check didn't run for typeMismatch
* Fixed a bug with initial form validation check (fields with initial values)
* Fixed a bug where switching between 2 forms where state never reinitialized (keeps the old one)

## 2.0.1
* Supports React 19 and Next.js 15
* `onSubmit` no longer prevents default behavior (`e.preventDefault`) to support `server actions` (with `action` attribute),<br/>it can be done manually via `e` object
* Fixed typing issues

## 1.11.0
* Added validations for inputs with initial value (except required)
* Fixed development only warnings

## 1.10.0
* optimization
* Fixed a bug where fetch running on every parent render
* Fixed a bug where dispatchChanges is undefined in fetch function

## 1.9.4
* Added development warning in case of input has described a constraint but didn't register a validator
* Added development warning in case of input has a validator but hasn't described the constraint

## 1.9.3
* Minor bug fixes

## 1.9.2
* Added React Native support
* Added a constraint validations to inputs that are not native HTMLInput elements

## 1.5.1
* bug fixes
* Accessibility semi-automatic

## 1.5.0
* Added forwardRef to GForm
* Added forwardRef to GInput

## 1.4.1
* Minor bug fixes

## 1.4.0
* Tree shakeable
* Added 'dirty' and 'touched' properties to inputs
* Added 'fetch' and 'fetchDeps' to GInput props
* Added 'transform' function to GformState properties: 'toRawData', 'toFormData', 'toURLSearchParams'
* Added production and development build (both ESM and CJS)
* Added development only warnings

## 1.2.0
* Added docs
* Bug fixes
* Split CJS and ESM outputs