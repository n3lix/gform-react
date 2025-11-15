import React, { useMemo, useEffect, forwardRef } from "react";
import type { ReactNode, MutableRefObject, FC } from "react";

import { useForm } from "./useForm";
import { _checkIfFormIsValid, _toRawData, _toURLSearchParams, _merge } from "./helpers";
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
        const values = useForm<T>(children as ReactNode, validators);
        const { state, _dispatchChanges, key, _viHandler } = values;

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
            if (onInit) {
                const _handler = (_c: void | PartialForm<T>) => _dispatchChanges({ fields: _merge<IForm<T> & { [key: string]: GInputState; }>({}, state.fields, _c) });
                const changes = onInit(formState);
                changes instanceof Promise ? changes.then(_handler) : _handler(changes);
            }

            const dipatchers: Record<string, Record<string, (changes: Partial<GInputState>) => void>> = {};
            
            if (__DEBUG__) {
                console.log('checking for initial values');
            }

            Object.values(state.fields).forEach(field => {
                dipatchers[field.formKey] = {
                    dispatchChanges: (changes: Partial<GInputState>) => _dispatchChanges(changes, field.formKey)
                };

                //we dont want to apply validation on empty fields so skip it.
                if (!field.value) return;

                if (__DEBUG__) {
                    console.log(`found input '${field.formKey}', applying validation(s)`);
                }
                /**
                * We have to manually check for validations (checkValidty() will not result with validty.tooShort = true).
                * If an element has a minimum allowed value length, its dirty value flag is true, its value was last changed by a user edit (as opposed to a change made by a script), its value is not the empty string, and the length of the element's API value is less than the element's minimum allowed value length, then the element is suffering from being too short.
                * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#setting-minimum-input-length-requirements:-the-minlength-attribute
                */
                _viHandler(field);
            });
            _dispatchChanges({fields: _merge(dipatchers, state.fields)});
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