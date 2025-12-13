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