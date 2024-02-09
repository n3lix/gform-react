import type { GConstraintValidator, GConstraintValidatorHandler, GCustomValidatorHandler, GCustomValidatorHandlerAsync } from ".";

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
    private _track!: string[];

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
        
        this._handlers = new Array<GCustomValidatorHandler<T>>().concat(baseHandlers);
        this._constraintHandlers = new Array<GConstraintValidatorHandler>().concat(baseConstraintHandlers);
        this._asyncHandlers = new Array<GCustomValidatorHandlerAsync<T>>().concat(baseHandlersAsync);
        
        if (__DEV__) {
            this._track = [];
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
        if (__DEV__) {
            if (this._track.includes(validityKey)) {
                console.warn(`[Duplicate Handlers] - handler for '${validityKey}' has already been defined`);
            }
            this._track.push(validityKey);
        }
        this._constraintHandlers.push((input, key) => {
            if (key === validityKey) {
                input.errorText = typeof message === 'string' ? message : message(input);
                return true;
            }
            return false;
        });

        return this;
    }
}