import type {GDOMElement, IForm, PartialForm} from "./form";
import type {GInputProps, GInputState, RNGInputProps} from "./fields";
import {useFormHandlers} from "./useFormHandlers";

export type RawData<T> = {
    [key in keyof T]: T[key];
};

export type InitialState<T = any> = {
    fields: IForm<T> & { [key: string]: GInputState<any> };
};

/**
 * options controlling how an object of type `T` is converted into URLSearchParams.
 *
 * @template T The shape of the source object being serialized.
 */
export type ToURLSearchParamsOptions<T> = {
    /**
     * a list of keys that should be excluded from the resulting URLSearchParams.
     *
     * useful when you want to omit internal metadata,
     * or values that should not appear in the query string.
     *
     * @example
     * // exclude "lastName" and "phone" from serialization
     * { exclude: ["lastName", "phone"] }
     */
    exclude?: (keyof T)[];

    /**
     * a list of keys that should be included in the resulting URLSearchParams.
     * when provided, only these keys will be serialized.
     *
     * if both `include` and `exclude` are provided, `exclude` takes precedence
     * for overlapping keys.
     *
     * @example
     * // only include these fields: "city" and "address"
     * { include: ["city", "address"] }
     */
    include?: (keyof T)[];

    /**
     * a map of per‑field transformation functions.
     * each function receives the field's raw value and returns the value
     * that should be written into the URLSearchParams.
     *
     * this is useful for:
     *   - formatting dates
     *   - converting arrays into comma‑separated strings
     *   - normalizing booleans
     *   - serializing complex objects
     *
     * If a key is not listed here, its value is used as‑is.
     *
     * @example
     * {
     *   transform: {
     *     createdAt: (date) => date.toISOString(),
     *     tags: (arr) => arr.join(","),
     *   }
     * }
     */
    transform?: {
        [key in keyof T]?: (value: GFormState<T>[key]["value"]) => any;
    };
};

/**
 * options controlling how an object of type `T` is converted into a plain
 * JavaScript object ("raw data"). this type is an alias of
 * `ToURLSearchParamsOptions<T>` and supports the same fields:
 * `include`, `exclude`, and `transform`.
 *
 * @template T the shape of the source object being serialized.
 */
export type ToRawDataOptions<T> = ToURLSearchParamsOptions<T>;

/**
 * options controlling how an object of type `T` is converted into a FormData
 * instance. this type is an alias of `ToURLSearchParamsOptions<T>` and supports
 * the same fields: `include`, `exclude`, and `transform`.
 *
 * @template T the shape of the source object being serialized.
 */
export type ToFormDataOptions<T> = ToURLSearchParamsOptions<T>;

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
        /**
         * manually dispatch any changes to one or more form inputs, keyed by `formKey`.
         * the provided `changes` object is shallow‑merged into the current form state.
         *
         * @param {Record<string, any>} changes
         *   a map of field keys to their new values. Each key corresponds to a form field.
         *
         * @param {Object} [options]
         *   additional configuration for how the update should be applied.
         *
         * @param {boolean} [options.validate=false]
         *   when `true`, validators for each changed field are re‑run using the new value.
         *   This ensures that:
         *     - stale errors are cleared if the new value is now valid
         *     - new errors are applied if the value is invalid
         *   when omitted or `false`, the update only merges values and does **not**
         *   modify `error` or `errorText` for any field.
         *
         *   this mirrors the behavior of field‑level `dispatchChanges(changes, { validate })`.
         *
         * @example
         * // Update a field silently (no validation)
         * dispatchChanges({ email: "test@example.com" });
         *
         * @example
         * // Update a field and re-run validation
         * dispatchChanges({ email: "test@example.com" }, { validate: true });
         */
        dispatchChanges: (changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> }, options?: { validate?: boolean }) => void;
    };


export type GFormState<T> = RNGFormState<T>
    &
    {
        /**returns `FormData` instance represents the form*/
        toFormData(options?: ToFormDataOptions<T>): FormData;
    };

export type Store = {
    getState: <T>() => InitialState<T>;
    setState: <T>(updater: InitialState<T> | ((state: InitialState<T>) => InitialState<T>)) => void;
    subscribe: (listener: () => void) => () => void;
    handlers: ReturnType<typeof useFormHandlers>;
    registerField: (config: GInputProps | RNGInputProps) => void;
    unregisterField: (formKey: string) => void;
    getInputElement: (formKey: string) => GDOMElement | undefined;
    optimized: boolean;
}