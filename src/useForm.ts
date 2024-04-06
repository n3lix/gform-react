import { useMemo, useState } from "react";

import { _buildFormInitialValues, _findValidityKey, _checkResult, _extractValue, _debounce } from "./helpers";
import { GValidator, type GInputValidator, type GValidators } from "./validations";
import type { GInputState } from "./fields";
import type { GFocusEvent, GInvalidEvent, GChangeEvent, GFormEvent, GDOMElement } from "./form";
import type { GFormState, InitialState } from "./state";
import { handlersMap, validityMap } from "./validations/GValidator";

export const useForm = <T>(children?: JSX.Element | JSX.Element[] | ((state: GFormState<T>) => JSX.Element | JSX.Element[]), validators: GValidators<T> = {}, optimized = false) => {
    // eslint-disable-next-line prefer-const
    let _dispatchChanges: (changes: Partial<InitialState<T>> | Partial<GInputState>, key?: string) => void;

    const initialValues = useMemo(() => {
        const values = _buildFormInitialValues<T>(typeof children === 'function' ? children({} as GFormState<T>) : children, _dispatchChanges);
        if (__DEV__) {
            Object.keys(values.state.fields).forEach(key => {
                const input = values.state.fields[key];
                const validator = validators[key];
                if (validator instanceof GValidator) {
                    const validityKeys = validator.track?.filter(key => validityMap[key]);

                    validityKeys?.forEach(vKey => {
                        if (typeof input[validityMap[vKey]] === 'undefined') {
                            console.warn(`[Missing Prop] - the input '${input.formKey}' has registered validator for the violation '${vKey}' but the input hasn't described the constraint '${validityMap[vKey]}'.\nadd '${validityMap[vKey]}' to the input props.\nexample:\n<GInput formKey='${input.formKey}' ${validityMap[vKey]}={...} />\n\nor either remove '.${handlersMap[validityMap[vKey]]}(...)' validation`);
                        }
                    });

                    Object.entries(validityMap).forEach(([validityKey, constraint]) => {
                        if (typeof input[constraint] !== 'undefined' && !validator.track?.some(trackKey => validityKey === trackKey)) {
                            console.warn(`[Missing Validator] - the input '${input.formKey}' has described the constraint '${constraint}' but the input hasn't registered a validator to handle it.\nregister a handler '${handlersMap[constraint]}' for the input validator to handle the '${validityKey}' violation.\nexample:\ncosnt validators = {\n\t${input.formKey}: new GValidator().${handlersMap[constraint]}(...)\n}`);
                        }
                    });
                }
            });
        }
        return values;
    }, []);

    const [state, setState] = useState(initialValues.state);

    /**
     * handler for validating a form input
     * @param input the input to be validated
     * @param e the event object
     */
    const _viHandler = (input: GInputState, e?: GFocusEvent<GDOMElement | HTMLFormElement> | GInvalidEvent<GDOMElement | HTMLFormElement> | GFormEvent<GDOMElement | HTMLFormElement> | GFormEvent): void => {
        if (!input) return;
        const element = e && e.target;

        if (typeof document !== 'undefined' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
            if (!input.checkValidity) input.checkValidity = () => element.checkValidity();
            
            //if the field has initial value
            if (!input.dirty && input.value) {
                /**
                * for inputs with initial value
                * we have to manually check for validations.
                * validity.tooShort is false even though initial value is smaller than minLength, because its required to be filled in by user (native dirty flag is true).
                * it only works for validity.valueMissing.
                * If an element has a minimum allowed value length, its dirty value flag is true, its value was last changed by a user edit (as opposed to a change made by a script), its value is not the empty string, and the length of the element's API value is less than the element's minimum allowed value length, then the element is suffering from being too short.
                * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#setting-minimum-input-length-requirements:-the-minlength-attribute
                */
                _checkInputManually(input);
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

            //fallback - validate the input for validations manually
            input.checkValidity = () => _checkInputManually(input);
            input.checkValidity();

            _dispatchChanges(input, input.formKey);
        }
    };

    const _checkInputManually = (input: GInputState) => {
        let validityKey = _findValidityKey({
            valueMissing: input.required && !input.value || false,
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
        return !input.error;
    };

    /**
     * handler for updating and validating a form input
     * @param key the key used to identify the input (`formKey`)
     * @param e the event object
     */
    const _updateInputHandler = (key: string, e?: GChangeEvent<GDOMElement | HTMLFormElement>, unknown?: { value: unknown } | string | number): void => {
        const value = _extractValue(e, unknown);
        const input = _updateInput(key, value);

        _viHandler(input, e);
    };

    /**
     * Validates the input and updates the state with the result
     * @param input the input to be validated
     * @param validityKey the `Constraint Validation` key
     */
    const _validateInput = (input: GInputState, validityKey?: keyof ValidityState, setValidity?: (e: string) => void): void => {
        const inputValidator = validators[input.validatorKey || input.formKey] || validators['*'];
        if (__DEBUG__) {
            console.log('[validateInput] -', 'validating input:', input.formKey, `(${validityKey ? validityKey : 'custom'})`);
        }

        inputValidator && __validateInput(input, inputValidator, validityKey, setValidity);
        input.touched = true;
    };

    /**
     * update the input state.
     * @param key the key used to identify the input (`formKey`)
     * @param value the new value
     */
    const _updateInput = <V>(key: string, value: GInputState<V>['value']) => {
        const input = state.fields[key];
        input.value = value;
        input.dirty = true;
        return input;
    };

    _dispatchChanges = (changes: Partial<InitialState<T>> | Partial<GInputState>, key?: string) => setState(prev => {
        if (key) {
            return { ...prev, fields: { ...prev.fields, [key]: { ...prev.fields[key], ...changes } } };
        }
        return { ...prev, ...changes };
    });

    /**
     * @internal
     */
    const __validateInput = (input: GInputState, inputValidator: GInputValidator<T>, validityKey?: keyof ValidityState, setValidity?: (e: string) => void): void => {
        if (__DEBUG__) {
            console.log('[_validateInput] -', `validating input (${input.formKey}) with handlers:`, inputValidator.handlers);
        }

        for (const index in inputValidator.constraintHandlers) {
            const result = inputValidator.constraintHandlers[index](input, validityKey);
            if (__DEBUG__) {
                console.log('[_validateInput] -', `validation results for constraint handler (${index}):\n`, inputValidator.constraintHandlers[index], '\n\nvalidator result:', result, '\nviolation:', input.error, `(${input.error ? 'failed' : 'passed'})`);
            }

            input.error = _checkResult(result, input.value);
            if (input.error) return;
        }

        for (const index in inputValidator.handlers) {
            const result = inputValidator.handlers[index](input, state.fields);
            if (__DEBUG__) {
                console.log('[_validateInput] -', `validation results for custom handler (${index}):\n`, inputValidator.handlers[index], '\n\nvalidator result:', result, '\nviolation:', input.error, `(${input.error ? 'failed' : 'passed'})`);
            }

            input.error = _checkResult(result, input.value);
            if (input.error) return;
        }

        input.errorText = '';

        if (inputValidator.asyncHandlers.length) {
            input.error = true;
            _debounce(input.debounce || 300, `${input.gid}-async`).then(() => {
                const validateAsync = async () => {
                    for (const index in inputValidator.asyncHandlers) {
                        const result = await inputValidator.asyncHandlers[index](input, state.fields);
                        if (__DEBUG__) {
                            console.log('[_validateInput] -', `validation results for custom async handler (${index}):\n`, inputValidator.asyncHandlers[index], '\n\nvalidator result:', result, '\nviolation:', input.error, `(${input.error ? 'failed' : 'passed'})`);
                        }

                        input.error = _checkResult(result, input.value);
                        if (input.error) break;
                    }
                    if (!input.error) input.errorText = '';

                    _dispatchChanges({ error: input.error, errorText: input.errorText }, input.formKey);
                    setValidity && setValidity(input.errorText);
                };

                if (__DEBUG__) {
                    console.log('[_validateInput] -', `validating input (${input.formKey}) with async handlers:`, inputValidator.asyncHandlers);
                }
                validateAsync();
            });
        }

    };

    return { state, _updateInputHandler, _viHandler, _dispatchChanges, optimized, key: initialValues.key, _createInputChecker: _checkInputManually };
};