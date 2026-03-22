import {_checkResult, _checkTypeMismatch, _debounce, _extractValue, _findValidityKey} from "./helpers";
import {type GInputValidator, type GValidators} from "./validations";
import type {GInputState} from "./fields";
import type {GChangeEvent, GDOMElement, GFocusEvent, GFormEvent, GInvalidEvent} from "./form";
import type {InitialState, Store} from "./state";
import {handlersMap, validityMap} from "./validations/GValidator";

export const useFormHandlers = (getState: Store['getState'], setState: Store['setState'], validators: GValidators = {}, optimized = false) => {
    /**
     * handler for validating a form input
     * @param input the input to be validated
     * @param e the event object
     */
    const _viHandler = (input: GInputState<any>, e?: GFocusEvent<GDOMElement | HTMLFormElement> | GInvalidEvent<GDOMElement | HTMLFormElement> | GFormEvent<GDOMElement | HTMLFormElement> | GFormEvent): void => {
        if (!input) return;

        const element = e && e.target;
        input.touched = true;

        if (typeof document !== 'undefined' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
            if (!input.checkValidity) input.checkValidity = () => element.checkValidity();

            const hasInitialValue = !input.dirty && input.value;

            if (hasInitialValue) {  //if the field has an initial value
                /**
                 * for inputs with initial value we have to manually check for validations.
                 * validity.tooShort is false even though the initial value is smaller than minLength, because its required to be filled in by user (native dirty flag is true).
                 * it only works for validity.valueMissing.
                 * If an element has a minimum allowed value length, its dirty value flag is true, its value was last changed by a user edit (as opposed to a change made by a script), its value is not the empty string, and the length of the element's API value is less than the element's minimum allowed value length, then the element is suffering from being too short.
                 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#setting-minimum-input-length-requirements:-the-minlength-attribute
                 */
                const {validityKey} = _checkInputManually(input);
                if (validityKey) {
                    element.setCustomValidity(validityKey); //reset any previous error (custom)
                }
                _dispatchChanges(input, input.formKey);
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

    const _checkInputManually = (input: GInputState<any>) => {
        let validityKey = _findValidityKey({
            valueMissing: input.required && !input.value || false,
            typeMismatch: _checkTypeMismatch(input),
            tooShort: input.minLength && input.value.toString().length < input.minLength || false,
            tooLong: input.maxLength && input.value.toString().length > input.maxLength || false,
            patternMismatch: input.pattern && _checkResult(input.pattern, input.value) || false,
            rangeUnderflow: input.min && Number(input.value) < Number(input.min) || false,
            rangeOverflow: input.max && Number(input.value) > Number(input.max) || false
        });

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
            if (validityKey && !inputValidator?.hasConstraint(validityKey)) {
                if (validityKey === 'typeMismatch') {
                    if (!inputValidator?.handlers.length)
                        console.warn(`DEV ONLY - [Missing Validator] - the input '${input.formKey}' has described the constraint '${validityMap[validityKey]}' however, a correspond validator is missing.\nadd '${handlersMap[validityMap[validityKey]]}' or 'withCustomValidation' or '${handlersMap[validityMap.patternMismatch]}' to the input validator.\nexample:\nconst validators: GValidators = {\n\temail: new GValidator().withTypeMismatchMessage('pattern mismatch'),\n\t...\n}\nif you added on of these validators then the input is still suffering from '${validityKey}' violation.\n\nor either remove the constraint '${validityMap[validityKey]}' from the input props.\n`);
                    else console.warn(`DEV ONLY - [Missing Validator] - the input '${input.formKey}' has described the constraint '${validityMap[validityKey]}' however, a correspond validator is missing or not satisfies the native constraint.\nadd '${handlersMap[validityMap[validityKey]]}' or 'withCustomValidation' to the input validator.\nexample:\nconst validators: GValidators = {\n\temail: new GValidator().withTypeMismatchMessage('pattern mismatch'),\n\t...\n}\n\nif you already have a Custom Validation then the input is still not satisfies the native type pattern.\neither enforce it or remove the constraint '${validityMap[validityKey]}' from the input props`);
                }
                else console.warn(`DEV ONLY - [Missing Validator] - the input '${input.formKey}' has described the constraint '${validityMap[validityKey]}' however, a correspond validator is missing.\nadd '${handlersMap[validityMap[validityKey]]}' to the input validator.\nexample:\nconst validators: GValidators = {\n\temail: new GValidator().withPatternMismatchMessage('pattern mismatch'),\n\t...\n}\n\nor either remove the constraint '${validityMap[validityKey]}' from the input props`);
                console.warn(`form submition is prevented due to violation(s) of input '${input.formKey}': violation '${validityKey}' caused by '${validityMap[validityKey]}' property (<Ginput ${validityMap[validityKey]}={...} />)`);
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

    return {_updateInputHandler, _viHandler, _dispatchChanges, optimized, _createInputChecker: _checkInputManually};
};