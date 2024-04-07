import React, { useMemo, useRef, useEffect, forwardRef } from "react";
import type { ReactNode, HTMLAttributes, ChangeEvent, FormEvent, MutableRefObject, ClipboardEvent, FC } from "react";

import { useForm } from "./useForm";
import { _checkIfFormIsValid, _toRawData, _toFormData, _toURLSearchParams, _merge, hasSubmitter } from "./helpers";
import { GFormContextProvider } from "./context";
import type { GFormState, ToRawDataOptions } from "./state";
import type { GValidators } from "./validations";
import type { GChangeEvent, IForm, PartialForm } from "./form";
import type { GInputState } from "./fields";

export type GFormProps<T> = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onPaste' | 'onChange' | 'children'> & {
    children?: ReactNode | ReactNode[] | ((state: GFormState<T>) => ReactNode | ReactNode[]);
    /** @param loader - a component to display while loading (optional). */
    loader?: ReactNode;
    /** @param stateRef - pass a ref which will points to the current state of the form (optional). */
    stateRef?: MutableRefObject<GFormState<T> | undefined>;
    /** @param onSubmit - a handler for the form submission (optional). */
    onSubmit?: (state: GFormState<T>, e: FormEvent<HTMLFormElement>) => void;
    /** @param onChange - register onChange handler (optional). */
    onChange?: (state: GFormState<T>, e: FormEvent<HTMLFormElement>) => void;
    /** @param onPaste - register onPaste handler (optional). */
    onPaste?: (state: GFormState<T>, e: ClipboardEvent<HTMLFormElement>) => void;
    /** @param validators - an object for handling validations (optional). */
    validators?: GValidators<T>;
    /** @param onInit - execute a handler once the form has initialized (optional). */
    onInit?: (state: GFormState<T>) => void | PartialForm<T> | Promise<void | PartialForm<T>>;
    /** @param optimized - enable optimization by registering the required handlers on the form itself. 
     * @see {@link https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_delegation|EventDelegation}
     * @optional
    */
    optimized?: boolean;
};

/**
 * build dynamic forms with validations.
 * @link Docs - https://gform-react.onrender.com
 * @link Npm - https://www.npmjs.com/package/gform-react
 */
export const GForm: <T extends any>(props: GFormProps<T>) => ReturnType<FC<GFormProps<T>>> = (<T extends any>() => {
    return forwardRef<HTMLFormElement, GFormProps<T>>(({
        loader = <div>loading</div>,
        stateRef,
        onSubmit,
        onChange,
        onPaste,
        children,
        validators,
        onInit,
        optimized,
        ...rest
    }, ref) => {
        const formRef = useRef<HTMLFormElement | null>(null);
        const values = useForm<T>(children as JSX.Element | JSX.Element[], validators, optimized);
        const { state, _updateInputHandler, _viHandler, _dispatchChanges, key } = values;

        const refHandler = (element: HTMLFormElement | null) => {
            if (ref) {
                if (typeof ref === 'function') {
                    ref(element);
                } else {
                    ref.current = element;
                }
            }
            formRef.current = element;
        };

        const formState = useMemo(() => {
            const _isFormValid = _checkIfFormIsValid(state.fields);
            const formState: GFormState<T> = {
                ...state.fields,
                isValid: _isFormValid,
                isInvalid: !_isFormValid,
                loading: state.loading,
                toRawData: (options?: ToRawDataOptions<T>) => _toRawData(state.fields, options),
                toFormData: () => _toFormData(formRef.current),
                toURLSearchParams: _toURLSearchParams,
                checkValidity: function () { // it has to be function in order to refer to 'this'
                    this.isValid = formRef.current && formRef.current.checkValidity() || false;
                    this.isInvalid = !this.isValid;
                    return this.isValid;
                },
                setLoading: (p) => _dispatchChanges({ loading: typeof p === 'function' ? p(state.loading) : p }),
                dispatchChanges: (changes: PartialForm<T> & { [key: string]: Partial<GInputState<any>> }) => _dispatchChanges({ fields: _merge<IForm<T> & { [key: string]: GInputState; }>({}, state.fields, changes) })
            };

            if (stateRef) stateRef.current = formState;

            return formState;
        }, [state.fields]);

        const formComponent = useMemo(() => {
            const formChildren = typeof children === 'function' ? children(formState) : children;
            const _onSubmit = (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                if (formState.isValid && onSubmit) {
                    onSubmit(formState, e);
                }
            };

            let _onPaste;
            if (onPaste) {
                _onPaste = (e: ClipboardEvent<HTMLFormElement>) => onPaste(formState, e);
            }

            return optimized
                ?
                <form {...rest}
                    ref={refHandler}
                    onPaste={_onPaste}
                    onBlur={(e: GChangeEvent<HTMLFormElement>) => {
                        _viHandler(state.fields[e.target.name], e);
                    }}
                    onInvalid={(e: ChangeEvent<HTMLFormElement>) => {
                        e.preventDefault(); // hide default browser validation tooltip
                        _viHandler(state.fields[e.target.name], e);
                    }}
                    onChange={(e: GChangeEvent<HTMLFormElement>, unknown?: { value: unknown } | string | number) => {
                        _updateInputHandler(e.target.name, e, unknown);
                        onChange && onChange(formState, e);
                    }}
                    onSubmit={_onSubmit}>
                    {formChildren}
                </form>
                :
                <form {...rest} onChange={(e) => onChange && onChange(formState, e)} ref={refHandler} onSubmit={_onSubmit} onPaste={_onPaste}>
                    {formChildren}
                </form>;
        }, [formState, children]);

        useEffect(() => {
            if (__DEV__ && !hasSubmitter(formRef.current)) {
                console.warn(`[No Submit Button] - you have created a form without a button type=submit, this will prevent the onSubmit event from being fired.\nif you have a button with onClick event that handle the submission of the form then ignore this warning\nbut don't forget to manually invoke the checkValidity() function to check if the form is valid before perfoming any action, for example:\nif (formState.checkValidity()) { \n\t//do somthing\n}\n`);
            }

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