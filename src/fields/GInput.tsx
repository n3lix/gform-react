import React, {FormEvent, forwardRef, memo, type ReactNode, useEffect, useMemo} from 'react';

import {_debounce} from '../helpers';
import type {GInputProps, GInputState, GElementProps} from '.';
import {useFormSelector, useFormStore} from "../form-context";
import {makeSelectFields} from "../selectors";
import {type GDOMElement} from "../form";

const _GInput = forwardRef<HTMLInputElement, GInputProps>((props, ref) => {
    const store = useFormStore();

    const {
        formKey,
        element,
        title,
        type = 'text',
        fetch,
        fetchDeps,
        optimized,
        debounce = 300,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        defaultChecked,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        defaultValue,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        checked,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validatorKey,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        value,
        ...rest
    } = props;
    if (!store.getState().fields[formKey]) {
        if (__DEBUG__) {
            console.log('[GInput] -', 'registering input', `(${formKey})`, props);
        }
        store.registerField(props);
    }

    const inputState = useFormSelector(state => state.fields[formKey]);
    const _fetchDeps = useFormSelector(makeSelectFields(fetchDeps));

    useEffect(() => {
        if (inputState.value) {
            store.handlers._viHandler(inputState, {target: store.getInputElement(formKey)} as unknown as FormEvent<GDOMElement>);
        }
        return () => {
            if (__DEBUG__) {
                console.log('[GInput] -', 'unregistering input', `(${formKey})`);
            }
            store.unregisterField(formKey);
        };
    }, []);

    const _element = useMemo(() => {
        let value: any, checked;

        // file inputs stay uncontrolled (value left undefined): the DOM throws
        // InvalidStateError for non-empty file values. The selected File(s) are written
        // into the native FileList via a post-commit effect, not through `value`.
        const isFile = type === 'file';

        if (type === 'checkbox') checked = inputState.value || false;
        else if (type === 'number') value = inputState.value || 0;
        else if (!isFile) value = inputState.value || '';
        const _props = {
            ...rest,
            type,
            name: formKey,
            value: isFile ? undefined : value,
            checked: isFile ? undefined : checked,
            ref,
            'aria-invalid': inputState.error,
            'aria-required': inputState.required,
            title: title || inputState.errorText
        };

        if (!store.handlers.optimized || !optimized) {
            _props.onBlur = rest.onBlur ?
                (e) => {
                    store.handlers._viHandler(inputState, e);
                    rest.onBlur!(e);
                } : (e) => {
                    store.handlers._viHandler(inputState, e);
                };

            _props.onInvalid = rest.onInvalid ?
                (e) => {
                    e.preventDefault(); // hide default browser validation tooltip
                    store.handlers._viHandler(inputState, e);
                    rest.onInvalid!(e);
                } : (e) => {
                    e.preventDefault(); // hide default browser validation tooltip
                    store.handlers._viHandler(inputState, e);
                };

            _props.onChange = rest.onChange ?
                (e, unknown?: { value: unknown } | string | number) => {
                    store.handlers._updateInputHandler(inputState, e, unknown);
                    rest.onChange!(e);
                } : (e, unknown?: { value: unknown } | string | number) => {
                    store.handlers._updateInputHandler(inputState, e, unknown);
                };
        }

        if (element) {
            return (element as (input: GInputState, props: GElementProps<typeof value>) => ReactNode)(inputState, _props);
        }

        return (
            <input {..._props} />
        );
    }, [inputState, element]);

    useEffect(() => {
        if (fetch) {
            _debounce(debounce, `${inputState.gid}-fetch`).then(() => {
                const res = fetch(inputState, store.getState().fields);
                if (res instanceof Promise) {
                    res.then((state) => state && store.handlers._dispatchChanges(state, formKey));
                } else if (res) {
                    store.handlers._dispatchChanges(res, formKey);
                }
            });
        }
    }, [_fetchDeps]);

    /**
     * File inputs cannot be controlled through the `value` attribute — the DOM throws
     * `InvalidStateError` for any non-empty file value, and React maps a `files` prop to a
     * (useless) string attribute rather than the `FileList` property. So the field value
     * (a `File` / `File[]`) is the source of truth and is written into the native `FileList`
     * here, post-commit, via `DataTransfer`. This keeps programmatic updates (e.g. drag-and-drop
     * through `dispatchChanges`), the native picker, reset, and `toFormData()` consistent.
     */
    useEffect(() => {
        if (type !== 'file' || typeof DataTransfer === 'undefined') return;

        const el = store.getInputElement(formKey) as HTMLInputElement | undefined;
        if (!el) return;

        const next: File[] = inputState.value == null
            ? []
            : Array.isArray(inputState.value)
                ? inputState.value
                : [inputState.value as File];
        const current = el.files ? Array.from(el.files) : [];

        // skip when already in sync — avoids clobbering the native picker selection
        // and redundant FileList writes on unrelated re-renders
        const inSync = current.length === next.length && next.every((file, i) => file === current[i]);
        if (inSync) return;

        const dataTransfer = new DataTransfer();
        next.forEach((file) => dataTransfer.items.add(file));
        el.files = dataTransfer.files;
    }, [inputState.value, type]);

    return _element;
});

export const GInput = memo(_GInput);