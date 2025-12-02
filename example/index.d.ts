import type {
    Dispatch,
    HTMLAttributes,
    ReactNode,
    SetStateAction,
    HTMLInputTypeAttribute,
    FocusEvent,
    InvalidEvent,
    FormEventHandler,
    ChangeEventHandler,
    FocusEventHandler,
    EventHandler,
    SyntheticEvent,
    ChangeEvent,
    FormEvent,
    InputHTMLAttributes,
    FC,
    ClipboardEvent,
    RefObject, DetailedHTMLProps, FormHTMLAttributes, Ref
} from "react";
import type {TextInputProps} from "react-native";

export type RawData<T> = {
    [key in keyof T]: T[key];
};

export type ToRawDataOptions<T> = ToURLSearchParamsOptions<T>;
export type ToFormDataOptions<T> = ToURLSearchParamsOptions<T>;
export type ToURLSearchParamsOptions<T> = {
    exclude?: (keyof T)[];
    include?: (keyof T)[];
    transform?: {
        [key in keyof T]?: (value: GFormState<T>[key]['value']) => any;
    };
};

export type GConstraintValidator = (input: GInputState<any>) => string;
export type GConstraintValidatorHandler = (input: GInputState<any>, validityKey: keyof ValidityState | undefined) => boolean;
export type GCustomValidatorHandler<T> = (input: GInputState<any>, fields: IForm<T>) => RegExp | boolean;
export type GCustomValidatorHandlerAsync<T> = (input: GInputState<any>, fields: IForm<T>) => Promise<ReturnType<GCustomValidatorHandler<T>>>;
export type GInputValidator<T> = GValidator<T> | {
    handlers: GCustomValidatorHandler<T>[];
    constraintHandlers: GConstraintValidatorHandler[];
    asyncHandlers: GCustomValidatorHandlerAsync<T>[];
};
export type GValidators<T = any> = {
    [key in keyof T]?: GInputValidator<T>;
} & {
    [key: string]: GInputValidator<T> | undefined;
};

export type BaseGenericFieldProps = {
    /** the key which is used to identify the input */
    formKey: string;
    /** refer to another input validator */
    validatorKey?: string;
    type?: HTMLInputTypeAttribute | undefined;

    required?: boolean;
    max?: number;
    maxLength?: number;
    min?: number;
    minLength?: number;
    checked?: boolean;
    step?: number;
    pattern?: string | RegExp;
};

export type GElementProps<T> = Omit<InputHTMLAttributes<any>, 'color' | 'size' | 'onChange' | 'min' | 'max' | 'step'> & {
    value: T;
    step?: number
    max?: number;
    min?: number;
};

type PartialPick<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;

export type PartialForm<T> = Partial<{ [key in keyof T]: Partial<GInputStateMutable<T[key]>> }>;

export type IForm<T=any> = {
    [key in keyof T]: PartialPick<GInputState<T[key]>, 'checkValidity'>;
};

export type GDOMElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type GFormEvent<T = GDOMElement> = FormEvent<T>;
export type GChangeEvent<T = GDOMElement> = ChangeEvent<T> & {value?: unknown};
export type GFocusEvent<T = GDOMElement> = FocusEvent<T>;
export type GInvalidEvent <T = GDOMElement> = InvalidEvent<T>;

export type GFormEventHandler<T = GDOMElement> = FormEventHandler<T>;
export type GChangeEventHandler<T = GDOMElement> = ChangeEventHandler<T>;
export type GFocusEventHandler<T = GDOMElement> = FocusEventHandler<T>;
export type GInvalidEventHandler<T = GDOMElement> = EventHandler<SyntheticEvent<T>>;

export type GInputInitialState = BaseGenericFieldProps & {
    [key: string]: any;
    gid: string;
    dirty: boolean;
    touched: boolean;
};

export type GInputState<T = string | number | boolean> = GInputInitialState & {
    value: T;
    error: boolean;
    errorText: string;
    checkValidity(): boolean;
    dispatchChanges<C>(changes: Partial<GInputState | C>): void;
    debounce?: number;
};

export type GInputStateMutable<T = any> = GInputState<T> & {
    max?: number;
    maxLength?: number;
    min?: number;
    minLength?: number;
    checked?: boolean;
    step?: number;
    pattern?: string | RegExp;
    [key: string]: any;
};

type GInputElementHandler<T> = (input: GInputState<T>, props: GElementProps<T>) => ReactNode;

export type GInputProps = BaseGenericFieldProps & Omit<InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, 'value' | 'step' | 'min' | 'max' | 'minLength' | 'maxLength'> & {
    defaultChecked?: boolean;
    defaultValue?: string | number;
    checked?: boolean;
    /**a function that gets called once the input has initialized and may have deps (see `fetchDeps`) */
    fetch?: (state: GInputStateMutable, fields: IForm & { [key: string]: GInputStateMutable }) => void | Partial<GInputStateMutable> | Promise<void | Partial<GInputStateMutable>>;
    /**an array of input keys that once one the values have changed `fetch` will re-run */
    fetchDeps?: string[];
    /**
     * specify the debounce amount for validations in milliseconds
     * @default 300
     * */
    debounce?: number;
    optimized?: boolean;
} & ({
        type?: 'text' | 'password' | 'email' | 'tel' | 'url' | 'search';
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        value?: string;
        defaultValue?: string;
        /**a handler fer rendering the input
         * @param input the current state of the input
         * @param props the props of the input should be spread to the dom element 
         * @example <input {...props} /> //native
         * <InputText {...props} /> //Prime React
         * <TextField inputProps={props} /> //MUI
         */
        element?: GInputElementHandler<string>;
    }
    |
    {
        type: 'checkbox';
        checked?: boolean;
        value?: boolean;
        defaultChecked?: boolean;
        element?: GInputElementHandler<boolean>;
    }
    |
    {
        type: 'color';
        value?: string;
        defaultValue?: string;
        element?: GInputElementHandler<string>;
    }
    |
    {
        type: 'number' | 'range';
        value?: number;
        defaultValue?: number;
        min?: number;
        max?: number;
        step?: number;
        element?: GInputElementHandler<number>;
    }
    |
    {
        type: 'time' | 'week' | 'date' | 'month' | 'datetime-local';
        value?: string;
        defaultValue?: string;
        min?: number;
        max?: number;
        step?: number;
        element?: GInputElementHandler<string>;
    }
    |
    {
        type: 'file';
        defaultValue?: string;
        value?: string;
        element?: GInputElementHandler<string>;
    });

export declare const GInput: FC<GInputProps & {ref?: Ref<HTMLElement | null>}>;

export type GFormState<T> = IForm<T>
    &
    {
        /**indicates whether the form is valid */
        isValid: boolean;
        /**indicates whether the form is invalid */
        isInvalid: boolean;
        /**returns an object with key value pairs represents the form*/
        toRawData(options?: ToRawDataOptions<T>): RawData<T>;
        /**returns `FormData` instance represents the form*/
        toFormData(options?: ToFormDataOptions<T>): FormData;
        /**returns `URLSearchParams` instance represents the form*/
        toURLSearchParams(options?: ToURLSearchParamsOptions<T>): URLSearchParams;
        /**update the validity state (invokes all defined validators) */
        checkValidity(): boolean;
        /**manually dispatch any changes to input(s) */
        dispatchChanges: (changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> }) => void;
    };
    
/**a class for handling validations for input(s)
 * @example
 * const baseValidator = new GValidator().withRequiredMessage('this field is required');
 *
 * const validators: GValidators<SignInForm> = {
 *     username: new GValidator(baseValidator).withMinLengthMessage('...'),
 *     '*': baseValidator // a default validator for all other fields in the form
 * };
 */
export declare class GValidator<T = any> {
    get handlers(): GCustomValidatorHandler<T>[];
    get constraintHandlers(): GConstraintValidatorHandler[];
    get asyncHandlers(): GCustomValidatorHandlerAsync<T>[];
    constructor(baseValidator?: GValidator<T>);
    /**register a `valueMissing` violation handler (use this with `required` attribute) */
    withRequiredMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a `tooLong` violation handler (use this with `maxLength` attribute) */
    withMaxLengthMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a `tooShort` violation handler (use this with `minLength` attribute)*/
    withMinLengthMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a `patternMismatch` violation handler (use this with `pattern` attribute)*/
    withPatternMismatchMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a `badInput` violation handler */
    withBadInputMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a `rangeUnderflow` violation handler (use this with `min` attribute) */
    withRangeUnderflowMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a `rangeOverflow` violation handler (use this with `max` attribute) */
    withRangeOverflowMessage(message: string | GConstraintValidator): GValidator<T>;
    /**
     * register a `typeMismatch` violation handler<br />
     * if its possible use `pattern` attribute (and `withPatternMismatchMessage`) or `custom validation` instead.<br/>
     * use the `type` attribute to set the input's keyboard (for example type `'tel'` will show on mobile phones only numpads)
     * and then with `pattern` or `custom validation` you can validate it.<br/>
     * the reason for that is `type` is not a solid validation and likely will be replaced anyway.<br />
     * if `pattern` or `custom` are used, then `withTypeMismatchMessage` is ignored
     * */
    withTypeMismatchMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a `stepMismatch` violation handler (use this with `step` attribute)*/
    withStepMismatchMessage(message: string | GConstraintValidator): GValidator<T>;
    /**register a custom validation handler */
    withCustomValidation(handler: GCustomValidatorHandler<T>): GValidator<T>;
    /**register a custom validation async handler */
    withCustomValidationAsync(handler: GCustomValidatorHandlerAsync<T>): GValidator<T>;
}

export type GFormProps<T> = Omit<DetailedHTMLProps<FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, 'onSubmit' | 'onPaste' | 'onChange' | 'children'> & {
    children?: ReactNode | ReactNode[] | ((state: GFormState<T>) => ReactNode | ReactNode[]);
    /** @param stateRef - pass a ref which will points to the current state of the form (optional). */
    stateRef?: RefObject<GFormState<T> | undefined>;
    /** @param onSubmit - a handler for the form submission (optional). */
    onSubmit?: (state: GFormState<T>, e: FormEvent<HTMLFormElement>) => void;
    /** @param onChange - register onChange handler (optional). */
    onChange?: (state: GFormState<T>, e: FormEvent<HTMLFormElement>) => void;
    /** @param onChange - register onChange handler (optional). */
    onPaste?: (state: GFormState<T>, e: ClipboardEvent<HTMLFormElement>) => void;
    /** @param validators - an object for handling validations (optional). */
    validators?: GValidators<T>;
    /** @param onInit - execute a handler once the form has initialized (optional). */
    onInit?: (state: GFormState<T>) => void | PartialForm<T> | Promise<void | PartialForm<T>>;
    /** @param optimized - enable optimization by registering the required handlers on the form itself. 
     * @see {@link https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_delegation|EventDelegation}
     * @optional
    */
    optimized?: boolean;
    ref?: Ref<HTMLFormElement | null>;
};

/**
 * build dynamic forms with validations.
 * @link Docs - https://gform-react.onrender.com
 * @link Npm - https://www.npmjs.com/package/gform-react
 */
export const GForm: <T extends any>({stateRef,onSubmit,onChange,children,validators,onInit,optimized,...rest}: GFormProps<T>) => JSX.Element;