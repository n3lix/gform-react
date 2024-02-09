import type { Dispatch, SetStateAction } from "react";
import type { IForm, PartialForm } from "./form";
import type { GInputState } from "./fields";

export type RawData<T> = {
    [key in keyof T]: T[key];
};

export type InitialState<T> = {
    fields: IForm<T> & { [key: string]: GInputState<any> };
    loading: boolean;
};

export type ToURLSearchParamsOptions<T> = {
    exclude?: (keyof T)[];
    include?: (keyof T)[];
    transform?: {
        [key in keyof T]?: (value: GFormState<T>[key]['value']) => any;
    };
};

export type ToRawDataOptions<T> = ToURLSearchParamsOptions<T>;

export type ToFormDataOptions<T> = ToURLSearchParamsOptions<T>;

export type RNGFormState<T> = IForm<T>
    &
    {
        /**indicates whether the form is valid */
        isValid: boolean;
        /**indicates whether the form is invalid */
        isInvalid: boolean;
        /**returns the loading state */
        loading: boolean;
        /**returns an object with key value pairs represents the form*/
        toRawData(options?: ToRawDataOptions<T>): RawData<T>;
        /**returns `URLSearchParams` instance represents the form*/
        toURLSearchParams(options?: ToURLSearchParamsOptions<T>): URLSearchParams;
        /**update the loading state */
        setLoading: Dispatch<SetStateAction<boolean>>;
        /**update the validity state (invokes all defined validators) */
        checkValidity(): boolean;
        /**manually dispatch any changes to input(s) */
        dispatchChanges: (changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> }) => void;
    };

export type GFormState<T> = IForm<T> & RNGFormState<T>
    &
    {
        /**returns `FormData` instance represents the form*/
        toFormData(options?: ToFormDataOptions<T>): FormData;
    };