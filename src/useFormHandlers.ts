import {_checkResult, _debounce, _extractValue, _findValidityKey, _manualValidityKey} from "./helpers";
import {type GInputValidator, type GValidators} from "./validations";
import type {GInputState} from "./fields";
import type {GChangeEvent, GDOMElement, GFocusEvent, GFormEvent, GInvalidEvent} from "./form";
import type {InitialState, Store} from "./state";
import {handlersMap, validityMap} from "./validations/GValidator";

function _checkValidityFromError(this: GInputState<any>): boolean {
    return !this.error;
}

export const useFormHandlers = (getState: Store['getState'], setState: Store['setState'], validators: GValidators = {}) => {
    /**
     * handler for validating a form input
     * @param input the input to be validated
     * @param e the event object
     */
    const _viHandler = (input: GInputState<any>, e?: GFocusEvent<GDOMElement | HTMLFormElement> | GInvalidEvent<GDOMElement | HTMLFormElement> | GFormEvent<GDOMElement | HTMLFormElement> | GFormEvent): void => {
        if (!input) return;

        const element = e && e.target;
        const wasTouched = input.touched;
        input.touched = true;

        // For a field with async validators, skip re-validating a value that already has a settled
        // result. Re-running optimistically sets `error = true` again (cleared a debounce later), so
        // the blur that fires when the user clicks submit would re-invalidate the field at the exact
        // instant of submission - silently swallowing the first submit until the async re-resolves.
        // `_validatedValue` is the value the last pass settled on; an unchanged value needs no re-check.
        const _asyncValidator = validators[input.validatorKey || input.formKey] || validators['*'];
        if (_asyncValidator?.asyncHandlers.length) {
            if (input._validatedValue !== undefined && Object.is(input.value, input._validatedValue)) {
                if (!wasTouched) _dispatchChanges(input, input.formKey); // still propagate the one-time touched flip
                return;
            }
            input._validatedValue = input.value;
        }

        if (typeof document !== 'undefined' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
            if (!input.checkValidity) input.checkValidity = () => element.checkValidity();

            const hasInitialValue = !input.dirty && input.value;

            if (hasInitialValue) {
                return;
            }
            element.setCustomValidity(''); //reset any previous error (custom)

            const validityKey = _findValidityKey(element.validity);
            _validateInput(input, validityKey, (v: string) => element.setCustomValidity(v));

            if (!validityKey && input.error) {
                element.setCustomValidity(input.errorText || 'error');
            }

            _dispatchChanges(input, input.formKey);
        } else {
            if (__DEBUG__) {
                console.log('[validateInputHandler] -', `the input '${input.formKey}' is not a native web element\nevent:`, e);
            }

            // fallback - validate the input for validations manually
            input.checkValidity = () => _checkInputManually(input).isValid;
            input.checkValidity();

            _dispatchChanges(input, input.formKey);
        }
    };

    /**
     * Blur-path entry point. Fields with a resolved validator go through the full `_viHandler`
     * pipeline. Fields without one skip it — validation would no-op, so dispatching (and
     * re-rendering) on every blur is wasted work. The two contracts blur still owes are kept
     * cheaply:
     * - `checkValidity` is pointed at `error` instead of the registration default (which always
     *   returns `false` and would make `RNGFormState.checkValidity()` fail forever);
     * - `touched` flips once, with a single dispatch on the first blur only.
     *
     * Not used on the change path: `_updateInputHandler` relies on `_viHandler`'s dispatch to
     * propagate the new value to the store regardless of validators.
     */
    const _blurHandler = (input: GInputState<any>, e?: GFocusEvent<GDOMElement | HTMLFormElement> | GInvalidEvent<GDOMElement | HTMLFormElement> | GFormEvent<GDOMElement | HTMLFormElement> | GFormEvent): void => {
        if (!input) return;

        if (validators[input.validatorKey || input.formKey] || validators['*']) {
            _viHandler(input, e);
            return;
        }

        if (__DEBUG__) {
            console.log('[blurHandler] -', `the input '${input.formKey}' has no validator - skipping validation`);
        }

        input.checkValidity = _checkValidityFromError;
        if (!input.touched) {
            input.touched = true;
            _dispatchChanges(input, input.formKey);
        }
    };

    const _checkInputManually = (input: GInputState<any>) => {
        let validityKey = _manualValidityKey(input);

        if (!validityKey && input.error) {
            validityKey = 'customError';
        }
        _validateInput(input, validityKey);
        return {
            isValid: !input.error,
            validityKey,
        };
    };

    /**
     * Run ONLY the constraint validators (required/minLength/pattern/type/min/max — all
     * single-field) and bake the result into `error`/`errorText`. Pure: no dispatch, no
     * `touched`, and no custom/async handlers (which may read other fields and shouldn't run
     * during render). Called at registration so constraint errors on initial values appear on
     * the first render without a follow-up re-render; custom/async still run in the mount effect.
     */
    const _checkConstraints = (input: GInputState<any>): void => {
        const validityKey = _manualValidityKey(input);
        if (!validityKey) return;

        const inputValidator = validators[input.validatorKey || input.formKey] || validators['*'];
        if (!inputValidator) return;

        for (const index in inputValidator.constraintHandlers) {
            input.error = _checkResult(inputValidator.constraintHandlers[index](input, validityKey), input.value);
            if (input.error) return;
        }
    };

    /**
     * handler for updating and validating a form input
     * @param input
     * @param e the event object
     * @param unknown
     */
    const _updateInputHandler = (input: GInputState<any>, e?: GChangeEvent<GDOMElement | HTMLFormElement>, unknown?: {
        value: unknown
    } | string | number): void => {
        input.value = _extractValue(e, unknown) as GInputState['value'];
        input.dirty = true;
        _viHandler(input, e);
    };

    /**
     * Validates the input and updates the state with the result
     * @param input the input to be validated
     * @param validityKey the `Constraint Validation` key
     * @param setValidity
     */
    const _validateInput = (input: GInputState, validityKey?: keyof ValidityState, setValidity?: (e: string) => void): void => {
        const inputValidator = validators[input.validatorKey || input.formKey] || validators['*'];
        if (__DEBUG__) {
            console.log('[validateInput] -', 'validating input:', input.formKey, `(${validityKey ? validityKey : 'custom'})`);
        }

        if (__DEV__) {
            if (validityKey) {
                if (validityKey in validityMap && !inputValidator?.hasConstraint(validityKey)) {
                    if (validityKey === 'typeMismatch') {
                        if (!inputValidator?.handlers.length)
                            console.warn(`DEV ONLY - [Missing Validator] - the input '${input.formKey}' has described the constraint '${validityMap[validityKey]}' however, a correspond validator is missing.\nadd '${handlersMap[validityMap[validityKey]]}' or 'withCustomValidation' or '${handlersMap[validityMap.patternMismatch]}' to the input validator.\nexample:\nconst validators: GValidators = {\n\temail: new GValidator().withTypeMismatchMessage('pattern mismatch'),\n\t...\n}\nif you added one of these validators then the input is still suffering from '${validityKey}' violation.\n`);
                        else console.warn(`DEV ONLY - [Missing Validator] - the input '${input.formKey}' has described the constraint '${validityMap[validityKey]}' however, a correspond validator is missing or not satisfies the native constraint.\nadd '${handlersMap[validityMap[validityKey]]}' or 'withCustomValidation' to the input validator.\nexample:\nconst validators: GValidators = {\n\temail: new GValidator().withTypeMismatchMessage('pattern mismatch'),\n\t...\n}\n\nif you already have a Custom Validation then the input is still not satisfies the native type pattern.\neither enforce it or remove the constraint '${validityMap[validityKey]}' from the input props`);
                    }
                    else console.warn(`DEV ONLY - [Missing Validator] - the input '${input.formKey}' has described the constraint '${validityMap[validityKey]}' however, a correspond validator is missing.\nadd '${handlersMap[validityMap[validityKey]]}' to the input validator.\nexample:\nconst validators: GValidators = {\n\temail: new GValidator().${handlersMap[validityMap[validityKey]]}(...),\n\t...\n}\n\nor either remove the constraint '${validityMap[validityKey]}' from the input props`);
                    console.warn(`form submition is prevented due to violation(s) of input '${input.formKey}': violation '${validityKey}' caused by '${validityMap[validityKey]}' property.\n(<Ginput formKey={'${input.formKey}'} ${validityMap[validityKey]}={...} />)`);
                }
            }
        }

        if (inputValidator) {
            __validateInput(input, inputValidator, validityKey, setValidity);
        }
    };

    const _dispatchChanges = (changes: Partial<InitialState> | Partial<GInputState<any>>, key?: string) => setState(prev => {
        if (key) {
            return {...prev, fields: {...prev.fields, [key]: {...prev.fields[key], ...changes}}};
        }
        return {...prev, ...changes};
    });

    /**
     * Merge `changes` into a field, then re-run validation against the updated value.
     * Validation uses the manual (state-based) path — important for programmatic updates
     * (e.g. a drag-and-dropped file) where the DOM may not yet reflect the new value.
     */
    const _dispatchAndValidate = (changes: Partial<GInputState<any>>, key: string) => {
        _dispatchChanges(changes, key);
        const input = getState().fields[key];
        if (input) _viHandler(input);
    };

    /**
     * Restore every field to the snapshot captured at registration — value, validity, and the
     * `touched`/`dirty` flags (see `_initial` in `registerField`). This backs the native `<form>`
     * reset: gform owns each field's value (controlled inputs read from the store), so clearing the
     * DOM alone does nothing — the store is the source of truth and is restored here, after which
     * the inputs re-render to match. Custom/async validators are not re-run, mirroring the
     * constraint-only state of the field's first paint.
     */
    const _resetForm = (): void => setState(prev => {
        const fields = {} as InitialState['fields'];
        for (const key in prev.fields) {
            const field = prev.fields[key];
            fields[key] = field._initial ? {...field, ...field._initial} : field;
        }
        return {...prev, fields};
    });

    /**
     * Re-capture the `_initial` snapshot for the given fields from their current state. Called after
     * `onInit` seeds values so that those seeded values — rather than the original `value` props —
     * become the baseline that a native reset restores to. Fields `onInit` doesn't touch keep the
     * snapshot taken at registration.
     */
    const _seedInitial = (keys: string[]): void => setState(prev => {
        const fields = {...prev.fields};
        for (const key of keys) {
            const field = fields[key];
            if (!field) continue;
            fields[key] = {
                ...field,
                _initial: {
                    value: field.value,
                    error: field.error,
                    errorText: field.errorText,
                    touched: field.touched,
                    dirty: field.dirty,
                },
            };
        }
        return {...prev, fields};
    });

    /**
     * Validate a field that mounts with a value (called from the field's mount effect).
     * Constraint errors were already baked at registration; this runs the full check
     * (custom/async, with the complete field set) and dispatches ONLY when the result changes —
     * so a valid/constraint-only initial value doesn't trigger a re-render. No value change here,
     * so it's safe to skip the dispatch (unlike `_viHandler`, which also propagates value edits).
     *
     * `element` (when present) has its native validity synced via `setCustomValidity`, so the
     * browser blocks submitting an invalid initial value. This matters because the browser
     * doesn't natively flag initial values (e.g. a value shorter than `minLength` is only
     * `tooShort` once the user edits it) — without it the form would submit/refresh.
     *
     *  for inputs with initial value we have to manually check for validations.
     *  validity.tooShort is false even though the initial value is smaller than minLength, because its required to be filled in by user (native dirty flag is true).
     *  it only works for validity.valueMissing.
     *  If an element has a minimum allowed value length, its dirty value flag is true, its value was last changed by a user edit (as opposed to a change made by a script), its value is not the empty string, and the length of the element's API value is less than the element's minimum allowed value length, then the element is suffering from being too short.
     *  @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#setting-minimum-input-length-requirements:-the-minlength-attribute
     */
    const _validateInitialField = (input: GInputState<any>, key: string, element?: GDOMElement): void => {
        const before = {error: input.error, errorText: input.errorText};
        _checkInputManually(input);

        // Record the settled value for async fields so the first post-edit blur (e.g. clicking
        // submit) doesn't re-run the async validator and re-arm its optimistic `error` flag.
        const _asyncValidator = validators[input.validatorKey || input.formKey] || validators['*'];
        if (_asyncValidator?.asyncHandlers.length) input._validatedValue = input.value;

        if (element) {
            element.setCustomValidity(input.error ? (input.errorText || 'invalid') : '');
        }

        if (input.error !== before.error || input.errorText !== before.errorText) {
            _dispatchChanges(input, key);
        }
    };

    /**
     * @internal
     */
    const __validateInput = (input: GInputState, inputValidator: GInputValidator<any>, validityKey?: keyof ValidityState, setValidity?: (e: string) => void): void => {
        if (__DEBUG__) {
            console.log('[_validateInput] -', `validating input (${input.formKey}) with\nhandlers:`, inputValidator.handlers, '\nconstraintHandlers:', inputValidator.constraintHandlers, '\nasyncHandlers:', inputValidator.asyncHandlers);
        }
        const fields = getState().fields;

        for (const index in inputValidator.constraintHandlers) {
            const handler = inputValidator.constraintHandlers[index];
            const result = handler(input, validityKey);
            input.error = _checkResult(result, input.value);

            if (__DEBUG__) {
                const violation = handler.name.split('_')[1];
                console.log('[_validateInput] -', `validation results for constraint handler (${index}):\n`, handler, '\n\nvalidator result:', result, `(${input.error ? 'failed' : 'passed'})`, '\nviolation:', violation);
            }

            if (input.error) return;
        }

        for (const index in inputValidator.handlers) {
            const handler = inputValidator.handlers[index];
            const result = handler(input, fields);
            input.error = _checkResult(result, input.value);

            if (__DEBUG__) {
                console.log('[_validateInput] -', `validation results for custom handler (${index}):\n`, handler, '\n\nvalidator result:', result, `(${input.error ? 'failed' : 'passed'})`, '\nviolation:', `customError(${input.errorText})`);
            }

            if (input.error) return;
        }

        input.errorText = '';

        if (inputValidator.asyncHandlers.length) {
            input.error = true;
            _debounce(input.debounce || 300, `${input.gid}-async`).then(() => {
                const validateAsync = async () => {
                    for (const index in inputValidator.asyncHandlers) {
                        const handler = inputValidator.asyncHandlers[index];
                        const result = await handler(input, fields);
                        input.error = _checkResult(result, input.value);

                        if (__DEBUG__) {
                            console.log('[_validateInput] -', `validation results for custom async handler (${index}):\n`, handler, '\n\nvalidator result:', result, `(${input.error ? 'failed' : 'passed'})`, '\nviolation:', `customErrorAsync(${input.errorText})`);
                        }

                        if (input.error) break;
                    }
                    if (!input.error) input.errorText = '';

                    _dispatchChanges({error: input.error, errorText: input.errorText}, input.formKey);
                    if (setValidity) {
                        setValidity(input.errorText);
                    }
                };

                if (__DEBUG__) {
                    console.log('[_validateInput] -', `validating input (${input.formKey}) with async handlers:`, inputValidator.asyncHandlers);
                }
                validateAsync();
            });
        }
    };

    return {_updateInputHandler, _viHandler, _blurHandler, _dispatchChanges, _dispatchAndValidate, _checkConstraints, _validateInitialField, _resetForm, _seedInitial, _createInputChecker: _checkInputManually};
};