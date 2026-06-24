import type { GConstraintValidator, GConstraintValidatorHandler, GCustomValidatorHandler, GCustomValidatorHandlerAsync } from ".";
import type {GInputState} from "../fields";
import {_depsReplacer, _toRawData} from "../helpers";
import { _applySchemaResult } from "./schema";
import type { StandardSchemaV1, StandardSchemaV1Result } from "./standardSchema";

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
        step: 'withStepMismatchMessage',
        type: 'withTypeMismatchMessage',
    };
    validityMap = {
        tooShort: 'minLength',
        valueMissing: 'required',
        tooLong: 'maxLength',
        patternMismatch: 'pattern',
        rangeOverflow: 'max',
        rangeUnderflow: 'min',
        stepMismatch: 'step',
        typeMismatch: 'type'
    };
}

/**a class for handling validations for input(s)
 * @example
 * const baseValidator = new GValidator().withRequiredMessage('this field is required');
 *
 * const validators: GValidators<SignInForm> = {
 *     '*': baseValidator, // a default validator for all other fields in the form
 *     username: new GValidator(baseValidator).withMinLengthMessage('...')
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

    public hasConstraint(constraint: keyof ValidityState): boolean {
        return this.track?.includes(constraint) || false;
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

    /**
     * register a `typeMismatch` violation handler (use this with `type` attributes like `email` or `url`)
     * <br />
     * Use the `type` attribute to set the appropriate virtual keyboard (e.g., `type="tel"` for a numeric pad on mobile).
     * Since native browser validation for certain types can vary, consider using `pattern` or custom validators for
     * consistent cross-browser behavior. Ensure your custom validation is compatible with the native one to avoid
     * blocking form submission.
     */
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

    /**
     * Validate every field against a whole-object schema.
     * any schema lib implementing Standard Schema v1 (Zod >= 3.24, Valibot, ArkType, Yup >= 1.7, Joi >= 18.0.0).
     *
     * Unlike routing each field to its own leaf sub-schema, this parses the WHOLE object once per validation pass, so object-level rules
     * (`.refine()` / `.superRefine()`, conditional-required, confirm-password) fire and route to the
     * field named by the issue's `path`.
     *
     * cross-field rules must set `path` to the target field's `formKey`
     * (`.refine(fn, { message, path: ['confirmPassword'] })`). To also clear/refresh the *other*
     * field of a pair as the user edits it, give the dependent field `validatorDeps={['password']}`.
     *
     * for an async schema (its `validate` returns a Promise, e.g. Yup, or async
     * refinements) use `withSchemaAsync`; a sync `withSchema` cannot block on it.
     *
     * @example
     * const zodSchema = z.object({
     *         email: z.string().email('enter a valid email'),
     *         password: z.string().min(8, 'at least 8 characters'),
     *         confirm: z.string(),
     *     })
     *     .refine((data) => data.password === data.confirm, {
     *         message: 'passwords must match',
     *         path: ['confirm'], // route the cross-field error onto the confirm field
     *     });
     *
     * //register on `'*'` to cover the whole form:
     * const validators: GValidators<SignUpForm> = {
     *     '*': new GValidator().withSchema(zodSchema)
     * }.
     */
    withSchema(schema: StandardSchemaV1): GValidator<T> {
        let cacheSig: string | undefined;
        let cacheResult: StandardSchemaV1Result<unknown> | undefined;

        if (__DEV__) {
            var warnedAsync = false;
        }

        const handler: GCustomValidatorHandler<T> = (input, fields) => {
            const values = _toRawData(fields);
            const sig = JSON.stringify(values, _depsReplacer);

            let result = sig === cacheSig ? cacheResult : undefined;
            if (!result) {
                const out = schema['~standard'].validate(values);
                if (out instanceof Promise) {
                    if (__DEV__ && !warnedAsync) {
                        warnedAsync = true;
                        console.warn(`DEV ONLY - [Async Schema] - 'withSchema' received a schema whose 'validate' is asynchronous; a synchronous validator can't block on it. Use 'withSchemaAsync' instead.`);
                    }
                    return false;
                }
                cacheSig = sig;
                result = cacheResult = out;
            }

            return _applySchemaResult(result, input);
        };

        return this.withCustomValidation(handler);
    }

    /**
     * Validate every field against a whole-object schema.
     *
     * Async variant of `withSchema`, for schemas whose `validate` returns a Promise.
     * Yup (async-first), or Zod/Valibot/ArkType schemas with async refinements. routes issues by
     * `formKey` exactly like `withSchema`, but runs on the debounced async-validation path (see the
     * `debounce` prop). `await` transparently handles a synchronous `validate` too.
     *
     * @example
     * const yupSchema = yup.object({
     *     email: yup.string().email('enter a valid email').required('this field is required'),
     *     password: yup.string().min(8, 'at least 8 characters').required('this field is required'),
     *     confirm: yup
     *         .string()
     *         .oneOf([yup.ref('password')], 'passwords must match')
     *         .required('this field is required'),
     * });
     *
     * //register on `'*'` to cover the whole form:
     * const validators: GValidators<SignUpForm> = {
     *     '*': new GValidator().withSchemaAsync(yupSchema)
     * }.
     */
    withSchemaAsync(schema: StandardSchemaV1): GValidator<T> {
        let cacheSig: string | undefined;
        let cachePromise: Promise<StandardSchemaV1Result<unknown>> | undefined;

        const handler: GCustomValidatorHandlerAsync<T> = async (input, fields) => {
            const values = _toRawData(fields);
            const sig = JSON.stringify(values, _depsReplacer);

            if (sig !== cacheSig || !cachePromise) {
                cacheSig = sig;
                cachePromise = Promise.resolve(schema['~standard'].validate(values));
            }

            const result = await cachePromise;
            return _applySchemaResult(result, input);
        };

        return this.withCustomValidationAsync(handler);
    }

    private __addConstraintValidationHandler(validityKey: keyof ValidityState, message: string | GConstraintValidator): GValidator<T> {
        if (__DEV__ && this.track) {
            if (this.track.includes(validityKey)) {
                console.warn(`DEV ONLY - [Duplicate Handlers] - handler for '${validityKey}' has already been defined`);
            }
            this.track.push(validityKey);
        }

        const constraintHandler = (input: GInputState<T>, key?: keyof ValidityState) => {
            if (__DEV__) {
                if (validityKey && validityMap[validityKey] && typeof input[validityMap[validityKey]] === 'undefined') {
                    console.warn(`DEV ONLY - [Missing Prop] - the input '${input.formKey}' has registered validator for the violation '${validityKey}' but the input hasn't described the constraint '${validityMap[validityKey]}'.\nadd '${validityMap[validityKey]}' to the input props.\nexample:\n<GInput formKey='${input.formKey}' ${validityMap[validityKey]}={...} />\n\nor either remove '.${handlersMap[validityMap[validityKey]]}(...)' validation`);
                }
            }

            if (key === validityKey) {
                input.errorText = typeof message === 'string' ? message : message(input);
                return true;
            }
            return false;
        };

        Object.defineProperty(constraintHandler, 'name', {value: `constraintHandler_${validityKey}`});

        this._constraintHandlers.push(constraintHandler);

        return this;
    }
}