import React, { forwardRef, useEffect, useMemo } from 'react';

import { useGenericFormContext } from "../context";
import { _debounce } from '../helpers';
import type { GInputProps, GInputState, GElementProps } from '.';

export const GInput = forwardRef<HTMLInputElement, GInputProps>(({ formKey, element, title, type, validatorKey, fetch, fetchDeps = [], optimized, defaultChecked, defaultValue, checked, value, debounce=300, ...rest }, ref) => {
    const { state: { fields }, _updateInputHandler, _validateInputHandler, _dispatchChanges, optimized: formOptimized } = useGenericFormContext();
    const inputState = fields[formKey];

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

        if (!formOptimized || !optimized) {
            _props.onBlur = (e) => {
                _validateInputHandler(inputState, e);
                rest.onBlur && rest.onBlur(e);
            };
            _props.onInvalid = (e) => {
                e.preventDefault(); // hide default browser validation tooltip
                _validateInputHandler(inputState, e);
                rest.onInvalid && rest.onInvalid(e);
            };
            _props.onChange = (e, unknown?: { value: unknown } | string | number) => {
                _updateInputHandler(formKey, e, unknown);
                rest.onChange && rest.onChange(e);
            };
        }

        if (element) {
            return (element as (input: GInputState, props: GElementProps<typeof value>) => JSX.Element)(inputState, _props);
        }

        return (
            <input {..._props} />
        );
    }, [inputState, element]);

    const _fetchDeps = useMemo(() => fetchDeps.map(key => fields[key].value), [fields]);

    useEffect(() => {
        if (fetch) {
            _debounce(debounce, `${inputState.gid}-fetch`).then(() => {
                const res = fetch(inputState, fields);
                res instanceof Promise ? res.then((state) => state && _dispatchChanges(state, formKey)) : res && _dispatchChanges(res, formKey);
            });
        }
    }, _fetchDeps);

    return _element;
});