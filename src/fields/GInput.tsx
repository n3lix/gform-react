import React, {forwardRef, memo, type ReactNode, useEffect, useMemo} from 'react';

import {_debounce} from '../helpers';
import type {GInputProps, GInputState, GElementProps} from '.';
import {useFormSelector, useFormStore} from "../form-context";
import {makeSelectFields} from "../selectors";

const _GInput = forwardRef<HTMLInputElement, GInputProps>(({
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
}, ref) => {
    const inputState = useFormSelector(state => state.fields[formKey]);
    const store = useFormStore();

    const _element = useMemo(() => {
        let value: any, checked;

        if (type === 'checkbox') checked = inputState.value || false;
        else value = inputState.value || '';

        const _props = {
            ...rest,
            type,
            name: formKey,
            value,
            checked,
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

    const _fetchDeps = useFormSelector(makeSelectFields(fetchDeps));
    const stableFetchDeps = useMemo(() => JSON.stringify(_fetchDeps), [_fetchDeps]);

    useEffect(() => {
        if (fetch) {
            inputState.dispatchChanges = (changes: Partial<GInputState>) =>
                store.handlers._dispatchChanges(changes, formKey);

            _debounce(debounce, `${inputState.gid}-fetch`).then(() => {
                const res = fetch(inputState, store.getState().fields);
                if (res instanceof Promise) {
                    res.then((state) => state && store.handlers._dispatchChanges(state, formKey));
                } else if (res) {
                    store.handlers._dispatchChanges(res, formKey);
                }
            });
        }
    }, [stableFetchDeps]);

    return _element;
});

export const GInput = memo(_GInput);