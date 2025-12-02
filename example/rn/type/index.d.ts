import type {RefObject, ReactNode, FC, Ref} from "react";
import type {TextInputProps, View, ViewProps} from 'react-native';
import type {BaseGenericFieldProps, GInputState, GInputStateMutable, GValidators, IForm, PartialForm, RawData, ToRawDataOptions, ToURLSearchParamsOptions} from '../../dist';

type RNGInputElementHandler<T> = (input: GInputState<T>, props: TextInputProps) => ReactNode;

export type RNGInputProps = BaseGenericFieldProps & TextInputProps & {
    defaultValue?: string | number;
    /**a function that gets called once the input has initialized and may have deps (see `fetchDeps`) */
    fetch?: (state: GInputStateMutable, fields: IForm & { [key: string]: GInputStateMutable }) => void | Partial<GInputStateMutable> | Promise<void | Partial<GInputStateMutable>>;
    /**an array of input keys that once one the values have changed `fetch` will re-run */
    fetchDeps?: string[];
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

export declare const RNGInput: FC<RNGInputProps & {ref?: MutableRefObject<any | null>}>;

export type RNGFormState<T> = IForm<T>
    &
    {
        /**indicates whether the form is valid */
        isValid: boolean;
        /**indicates whether the form is invalid */
        isInvalid: boolean;
        /**returns an object with key value pairs represents the form*/
        toRawData(options?: ToRawDataOptions<T>): RawData<T>;
        /**returns `URLSearchParams` instance represents the form*/
        toURLSearchParams(options?: ToURLSearchParamsOptions<T>): URLSearchParams;
        /**update the validity state (invokes all defined validators) */
        checkValidity(): boolean;
        /**manually dispatch any changes to input(s) */
        dispatchChanges: (changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> }) => void;
    };

export type RNGFormProps<T> = Omit<ViewProps, 'children'> & {
    children?: ReactNode | ReactNode[] | ((state: RNGFormState<T>) => ReactNode | ReactNode[]);
    /** @param loader - a component to display while loading (optional). */
    loader?: ReactNode;
    /** @param stateRef - pass a ref which will points to the current state of the form (optional). */
    stateRef?: RefObject<RNGFormState<T> | undefined>;
    /** @param validators - an object for handling validations (optional). */
    validators?: GValidators<T>;
    /** @param onInit - execute a handler once the form has initialized (optional). */
    onInit?: (state: RNGFormState<T>) => void | PartialForm<T> | Promise<void | PartialForm<T>>;
    el: FC<ViewProps>;
    ref?: Ref<View | null>;
};

/**
 * build dynamic forms with validations.
 * @link Docs - https://gform-react.onrender.com
 * @link Npm - https://www.npmjs.com/package/gform-react
 */
export const RNGForm: <T extends any>({stateRef,children,validators,onInit,...rest}: RNGFormProps<T>) => JSX.Element;