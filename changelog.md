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
* **Improved README layout** — logo and badges are now centered with proper `alt` text for accessibility; hero section restructured with a title and description
* **Updated feature list wording** — "Tree‑Shakeable" → "Tree‑shakeable", "Native HTML5 Constraint Validations" → "Native HTML Constraint Validations", "Support Yup, Zod etc." → "Supports Yup, Zod, and more", "Dynamic forms — add/remove fields on the fly" → listed as a standalone bullet
* **Cleaned up README separators** — removed redundant `---` horizontal rules between sections for a cleaner document structure

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