import type {InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, HTMLInputTypeAttribute, ReactNode} from 'react';
import type { IForm } from '../form';
import type { TextInputProps } from 'react-native';

export {GInput} from './GInput';
export {RNGInput} from './RNGInput';

export type BaseGenericFieldProps = {
    /** the key which is used to identify the input */
    formKey: string;
    /** refer to another input validator */
    validatorKey?: string;
    type?: HTMLInputTypeAttribute | undefined;
    required?: boolean;
};

/**
 * Attributes common to the form controls `element` may render. Typed as the intersection of
 * `<input>`, `<select>`, and `<textarea>` attribute sets — an intersection is assignable to each
 * individually, so the resulting `GElementProps` can be spread onto any of them without a cast.
 * `onChange` and `ref` are intentionally omitted from the type (they're injected at runtime).
 */
type GControlAttributes = Omit<
    InputHTMLAttributes<any> & SelectHTMLAttributes<any> & TextareaHTMLAttributes<any>,
    'color' | 'size' | 'onChange' | 'min' | 'max' | 'step' | 'value'
>;

export type GElementProps<T> = GControlAttributes & {
    value: T;
    step?: number;
    max?: number;
    min?: number;
};

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
    dispatchChanges<C>(changes: Partial<GInputState | C>, options?: {validate?: boolean}): void;
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
type RNGInputElementHandler<T> = (input: GInputState<T>, props: TextInputProps) => ReactNode;

export type RNGInputProps = BaseGenericFieldProps & TextInputProps & {
    defaultValue?: string | number;
    /**a function that gets called once the input has initialized and may have deps (see `fetchDeps`) */
    fetch?: (state: GInputStateMutable, fields: IForm & { [key: string]: GInputStateMutable }) => void | Partial<GInputStateMutable> | Promise<void | Partial<GInputStateMutable>>;
    /**an array of input keys that once one the values have changed `fetch` will re-run */
    fetchDeps?: string[];
    /**
     * an array of input keys; when one of their values changes, this input is re-validated.
     * useful for cross-field rules (e.g. a confirm-password field that depends on `password`).
     * the field is only re-validated once it has been touched, so a dependency change never
     * surfaces an error on a field the user hasn't interacted with yet.
     */
    validatorDeps?: string[];
    /**
     * specify the debounce amount for validations in milliseconds
     * @default 300
     * */
    debounce?: number;
} & ({
    type?: 'text' | 'email' | 'tel' | 'url' | 'search';
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
    element?: RNGInputElementHandler<string>;
});

export type GInputProps = BaseGenericFieldProps & Omit<InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, 'value' | 'step' | 'min' | 'max' | 'minLength' | 'maxLength'> & {
    defaultChecked?: boolean;
    defaultValue?: string | number;
    checked?: boolean;
    /**a function that gets called once the input has initialized and may have deps (see `fetchDeps`) */
    fetch?: (state: GInputStateMutable, fields: IForm & { [key: string]: GInputStateMutable }) => void | Partial<GInputStateMutable> | Promise<void | Partial<GInputStateMutable>>;
    /**an array of input keys that once one the values have changed `fetch` will re-run */
    fetchDeps?: string[];
    /**
     * an array of input keys that when one of their values changes, this input is revalidated.
     * the field is only re-validated once it has been touched, so a dependency change never
     * surfaces an error on a field the user hasn't interacted with yet.
     */
    validatorDeps?: string[];
    /**
     * specify the debounce amount for validations in milliseconds
     * @default 300
     * */
    debounce?: number;
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
        /** allow selecting more than one file; changes the stored value to `File[]` */
        multiple?: boolean;
        /**
         * the selected file(s).
         * `File | null` for a single file, `File[]` when `multiple` is set.
         * Note: file inputs are uncontrolled — this reflects the current selection,
         * it cannot be used to programmatically set the input's files.
         */
        value?: File | File[] | null;
        element?: GInputElementHandler<File | File[] | null>;
    });