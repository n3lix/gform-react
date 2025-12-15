import React, {forwardRef, useEffect, useMemo, useRef, ForwardedRef} from "react";
import type {ChangeEvent, ClipboardEvent, FormEvent, ReactNode, RefObject, DetailedHTMLProps, FormHTMLAttributes, KeyboardEvent} from "react";

import {useFormSelector, GFormContextProvider, useFormStore} from "./form-context";
import {_buildFormInitialValues, _merge, _hasSubmitter, _mergeRefs, _buildFormState} from "./helpers";
import type {GFormState} from "./state";
import type {GChangeEvent, IForm, PartialForm} from "./form";
import type {GInputState} from "./fields";
import type {GValidators} from "./validations";

const FormRenderer = forwardRef<HTMLFormElement, GFormProps<any>>(
    <T, >({
        stateRef,
        onSubmit,
        onChange,
        onPaste,
        onKeyDown,
        onKeyUp,
        children,
        onInit,
        ...rest
    }: GFormProps<T>, ref: ForwardedRef<HTMLFormElement>) => {
        const formRef = useRef<HTMLFormElement>(null);
        const {handlers, getState} = useFormStore();
        const fields = useFormSelector(state => state.fields) as IForm<T>;

        const formComponent = useMemo(() => {
            const state = _buildFormState(fields, formRef.current!, handlers._dispatchChanges);
            const formChildren = typeof children === 'function' ? children(state) : children;

            const _onSubmit = (e: FormEvent<HTMLFormElement>) => {
                const state = _buildFormState(fields, formRef.current!, handlers._dispatchChanges);
                if (state.isValid && onSubmit) {
                    onSubmit(state, e);
                }
            };

            let _onPaste, _onChange, _onKeyDown, _onKeyUp;

            if (onPaste) {
                _onPaste = (e: ClipboardEvent<HTMLFormElement>) => onPaste(state, e);
            }

            if (onKeyDown) {
                _onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => onKeyDown(state, e);
            }

            if (onKeyUp) {
                _onKeyUp = (e: KeyboardEvent<HTMLFormElement>) => onKeyUp(state, e);
            }

            if (stateRef) stateRef.current = state;

            if (handlers.optimized) {
                if (onChange) {
                    _onChange = (e: GChangeEvent<HTMLFormElement>, unknown?: { value: unknown } | string | number) => {
                        handlers._updateInputHandler(state[e.target.name], e, unknown);
                        onChange(state, e);
                    };
                } else {
                    _onChange = (e: GChangeEvent<HTMLFormElement>, unknown?: { value: unknown } | string | number) => {
                        handlers._updateInputHandler(state[e.target.name], e, unknown);
                    };
                }
                return (
                    <form {...rest}
                        ref={_mergeRefs(ref, formRef)}
                        onPaste={_onPaste}
                        onKeyDown={_onKeyDown}
                        onKeyUp={_onKeyUp}
                        onBlur={(e: GChangeEvent<HTMLFormElement>) => handlers._viHandler(state[e.target.name], e)}
                        onInvalid={(e: ChangeEvent<HTMLFormElement>) => {
                            e.preventDefault(); // hide default browser validation tooltip
                            handlers._viHandler(state[e.target.name], e);
                        }}
                        onChange={_onChange}
                        onSubmit={_onSubmit}>
                        {formChildren}
                    </form>
                );
            }

            if (onChange) {
                _onChange = (e: GChangeEvent<HTMLFormElement>) => onChange(state, e);
            }

            return (
                <form {...rest}
                    ref={_mergeRefs(ref, formRef)}
                    onSubmit={_onSubmit}
                    onChange={_onChange}
                    onPaste={_onPaste}
                    onKeyDown={_onKeyDown}
                    onKeyUp={_onKeyUp}>
                    {formChildren}
                </form>
            );
        }, [children, fields]);

        useEffect(() => {
            const initialStateFields = getState<T>().fields;
            const state = _buildFormState<T>(initialStateFields, formRef.current!, handlers._dispatchChanges);

            if (__DEV__ && !_hasSubmitter(formRef.current)) {
                console.warn(`DEV ONLY - [No Submit Button] - you have created a form without a button type=submit, this will prevent the onSubmit event from being fired.\nif you have a button with onClick event that handle the submission of the form then ignore this warning\nbut don't forget to manually invoke the checkValidity() function to check if the form is valid before perfoming any action, for example:\nif (formState.checkValidity()) { \n\t//do somthing\n}\n`);
            }

            if (onInit) {
                const changes = onInit(state);
                if (changes) {
                    const _handler = (_c: void | PartialForm<T>) => handlers._dispatchChanges({
                        fields: _merge<IForm<T> & {
                            [key: string]: GInputState;
                        }>({}, state, _c)
                    });
                    if (changes instanceof Promise) {
                        changes.then(_handler);
                    } else _handler(changes);
                }
            }

            if (__DEBUG__) {
                console.log('checking for initial values');
            }

            for (const fieldKey in fields) {
                const field = fields[fieldKey];

                //we don't want to apply validation on empty fields, so skip it.
                if (!field.value) continue;

                if (__DEBUG__) {
                    console.log(`found input '${fieldKey}', applying validation(s)`);
                }
                /**
                 * We have to manually check for validations (checkValidity() will not result with validity.tooShort = true).
                 * If an element has a minimum allowed value length, its dirty value flag is true, its value was last changed by a user edit (as opposed to a change made by a script), its value is not the empty string, and the length of the element's API value is less than the element's minimum allowed value length, then the element is suffering from being too short.
                 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#setting-minimum-input-length-requirements:-the-minlength-attribute
                 */
                handlers._viHandler(field);
            }
        }, []);

        return formComponent;
    }
) as <T>(props: GFormProps<T> & { ref?: React.Ref<HTMLFormElement> }) => React.ReactElement | null;

export type GFormProps<T> =
    Omit<DetailedHTMLProps<FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, 'onSubmit' | 'onPaste' | 'onChange' | 'onKeyUp' | 'onKeyDown' | 'children'>
    & {
    children?: ReactNode | ReactNode[] | ((state: GFormState<T>) => ReactNode | ReactNode[]);
    /** @param loader - a component to display while loading (optional). */
    loader?: ReactNode;
    /** @param stateRef - pass a ref which will points to the current state of the form (optional). */
    stateRef?: RefObject<GFormState<T> | undefined>;
    /** @param onSubmit - a handler for the form submission (optional). */
    onSubmit?: (state: GFormState<T>, e: FormEvent<HTMLFormElement>) => void;
    /** @param onChange - register onChange handler (optional). */
    onChange?: (state: GFormState<T>, e: FormEvent<HTMLFormElement>) => void;
    /** @param onPaste - register onPaste handler (optional). */
    onPaste?: (state: GFormState<T>, e: ClipboardEvent<HTMLFormElement>) => void;
    /** @param onKeyUp - register onKeyUp handler (optional). */
    onKeyUp?: (state: GFormState<T>, e: KeyboardEvent<HTMLFormElement>) => void;
    /** @param onKeyDown - register onKeyDown handler (optional). */
    onKeyDown?: (state: GFormState<T>, e: KeyboardEvent<HTMLFormElement>) => void;
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
export const GForm = forwardRef<HTMLFormElement, GFormProps<any>>(
    <T, >({children, validators, optimized, ...props}: GFormProps<T>, ref: ForwardedRef<HTMLFormElement>) => {
        const initialState = useMemo(() => {
            return _buildFormInitialValues<T>(
                typeof children === 'function'
                    ? children({} as GFormState<T>)
                    : children
            );
        }, [children]);

        return (
            <GFormContextProvider initialState={initialState} validators={validators} optimized={optimized}>
                <FormRenderer ref={ref} {...props}>
                    {children}
                </FormRenderer>
            </GFormContextProvider>
        );
    }
) as <T>(props: GFormProps<T> & { ref?: React.Ref<HTMLFormElement> }) => React.ReactElement | null;