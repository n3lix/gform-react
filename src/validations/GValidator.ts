import type { GConstraintValidator, GConstraintValidatorHandler, GCustomValidatorHandler, GCustomValidatorHandlerAsync } from ".";

export let handlersMap: { [key: string]: string };
export let validityMap: { [key in keyof Partial<ValidityState>]: any };

if (__DEV__) {
    handlersMap = {
        minLength: 'withMinLengthMessage',
        maxLength: 'withMaxLengthMessage',
        required: 'withRequiredMessage',
        pattern: 'withPatternMismatchMessage',
        min: 'withRangeUnderflowMessage',
        max: 'withRangeOverflowMessage',
        step: 'withStepMismatchMessage'
    };
    validityMap = {
        tooShort: 'minLength',
        valueMissing: 'required',
        tooLong: 'maxLength',
        patternMismatch: 'pattern',
        rangeOverflow: 'max',
        rangeUnderflow: 'min',
        stepMismatch: 'step'
    };
}

/**a class for handling validations for input(s)
 * @example
 * const baseValidator = new GValidator().withRequiredMessage('this field is required');
 *
 * const validators: GValidators<SignInForm> = {
 *     username: new GValidator(baseValidator).withMinLengthMessage('...'),
 *     '*': baseValidator // a default validator for all other fields in the form
 * };
 */
export class GValidator<T = any> {
    private _handlers: GCustomValidatorHandler<T>[];
    private _constraintHandlers: GConstraintValidatorHandler[];
    private _asyncHandlers: GCustomValidatorHandlerAsync<T>[];
    track?: (keyof ValidityState)[];

    get handlers() {
        return this._handlers;
    }

    get constraintHandlers() {
        return this._constraintHandlers;
    }

    get asyncHandlers() {
        return this._asyncHandlers;
    }

    constructor(baseValidator?: GValidator<T>) {
        const baseHandlers = baseValidator?.handlers || [];
        const baseConstraintHandlers = baseValidator?.constraintHandlers || [];
        const baseHandlersAsync = baseValidator?.asyncHandlers || [];

        this._handlers = [].concat(baseHandlers as any);
        this._constraintHandlers = [].concat(baseConstraintHandlers as any);
        this._asyncHandlers = [].concat(baseHandlersAsync as any);

        if (__DEV__) {
            this.track = [];
            if (baseValidator?.track) {
                this.track = this.track.concat(baseValidator.track);
            }
        } else {
            delete this.track;
        }
    }

    /**register a `valueMissing` violation handler (use this with `required` attribute) */
    withRequiredMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('valueMissing', message);
    }

    /**register a `tooLong` violation handler (use this with `maxLength` attribute) */
    withMaxLengthMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('tooLong', message);
    }

    /**register a `tooShort` violation handler (use this with `minLength` attribute)*/
    withMinLengthMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('tooShort', message);
    }

    /**register a `patternMismatch` violation handler (use this with `pattern` attribute)*/
    withPatternMismatchMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('patternMismatch', message);
    }

    /**register a `badInput` violation handler */
    withBadInputMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('badInput', message);
    }

    /**register a `rangeUnderflow` violation handler (use this with `min` attribute) */
    withRangeUnderflowMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('rangeUnderflow', message);
    }

    /**register a `rangeOverflow` violation handler (use this with `max` attribute) */
    withRangeOverflowMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('rangeOverflow', message);
    }

    /**register a `typeMismatch` violation handler */
    withTypeMismatchMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('typeMismatch', message);
    }

    /**register a `stepMismatch` violation handler (use this with `step` attribute)*/
    withStepMismatchMessage(message: string | GConstraintValidator): GValidator<T> {
        return this.__addConstraintValidationHandler('stepMismatch', message);
    }

    /**register a custom validation handler */
    withCustomValidation(handler: GCustomValidatorHandler<T>): GValidator<T> {
        this._handlers.push(handler);
        return this;
    }
    /**register a custom validation async handler */
    withCustomValidationAsync(handler: GCustomValidatorHandlerAsync<T>): GValidator<T> {
        this._asyncHandlers.push(handler);
        return this;
    }

    private __addConstraintValidationHandler(validityKey: keyof ValidityState, message: string | GConstraintValidator): GValidator<T> {
        if (__DEV__ && this.track) {
            if (this.track.includes(validityKey)) {
                console.warn(`[Duplicate Handlers] - handler for '${validityKey}' has already been defined`);
            }
            this.track.push(validityKey);
        }
        this._constraintHandlers.push((input, key) => {
            if (__DEV__) {
                if (validityKey && validityMap[validityKey] && typeof input[validityMap[validityKey]] === 'undefined') {
                    console.warn(`[Missing Prop] - the input '${input.formKey}' has registered validator for the violation '${validityKey}' but the input hasn't described the constraint '${validityMap[validityKey]}'.\nadd '${validityMap[validityKey]}' to the input props.\nexample:\n<GInput formKey='${input.formKey}' ${validityMap[validityKey]}={...} />\n\nor either remove '.${handlersMap[validityMap[validityKey]]}(...)' validation`);
                }
            }

            if (key === validityKey) {
                input.errorText = typeof message === 'string' ? message : message(input);
                return true;
            }
            return false;
        });

        return this;
    }
}