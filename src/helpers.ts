import type {GInputInitialState, GInputState} from './fields';
import type {GChangeEvent, GDOMElement, IForm, PartialForm} from './form';
import type {GFormState, InitialState, RawData, RNGFormState, Store, ToFormDataOptions, ToRawDataOptions, ToURLSearchParamsOptions} from './state';
import type {FormHandlers} from "./useFormHandlers";

export const isObject = (o: any): o is object => (o && typeof o === 'object' && !Array.isArray(o));

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

export const _generateIdUnsafe = () => (+new Date()).toString(36) + (1 - Math.random()).toString(36).substring(2, 16);

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

/** qualifies a field's identity into the dotted addressing convention (`"billing.email"` for a
 * sectioned field, plain `"email"` otherwise) used by validator lookup, `validatorDeps`/
 * `fetchDeps`, the DOM `name` attribute, and schema `path` routing. Not used to key the internal
 * `fields` tree itself — see `_getField`/`_setField`/`_deleteField` for that. */
export const _qualifyKey = (formKey: string, sectionKey?: string): string =>
    sectionKey ? `${sectionKey}.${formKey}` : formKey;

export const _fieldKey = (input: Pick<GInputState<any>, 'formKey' | 'sectionKey'>): string =>
    _qualifyKey(input.formKey, input.sectionKey);

/** internal bookkeeping tag: a section container carries `sid` (generated the same way as a
 * field's `gid`); a field never does. This is the single source of truth for telling the two
 * apart in the tree — used by `useFormHandlers.ts` and `form-context.tsx` too. */
export const _isSection = (entry: unknown): entry is { sid: string; [formKey: string]: any } =>
    !!entry && typeof entry === 'object' && 'sid' in entry;

export const _getField = (fields: IForm<any>, formKey: string, sectionKey?: string): GInputState<any> | undefined => {
    if (!sectionKey) {
        const entry = fields[formKey];
        return _isSection(entry) ? undefined : (entry as GInputState<any> | undefined);
    }
    const section = fields[sectionKey];
    return _isSection(section) ? section[formKey] : undefined;
};

/** same as `_getField`, but addressed by one qualified string (`"billing.email"` or `"email"") —
 * for callers that only have the dotted addressing form (`validatorDeps`/`fetchDeps` entries, a
 * DOM `name` attribute). */
export const _resolveField = (fields: IForm<any>, key: string): GInputState<any> | undefined => {
    const dot = key.indexOf('.');
    return dot === -1 ? _getField(fields, key) : _getField(fields, key.slice(dot + 1), key.slice(0, dot));
};

export const _setField = (fields: IForm<any>, formKey: string, sectionKey: string | undefined, nextFieldState: GInputState<any>): IForm<any> => {
    if (!sectionKey) {
        return {...fields, [formKey]: nextFieldState};
    }
    // a colliding flat field's own properties (`value`, `gid`, …) are not section members —
    // discard them rather than spreading them in as if they were formKey-keyed entries.
    const existing = fields[sectionKey];
    const prevSection = _isSection(existing) ? existing : undefined;
    return {
        ...fields,
        [sectionKey]: {
            ...prevSection,
            sid: prevSection?.sid ?? _generateIdUnsafe(),
            [formKey]: nextFieldState
        }
    } as unknown as IForm<any>;
};

export const _deleteField = (fields: IForm<any>, formKey: string, sectionKey?: string): IForm<any> => {
    if (!sectionKey) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[formKey]: _removed, ...rest} = fields;
        return rest;
    }
    const existing = fields[sectionKey];
    const prevSection = _isSection(existing) ? existing : undefined;
    if (!prevSection) return fields;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {[formKey]: _removed, ...remaining} = prevSection;
    const stillHasMembers = Object.keys(remaining).some(key => key !== 'sid');
    if (!stillHasMembers) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[sectionKey]: _emptySection, ...restFields} = fields;
        return restFields;
    }
    return {...fields, [sectionKey]: remaining} as unknown as IForm<any>;
};

/** visits every leaf `GInputState` in the tree, recursing one level into any section container.
 * for operations that don't care about section grouping (validity checks, running validators).
 * for operations that need to preserve/rebuild the section grouping (serialization), see
 * `_rawValueOf` instead. */
export const _walkFields = (fields: IForm<any>, visit: (field: GInputState<any>) => void): void => {
    for (const key in fields) {
        const entry = fields[key];
        if (_isSection(entry)) {
            for (const formKey in entry) {
                if (formKey === 'sid') continue;
                visit(entry[formKey]);
            }
        } else {
            visit(entry as GInputState<any>);
        }
    }
};

/** resolves one top-level interface key's current "raw" value for serialization.
 * the whole section's fields grouped into one object for a section key, or the plain field `.value`
 * otherwise. Shared by `toRawData`/`toFormData`'s `include`/`transform` paths so they agree on what
 * a section key's value looks like. */
export const _rawValueOf = (fields: IForm<any>, key: string): unknown => {
    const entry = fields[key];
    if (!entry) return undefined;
    if (_isSection(entry)) {
        const section: { [formKey: string]: unknown } = {};
        for (const formKey in entry) {
            if (formKey === 'sid') continue;
            section[formKey] = entry[formKey].value;
        }
        return section;
    }
    return (entry as GInputState<any>).value;
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

export const _checkIfFormIsValid = (fields: IForm<any>): boolean => {
    let valid = true;
    _walkFields(fields, (field) => {
        if (field.error) valid = false;
    });
    return valid;
};

export const _toRawData = <T>(fields: IForm<any>, options: ToRawDataOptions<T> = {}): RawData<T> => {
    const data: { [key: string]: unknown } = {};

    const {include, exclude, transform} = options;

    if (include) {
        include.forEach(key => data[key as string] = _rawValueOf(fields, key as string));
    } else for (const f in fields) {
        data[f] = _rawValueOf(fields, f);
    }

    exclude?.forEach(key => delete data[key as string]);

    if (transform) {
        for (const key in transform) {
            const set = transform[key] as (value: any) => any;
            data[key] = set(_rawValueOf(fields, key));
        }
    }

    return data as RawData<T>;
};

export const _toFormData = <T>(
    form: HTMLFormElement | null,
    fields: IForm<any>,
    options?: ToFormDataOptions<T>,
): FormData => {
    if (!form) return new FormData();

    const {include, exclude, transform} = options ?? {};

    // a DOM `name` is the qualified `"sectionKey.formKey"` string for a sectioned input, but
    // `include`/`exclude` list top-level interface keys (`"billing"`, not `"billing.email"`) — so a
    // sectioned entry's key also matches its section-name prefix.
    const matchesKey = (domName: string, list: (keyof T)[]): boolean => {
        const dot = domName.indexOf('.');
        const section = dot === -1 ? undefined : domName.slice(0, dot);
        return list.includes(domName as keyof T) || (section !== undefined && list.includes(section as keyof T));
    };

    let formData: FormData = new FormData(form);
    if (include) {
        Array.from(formData.keys()).forEach(key => {
            if (!matchesKey(key, include)) {
                formData.delete(key);
            }
        });
    } else if (exclude) {
        Array.from(formData.keys()).forEach(key => {
            if (matchesKey(key, exclude)) formData.delete(key);
        });
    }

    if (transform) {
        for (const key in transform) {
            const set = transform[key] as (value: any) => any;
            formData.set(key, set(_rawValueOf(fields, key)));
        }
    }

    return formData;
};

export function _toURLSearchParams<T>(this: GFormState<T>, options?: ToURLSearchParamsOptions<T>): URLSearchParams {
    const data = this.toRawData(options);
    return new URLSearchParams(data as Record<string, any>); // URLSearchParams stringifies values (boolean/number)
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
            const current = target[key];
            if (_isSection(current)) {
                // a section: merge each member field individually rather than replacing the
                // whole container (which would drop the untouched members' gid/error/etc.)
                const section = {...current};
                for (const formKey in next[key]) {
                    section[formKey] = isObject(section[formKey]) ? {...section[formKey], ...next[key][formKey]} : next[key][formKey];
                }
                target[key] = section;
            } else {
                target[key] = current ? {...current, ...next[key]} : next[key];
            }
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

export const _buildFormState = <T = any>(fields: IForm<any>, formElement: HTMLFormElement, handlers: FormHandlers): GFormState<T> => {
    const isFormValid = _checkIfFormIsValid(fields);

    const formState = {
        ...fields,
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
        }, options?: { validate?: boolean }) => _formDispatch(fields, handlers._dispatchChanges, handlers._dispatchAndValidate, changes, options),
        reset: () => formElement.reset()
    };

    return formState as unknown as GFormState<T>;
};

export const _buildRNFormState = <T = any>(fields: IForm<any>, handlers: FormHandlers, getState: Store['getState'], onReset?: (state: RNGFormState<T>) => void): RNGFormState<T> => {
    const isFormValid = _checkIfFormIsValid(fields);

    const formState = {
        ...fields,
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
        }, options?: { validate?: boolean }) => _formDispatch(fields, handlers._dispatchChanges, handlers._dispatchAndValidate, changes, options),
        reset: () => {
            handlers._resetForm();
            if (onReset) {
                // rebuild from fresh post-reset fields
                const freshState = _buildRNFormState<T>(getState<T>().fields as unknown as IForm<any>, handlers, getState);
                onReset(freshState);
            }
        }
    };

    return formState as unknown as RNGFormState<T>;
};

const _formDispatch = <T>(
    fields: IForm<any>,
    dispatchChanges: (changes: Partial<InitialState> | Partial<GInputState>, formKey?: string, sectionKey?: string) => void,
    dispatchAndValidate: (changes: Partial<GInputState<any>>, formKey: string, sectionKey?: string) => void,
    changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> },
    options?: { validate?: boolean }
): void => {
    if (options?.validate) {
        for (const key in changes) {
            const entry = fields[key];
            if (_isSection(entry)) {
                const sectionChanges = changes[key] as unknown as { [formKey: string]: Partial<GInputState<any>> };
                for (const formKey in sectionChanges) {
                    dispatchAndValidate(sectionChanges[formKey], formKey, key);
                }
            } else {
                dispatchAndValidate(changes[key] as Partial<GInputState<any>>, key);
            }
        }
        return;
    }

    dispatchChanges({
        fields: _merge<IForm<T> & {
            [key: string]: GInputState;
        }>({}, fields, changes)
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

/**
 * flattens an `onInit`/`dispatchChanges({validate:false})`-shaped partial-changes object into the
 * qualified key list `_seedInitial` expects (`"couponCode"`, `"billing.email"`). Section-ness is
 * decided from the *current* `fields` tree (authoritative), not from the shape of `changes` — a
 * section's partial-changes value (a map of formKey → partial field data) isn't otherwise
 * distinguishable from a `GValue`-branded field's own partial field data.
 */
export const _flattenChangeKeys = (fields: IForm<any>, changes: { [key: string]: any }): string[] => {
    const keys: string[] = [];
    for (const key in changes) {
        if (_isSection(fields[key])) {
            for (const formKey in changes[key]) keys.push(_qualifyKey(formKey, key));
        } else {
            keys.push(key);
        }
    }
    return keys;
};

export const _makeSelectFields = (keys: string[] = []) =>
    (state: InitialState): string | null => {
        const selected = keys.map((key) => JSON.stringify(_resolveField(state.fields, key)?.value, _depsReplacer)).join(', ');
        return selected.length ? selected : null;
    };