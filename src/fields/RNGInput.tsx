import React, { forwardRef, useEffect, useMemo } from 'react';
import { TextInput } from 'react-native';

import { useGenericFormContext } from "../context";
import { _debounce } from '../helpers';
import type { GInputState, RNGInputProps } from '.';

export const RNGInput = forwardRef<any, RNGInputProps>(({ formKey, element, type, validatorKey, fetch, fetchDeps = [], defaultValue, value, debounce = 300, ...rest }, ref) => {
    const { state: { fields }, _updateInputHandler, _dispatchChanges, _viHandler, _createInputChecker } = useGenericFormContext();
    const inputState = fields[formKey];

    const _element = useMemo(() => {
        const value = inputState.value || '';

        const _props = {
            ...rest,
            value,
            inputMode: type,
            ref
        };

        _props.onEndEditing = (e) => {
            _viHandler(inputState);
            rest.onEndEditing && rest.onEndEditing(e);
        };
        _props.onChangeText = (e) => {
            _updateInputHandler(formKey, undefined, {value: e});
            rest.onChangeText && rest.onChangeText(e);
        };

        if (element) {
            return (element as (input: GInputState, props: any) => JSX.Element)(inputState, _props);
        }

        return <TextInput {..._props}/>;
    }, [inputState, element]);

    const _fetchDeps = useMemo(() => fetchDeps.map(key => fields[key].value), [fields]);

    useEffect(() => {
        inputState.checkValidity = () => {
            const result = _createInputChecker(inputState);
            _dispatchChanges(inputState, formKey);
            return result;
        };
        _dispatchChanges(inputState, formKey);
    }, []);

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