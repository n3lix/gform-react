import {forwardRef, memo, type ReactNode, useEffect, useMemo} from 'react';
import {TextInput} from 'react-native';

import {_debounce, _makeSelectFields} from '../helpers';
import {useFormStore} from "../form-context";
import {useFormSelector} from "../hooks";
import type {GInputState, RNGInputProps} from '.';

const _RNGInput = forwardRef<any, RNGInputProps>((props, ref) => {
    const store = useFormStore();

    const {
        formKey,
        element,
        type,
        fetch,
        fetchDeps,
        debounce = 300,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        defaultValue,
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
    const _fetchDeps = useFormSelector(_makeSelectFields(fetchDeps));

    useEffect(() => {
        // constraint errors for initial values are baked at registration; this runs
        // custom/async validation and only re-renders if it changes (no native element in RN,
        // so getInputElement returns undefined and setCustomValidity is skipped)
        if (inputState.value) {
            store.handlers._validateInitialField(inputState, formKey, store.getInputElement(formKey));
        }
        return () => {
            if (__DEBUG__) {
                console.log('[GInput] -', 'unregistering input', `(${formKey})`);
            }
            store.unregisterField(formKey);
        };
    }, []);

    const _element = useMemo(() => {
        const value = inputState.value ?? '';

        const _props = {
            ...rest,
            value,
            inputMode: type,
            ref
        };

        _props.onEndEditing = rest.onEndEditing ?
            (e) => {
                store.handlers._blurHandler(inputState);
                rest.onEndEditing!(e);
            }
            :
            () => {
                store.handlers._blurHandler(inputState);
            };
        _props.onChangeText = rest.onChangeText ?
            (e) => {
                store.handlers._updateInputHandler(inputState, undefined, {value: e});
                rest.onChangeText!(e);
            }
            :
            (e) => {
                store.handlers._updateInputHandler(inputState, undefined, {value: e});
            };

        if (element) {
            return (element as (input: GInputState, props: any) => ReactNode)(inputState, _props);
        }

        return <TextInput {..._props}/>;
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

    return _element;
});

export const RNGInput = memo(_RNGInput);