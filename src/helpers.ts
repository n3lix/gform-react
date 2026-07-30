import type {GInputInitialState, GInputState} from './fields';
import type {FlatFields, GChangeEvent, GDOMElement, PartialForm} from './form';
import type {GFormState, InitialState, RawData, RNGFormState, ToFormDataOptions, ToRawDataOptions, ToURLSearchParamsOptions} from './state';

/** The subset of form handlers the form-state builders need (avoids importing `useFormHandlers`). */
type FormHandlers = {
    _dispatchChanges: (changes: Partial<InitialState> | Partial<GInputState>, key?: string) => void;
    _dispatchAndValidate: (changes: Partial<GInputState<any>>, key: string) => void;
    _validateForm: (full?: boolean) => boolean;
};

export const isObject = (o: any): o is object => (o && typeof o === 'object' && !Array.isArray(o));

export const _qualifyKey = (formKey: string, sectionKey?: string): string =>
    sectionKey ? `${sectionKey}.${formKey}` : formKey;

export const _fieldKey = (input: Pick<GInputState<any>, 'formKey' | 'sectionKey'>): string =>
    _qualifyKey(input.formKey, input.sectionKey);

export const defaultFieldProps: { [key: string]: { value: string | number | boolean | File | File[] | null } } = {
    text: {value: ''},
    checkbox: {value: false},
    number: {value: 0},
    file: {value: null}
};

const typeValueDict: { [key: string]: keyof HTMLFormElement | GDOMElement } = {
    checkbox: 'checked',
    number: 'valueAsNumber',
};

const _generateIdUnsafe = () => (+new Date()).toString(36) + (1 - Math.random()).toString(36).substring(2, 16);

export const _buildInputInitialValues = <T>(input: GInputInitialState): GInputState<T> => {
    if (__DEBUG__) {
        console.log('[_buildInputInitialValues] -', 'building initial values for ', input.formKey);
    }

    const {
        required = false,
        max,
        maxLength,
        min,
        minLength,
        step,
        pattern,
        type = "text",
        defaultValue,
        value,
        checked,
        defaultChecked,
        formKey,
        sectionKey,
        debounce,
        validatorKey
    } = input;
    const defaultProps = defaultFieldProps[type] || defaultFieldProps.text;
    const inputValue = value || defaultValue || checked || defaultChecked || defaultProps.value;

    return {
        formKey,
        sectionKey,
        type,
        required,
        max,
        maxLength,
        min,
        minLength,
        step,
        pattern,
        value: inputValue,
        validatorKey,
        debounce,
        dirty: false,
        touched: false,
        gid: _generateIdUnsafe(),
        error: false,
        errorText: '',
        //eslint-disable-next-line @typescript-eslint/no-unused-vars
        dispatchChanges<C>(changes: Partial<GInputState | C>) {
        },
        checkValidity(): boolean {
            return false;
        }
    };
};

/**
 * `typeMismatch` is deferred rather than returned immediately: if any other violation (notably
 * `patternMismatch`, which is almost always stricter for `email`/`url`) is also set, that one
 *  wins instead. `typeMismatch` is only returned as a fallback when it's the sole violation.
 */
export const _findValidityKey = (validity: Partial<ValidityState>): keyof ValidityState | undefined => {
    let deferredTypeMismatch: keyof ValidityState | undefined;

    for (const key in validity) {
        if (key !== 'valid' && validity[key as keyof ValidityState]) {
            if (key === 'typeMismatch') {
                deferredTypeMismatch = 'typeMismatch';
                continue;
            }
            if (__DEBUG__) {
                console.log('[findValidityKey] -', 'found validity key:', key);
            }
            return key as keyof ValidityState;
        }
    }
    return deferredTypeMismatch;
};

export const _checkTypeMismatch = (input: GInputState<any>) => {
    const value = input.value?.toString().trim();
    if (!value) return false;

    switch (input.type) {
        case 'email':
            return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); // basic email pattern
        case 'url':
            try {
                new URL(value);
                return false;
            } catch {
                return true;
            }
        default:
            return false;
    }
};


export const _hasSubmitter = (form?: HTMLFormElement | null): boolean => {
    if (!form) return false;

    for (const element of form) {
        if ((element as HTMLInputElement).type === 'submit') return true;
    }

    return false;
};

export const _checkIfFormIsValid = (fields: FlatFields): boolean => {
    for (const f in fields) {
        if (fields[f].error) {
            return false;
        }
    }
    return true;
};

const _groupBySection = <R>(fields: { [key: string]: GInputState<any> }, extract: (field: GInputState<any>) => R): { [key: string]: any } => {
    const out: { [key: string]: any } = {};
    for (const key in fields) {
        const field = fields[key];
        const value = extract(field);
        if (field.sectionKey) {
            (out[field.sectionKey] ??= {})[field.formKey] = value;
        } else {
            out[field.formKey] = value;
        }
    }
    return out;
};

export const _toRawData = <T>(fields: FlatFields<T>, options: ToRawDataOptions<T> = {}): RawData<T> => {
    const {include, exclude, transform} = options;

    const full = _groupBySection(fields, f => f.value);

    let data: { [key: string]: unknown };
    if (include) {
        data = {};
        include.forEach(key => data[key as string] = full[key as string]);
    } else {
        data = full;
    }

    exclude?.forEach(key => delete data[key as string]);

    if (transform) {
        for (const key in transform) {
            const set = transform[key] as (value: unknown) => any;
            data[key] = set(full[key]);
        }
    }

    return data as RawData<T>;
};

export const _toFormData = <T>(
    form: HTMLFormElement | null,
    fields: FlatFields<T>,
    options?: ToFormDataOptions<T>,
): FormData => {
    if (!form) return new FormData();

    const {include, exclude, transform} = options ?? {};

    const formData: FormData = new FormData(form);

    const matchesKey = (key: string, list: (keyof T)[]): boolean => {
        const dot = key.indexOf('.');
        const section = dot === -1 ? undefined : key.slice(0, dot);
        return list.includes(key as keyof T) || (section !== undefined && list.includes(section as keyof T));
    };

    if (include) {
        Array.from(formData.keys()).forEach(key => {
            if (!matchesKey(key, include)) formData.delete(key);
        });
    } else if (exclude) {
        Array.from(formData.keys()).forEach(key => {
            if (matchesKey(key, exclude)) formData.delete(key);
        });
    }

    if (transform) {
        const full = _groupBySection(fields, f => f.value);
        for (const key in transform) {
            const set = transform[key] as (value: unknown) => any;
            formData.set(key, set(full[key]));
        }
    }

    return formData;
};

export function _toURLSearchParams<T>(this: GFormState<T>, options?: ToURLSearchParamsOptions<T>): URLSearchParams {
    let data: Record<keyof T, any>;
    if (options) {
        const {exclude, include, transform} = options;
        if (include) {
            data = {} as Record<keyof T, any>;
            include.forEach(key => (data[key] = this[key]?.value));
        } else {
            data = this.toRawData();
            exclude?.forEach(key => delete data[key]);
        }

        if (transform) {
            for (const key in transform) {
                const set = transform[key] as (value: GFormState<T>[typeof key]['value']) => any;
                (data[key] = set(this[key]?.value));
            }
        }
    } else data = this.toRawData();

    return new URLSearchParams(data); // this is ok because URLSearchParams will stringify the values (boolean/number)
}

const _debounceTimers: { [key: string]: ReturnType<typeof setTimeout> } = {};

export const _debounce = (timeout: number, id: string): Promise<void> =>
    new Promise(resolve => {
        if (_debounceTimers[id]) clearTimeout(_debounceTimers[id]);

        _debounceTimers[id] = setTimeout(() => {
            // drop the entry once it fires so the timer map doesn't grow unbounded
            delete _debounceTimers[id];
            resolve();
        }, timeout);
    });

/** cancel any pending debounce(s) by id and drop their entries (called on field unmount) */
export const _clearDebounce = (...ids: string[]): void => {
    for (const id of ids) {
        if (_debounceTimers[id]) {
            clearTimeout(_debounceTimers[id]);
            delete _debounceTimers[id];
        }
    }
};

export const _extractValue = <T>(e?: GChangeEvent<GDOMElement | HTMLFormElement>, unknown?: {
    value: T
} | string | number): undefined | string | number | boolean | File | File[] | null | T => {
    if (e?.target) {
        if (e.target.type === 'file') {
            const {files, multiple} = e.target as HTMLInputElement;
            if (!files) return multiple ? [] : null;
            return multiple ? Array.from(files) : (files[0] ?? null);
        }
        if (Object.hasOwn(typeValueDict, e.target.type)) return e.target[typeValueDict[e.target.type] as 'value'];
        return e.target.value;
    }
    return (e?.value as T) || (isObject(unknown) ? unknown.value : unknown);
};

export const _checkResult = (handlerResult: boolean | RegExp | string, value: string | number | boolean): boolean => typeof handlerResult === 'boolean' ? handlerResult : typeof value === 'string' ? typeof handlerResult === 'string' ? !new RegExp(handlerResult).test(value) : !handlerResult.test(value) : false;

export const _merge = <T extends object>(target: { [key: string]: any } = {}, ...nodes: ({
    [key: string]: any
} | undefined | void)[]): T => {
    if (!nodes.length) return target as T;

    const next = nodes.shift();
    if (isObject(next)) {
        for (const key in next) {
            target[key] = target[key] ? {...target[key], ...next[key]} : next[key];
        }
    }

    return _merge(target, ...nodes);
};

export const _mergeRefs = <T>(
    refA: React.Ref<T> | undefined,
    refB: React.Ref<T> | undefined
) => {
    return (value: T | null) => {
        if (typeof refA === 'function') {
            refA(value);
        } else if (refA) {
            refA.current = value;
        }

        if (typeof refB === 'function') {
            refB(value);
        } else if (refB) {
            refB.current = value;
        }
    };
};

export const _buildFormState = <T>(fields: InitialState<T>['fields'], formElement: HTMLFormElement, handlers: FormHandlers): GFormState<T> => {
    const isFormValid = _checkIfFormIsValid(fields);

    const formState = {
        ..._groupBySection(fields, f => f),
        isValid: isFormValid,
        isInvalid: !isFormValid,
        toRawData: (options?: ToRawDataOptions<T>) => _toRawData(fields, options),
        toFormData: (options?: ToFormDataOptions<T>) => _toFormData(formElement, fields, options),
        toURLSearchParams: _toURLSearchParams,
        checkValidity: function () { // it has to be a function in order to refer to 'this'
            const nativeValid = formElement ? formElement.checkValidity() : false;
            if (!nativeValid) {
                this.isValid = false;
                this.isInvalid = true;
                return false;
            }

            // run custom rules (the browser doesn't know them) then combine with native validity
            this.isValid = handlers._validateForm();
            this.isInvalid = !this.isValid;
            return this.isValid;
        },
        dispatchChanges: (changes: PartialForm<T> & {
            [key: string]: Partial<GInputState<any>>
        }, options?: { validate?: boolean }) => _formDispatch(fields, handlers._dispatchChanges, handlers._dispatchAndValidate, changes, options)
    };

    return formState as unknown as GFormState<T>;
};

export const _buildRNFormState = <T>(fields: InitialState<T>['fields'], handlers: FormHandlers): RNGFormState<T> => {
    const isFormValid = _checkIfFormIsValid(fields);

    const formState = {
        ..._groupBySection(fields, f => f),
        isValid: isFormValid,
        isInvalid: !isFormValid,
        toRawData: (options?: ToRawDataOptions<T>) => _toRawData(fields, options),
        toURLSearchParams: _toURLSearchParams,
        checkValidity: function () { // a function so it can refer to 'this'
            // no browser to enforce native constraints so we validate every field (constraints + custom);
            this.isValid = handlers._validateForm(true);
            this.isInvalid = !this.isValid;
            return this.isValid;
        },
        dispatchChanges: (changes: PartialForm<T> & {
            [key: string]: Partial<GInputState<any>>
        }, options?: { validate?: boolean }) => _formDispatch(fields, handlers._dispatchChanges, handlers._dispatchAndValidate, changes, options)
    };

    return formState as unknown as RNGFormState<T>;
};

export const _flattenChanges = (fields: InitialState['fields'], changes: { [key: string]: any }): { [key: string]: any } => {
    const sections = new Set<string>();
    for (const key in fields) {
        const sectionKey = fields[key].sectionKey;
        if (sectionKey) sections.add(sectionKey);
    }

    const flat: { [key: string]: any } = {};
    for (const key in changes) {
        if (sections.has(key)) {
            const section = changes[key];
            for (const formKey in section) {
                flat[_qualifyKey(formKey, key)] = section[formKey];
            }
        } else {
            flat[key] = changes[key];
        }
    }
    return flat;
};

const _formDispatch = <T>(
    fields: InitialState<T>['fields'],
    dispatchChanges: (changes: Partial<InitialState> | Partial<GInputState>, key?: string) => void,
    dispatchAndValidate: (changes: Partial<GInputState<any>>, key: string) => void,
    changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> },
    options?: { validate?: boolean }
): void => {
    const flatChanges = _flattenChanges(fields, changes);

    if (options?.validate) {
        for (const key in flatChanges) {
            dispatchAndValidate(flatChanges[key], key);
        }
        return;
    }

    dispatchChanges({
        fields: _merge<FlatFields<T>>({}, fields, flatChanges)
    });
};

/**
 * Determine the first violated constraint for an input. Short-circuits: each check runs only
 * until a violation is found. `pattern` is checked before `type` — mirrors `_findValidityKey`'s
 * deferral of `typeMismatch` in favor of a stricter `patternMismatch`, where applicable.
 */
export const _manualValidityKey = (input: GInputState<any>): keyof ValidityState | undefined => {
    const {value, required, minLength, maxLength, pattern, min, max} = input;

    if (required && (!value || (Array.isArray(value) && !value.length))) return 'valueMissing';
    if (pattern && _checkResult(pattern, value)) return 'patternMismatch';
    if (_checkTypeMismatch(input)) return 'typeMismatch';

    if (minLength || maxLength) {
        const {length} = value.toString();
        if (minLength && length < minLength) return 'tooShort';
        if (maxLength && length > maxLength) return 'tooLong';
    }

    if (min && Number(value) < Number(min)) return 'rangeUnderflow';
    if (max && Number(value) > Number(max)) return 'rangeOverflow';
};

export const _depsReplacer = (_key: string, value: unknown) => {
    if (typeof File !== 'undefined' && value instanceof File) {
        return `File:${value.name}:${value.size}:${value.lastModified}:${value.type}`;
    }
    if (typeof value === 'bigint') return `${value}n`;
    return value;
};

export const _makeSelectFields = (keys: string[] = []) =>
    (state: InitialState): string | null => {
        const selected = keys.map((key) => JSON.stringify(state.fields[key]?.value, _depsReplacer)).join(', ');
        return selected.length ? selected : null;
    };