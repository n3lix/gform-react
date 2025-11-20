import React, {forwardRef, ReactNode, useEffect, useMemo} from 'react';

import { _debounce } from '../helpers';
import type { GInputProps, GInputState, GElementProps } from '.';
import {useFormSelector, createSelector, useFormStore} from "../form-context";

const selectFields = [(state) => state.fields];

export const makeSelectFields = (keys: string[]) =>
    createSelector(
        selectFields,
        (fields) => {
            const selected = keys.map((key) => fields[key]).filter(Boolean);
            return selected.length ? selected : null;
        }
    );

export const GInput = forwardRef<HTMLInputElement, GInputProps>(({ formKey, element, title, type, validatorKey, fetch, fetchDeps = ['unknown'], optimized, defaultChecked, defaultValue, checked, value, debounce=300, ...rest }, ref) => {
    const inputState = useFormSelector(state => state.fields[formKey]);
    const handlers = useFormStore().handlers;

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

        if (!handlers.formOptimized || !optimized) {
            _props.onBlur = (e) => {
                handlers._viHandler(inputState, e);
                rest.onBlur && rest.onBlur(e);
            };
            _props.onInvalid = (e) => {
                e.preventDefault(); // hide default browser validation tooltip
                handlers._viHandler(inputState, e);
                rest.onInvalid && rest.onInvalid(e);
            };
            _props.onChange = (e, unknown?: { value: unknown } | string | number) => {
                handlers._updateInputHandler(inputState, e, unknown);
                rest.onChange && rest.onChange(e);
            };
        }

        if (element) {
            return (element as (input: GInputState, props: GElementProps<typeof value>) => ReactNode)(inputState, _props);
        }

        return (
            <input {..._props} />
        );
    }, [inputState, element]);

    // const selector = useMemo(() => makeSelectFields(fetchDeps), [fetchDeps]);
    const _fetchDeps = useFormSelector(makeSelectFields(fetchDeps));

    const stableFetchDeps = useMemo(() => JSON.stringify(_fetchDeps), [_fetchDeps]);

    useEffect(() => {
        if (fetch) {
            inputState.dispatchChanges = (changes: Partial<GInputState>) =>
                handlers._dispatchChanges(changes, formKey);

            _debounce(debounce, `${inputState.gid}-fetch`).then(() => {
                const res = fetch(inputState, _fetchDeps);
                if (res instanceof Promise) {
                    res.then((state) => state && handlers._dispatchChanges(state, formKey));
                } else {
                    res && handlers._dispatchChanges(res, formKey);
                }
            });
        }
    }, [stableFetchDeps]);

    return _element;
});