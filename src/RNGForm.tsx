import React, { useMemo, useEffect, forwardRef } from "react";
import type { ReactNode, MutableRefObject, FC } from "react";

import { useForm } from "./useForm";
import { _checkIfFormIsValid, _toRawData, _toURLSearchParams, _merge, _findValidityKey, _checkResult } from "./helpers";
import { GFormContextProvider } from "./context";
import type { RNGFormState, ToRawDataOptions } from "./state";
import type { GValidators } from "./validations";
import type { IForm, PartialForm } from "./form";
import type { GInputState } from "./fields";

export type RNGFormProps<T> = Omit<any, 'children'> & {
    children?: ReactNode | ReactNode[] | ((state: RNGFormState<T>) => ReactNode | ReactNode[]);
    /** @param loader - a component to display while loading (optional). */
    loader?: ReactNode;
    /** @param stateRef - pass a ref which will points to the current state of the form (optional). */
    stateRef?: MutableRefObject<RNGFormState<T> | undefined>;
    /** @param validators - an object for handling validations (optional). */
    validators?: GValidators<T>;
    /** @param onInit - execute a handler once the form has initialized (optional). */
    onInit?: (state: RNGFormState<T>) => void | PartialForm<T> | Promise<void | PartialForm<T>>;
    el: FC<any>;
};

/**
 * build dynamic forms with validations.
 * @link Docs - https://gform-react.onrender.com
 * @link Npm - https://www.npmjs.com/package/gform-react
 */
export const RNGForm: <T extends any>(props: RNGFormProps<T>) => ReturnType<FC<RNGFormProps<T>>> = (<T extends any>() => {
    return forwardRef<any, RNGFormProps<T>>(({
        loader = <div>loading</div>,
        stateRef,
        children,
        validators,
        onInit,
        el: El,
        ...rest
    }, ref) => {
        const values = useForm<T>(children as JSX.Element | JSX.Element[], validators);
        const { state, _dispatchChanges, key } = values;

        const formState = useMemo(() => {
            const _isFormValid = _checkIfFormIsValid(state.fields);
            const formState: RNGFormState<T> = {
                ...state.fields,
                isValid: _isFormValid,
                isInvalid: !_isFormValid,
                loading: state.loading,
                toRawData: (options?: ToRawDataOptions<T>) => _toRawData(state.fields, options),
                toURLSearchParams: _toURLSearchParams,
                checkValidity: () => {
                    for (const i in state.fields) {
                        const valid = state.fields[i].checkValidity();
                        if (!valid) {
                            return false;
                        }
                    }
                    return true;
                },
                setLoading: (p) => _dispatchChanges({ loading: typeof p === 'function' ? p(state.loading) : p }),
                dispatchChanges: (changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> }) => _dispatchChanges({ fields: _merge<IForm<T> & { [key: string]: GInputState; }>({}, state.fields, changes) })
            };

            if (stateRef) stateRef.current = formState;

            return formState;
        }, [state.fields]);

        useEffect(() => {
            const dispatchers = Object.keys(state.fields).reduce<{ [key: string]: Partial<GInputState> }>((fields, key) => {
                fields[key] = { dispatchChanges: (changes: Partial<GInputState>) => _dispatchChanges(changes, key) };
                return fields;
            }, {});

            if (onInit) {
                const _handler = (_c: void | PartialForm<T>) => {
                    _dispatchChanges({ fields: _merge<IForm<T> & { [key: string]: GInputState; }>({}, state.fields, dispatchers, _c) });
                };
                const changes = onInit(formState);
                changes instanceof Promise ? changes.then(_handler) : _handler(changes);
            }
            else {
                _dispatchChanges({ fields: _merge<IForm<T> & { [key: string]: GInputState; }>({}, state.fields, dispatchers) });
            }
        }, []);

        const formComponent = useMemo(() => {
            const formChildren = typeof children === 'function' ? children(formState) : children;

            return <El {...rest} ref={ref}>
                {formChildren}
            </El>;
        }, [formState, children]);

        return (
            <GFormContextProvider value={values} key={key}>
                {
                    state.loading
                        ?
                        loader
                        :
                        formComponent
                }
            </GFormContextProvider>
        );
    });
})();