import type {GInputInitialState, GInputState} from './fields';
import type {GChangeEvent, GDOMElement, IForm, PartialForm} from './form';
import type {GFormState, InitialState, RawData, RNGFormState, ToFormDataOptions, ToRawDataOptions, ToURLSearchParamsOptions} from './state';

export const isObject = (o: any): o is object => (o && typeof o === 'object' && !Array.isArray(o));

export const defaultFieldProps: { [key: string]: { value: string | number | boolean } } = {
    text: {value: ''},
    checkbox: {value: false},
    number: {value: 0}
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
        debounce,
        validatorKey
    } = input;
    const defaultProps = defaultFieldProps[type] || defaultFieldProps.text;
    const inputValue = value || defaultValue || checked || defaultChecked || defaultProps.value;

    return {
        formKey,
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

export const _findValidityKey = (validity: Partial<ValidityState>): keyof ValidityState | undefined => {
    for (const key in validity) {
        if (key !== 'valid' && validity[key as keyof ValidityState]) {
            if (__DEBUG__) {
                console.log('[findValidityKey] -', 'found validity key:', key);
            }
            return key as keyof ValidityState;
        }
    }
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
        case 'tel':
            return !/^\+?[0-9\s\-().]{7,}$/.test(value); // basic phone pattern
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

export const _checkIfFormIsValid = <T>(fields: IForm<T>): boolean => {
    for (const f in fields) {
        if (fields[f].error) {
            return false;
        }
    }
    return true;
};

export const _toRawData = <T>(fields: IForm<T> & {
    [key: string]: GInputState<any>
}, options: ToRawDataOptions<T> = {}): RawData<T> => {
    const data: { [key: string]: unknown } = {};

    const {include, exclude, transform} = options;

    if (include) {
        include.forEach(key => data[key as string] = fields[key]?.value);
    } else for (const f in fields) {
        data[f] = fields[f].value;
    }

    exclude?.forEach(key => delete data[key as string]);

    if (transform) {
        for (const key in transform) {
            const set = transform[key] as (value: GFormState<T>[typeof key]['value']) => any;
            data[key] = set(fields[key]?.value || fields[key]);
        }
    }

    return data as RawData<T>;
};

export const _toFormData = <T>(form: HTMLFormElement | null, options?: ToFormDataOptions<T>): FormData => {
    if (!form) return new FormData();

    if (options) {
        const {exclude, include, transform} = options;
        let formData: FormData;

        if (include) {
            formData = new FormData();
            include.forEach(key => formData.set(key as string, form[key as string]?.value));
        } else {
            formData = new FormData(form);
            exclude?.forEach(key => formData.delete(key as string));
        }

        if (transform) {
            for (const key in transform) {
                const set = transform[key] as (value: GFormState<T>[typeof key]['value']) => any;
                formData.set(key, set(form[key]?.value));
            }
        }
        return formData;

    }

    return new FormData(form);
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

function __debounce(this: { [key: string]: { timerId: number } }, timeout: number, id: string): Promise<void> {
    return new Promise(resolve => {
        if (this[id]?.timerId)
            clearTimeout(this[id].timerId);

        const timerId = setTimeout(() => resolve(), timeout);

        if (this[id]) {
            this[id].timerId = timerId;
        } else this[id] = {timerId};
    });
}

export const _debounce = __debounce.bind({});

export const _extractValue = <T>(e?: GChangeEvent<GDOMElement | HTMLFormElement>, unknown?: {
    value: T
} | string | number): undefined | string | number | boolean | T => {
    if (e?.target) {
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

export const _buildFormState = <T>(fields: InitialState<T>['fields'], formElement: HTMLFormElement, dispatchChanges: (changes: Partial<InitialState> | Partial<GInputState>, key?: string) => void) => {
    const isFormValid = _checkIfFormIsValid(fields);

    const formState: GFormState<T> = {
        ...fields,
        isValid: isFormValid,
        isInvalid: !isFormValid,
        toRawData: (options?: ToRawDataOptions<T>) => _toRawData(fields, options),
        toFormData: () => _toFormData(formElement),
        toURLSearchParams: _toURLSearchParams,
        checkValidity: function () { // it has to be a function in order to refer to 'this'
            this.isValid = formElement && formElement.checkValidity() || false;
            this.isInvalid = !this.isValid;
            return this.isValid;
        },
        dispatchChanges: (changes: PartialForm<T> & {
            [key: string]: Partial<GInputState<any>>
        }) => dispatchChanges({
            fields: _merge<IForm<T> & {
                [key: string]: GInputState;
            }>({}, fields, changes)
        })
    };

    return formState;
};

export const _buildRNFormState = <T>(fields: InitialState<T>['fields'], dispatchChanges: (changes: Partial<InitialState> | Partial<GInputState>, key?: string) => void) => {
    const isFormValid = _checkIfFormIsValid(fields);

    const formState: RNGFormState<T> = {
        ...fields,
        isValid: isFormValid,
        isInvalid: !isFormValid,
        toRawData: (options?: ToRawDataOptions<T>) => _toRawData(fields, options),
        toURLSearchParams: _toURLSearchParams,
        checkValidity: () => {
            for (const i in fields) {
                const valid = fields[i].checkValidity();
                if (!valid) {
                    return false;
                }
            }
            return true;
        },
        dispatchChanges: (changes: PartialForm<T> & {
            [key: string]: Partial<GInputState<any>>
        }) => dispatchChanges({
            fields: _merge<IForm<T> & {
                [key: string]: GInputState;
            }>({}, fields, changes)
        })
    };

    return formState;
};