import React, {useMemo, useEffect, forwardRef, useCallback} from "react";
import type { ReactNode, FC, ReactElement, Ref, RefObject } from "react";

import {_toRawData, _toURLSearchParams, _merge, _buildFormInitialValues} from "./helpers";
import {GFormContextProvider, useFormSelector, useFormStore} from "./form-context";
import type {RNGFormState, ToRawDataOptions} from "./state";
import type { GValidators } from "./validations";
import type { IForm, PartialForm } from "./form";
import type { GInputState } from "./fields";
import {selectFirstInvalidField} from "./selectors";

const FormRenderer = forwardRef<any, RNGFormProps<any>>(
    <T, >({
        stateRef,
        children,
        onInit,
        el: El,
        ...rest
    }: RNGFormProps<T>, ref: React.Ref<any>) => {
        const {getState, handlers} = useFormStore();
        const isFormInvalid = useFormSelector(selectFirstInvalidField);

        const getFormState = useCallback(() => {
            const fields = getState<T>().fields;

            const formState: RNGFormState<T> = {
                ...fields,
                isValid: !isFormInvalid,
                isInvalid: isFormInvalid,
                toRawData: (options?: ToRawDataOptions<T>) => _toRawData(fields, options),
                toURLSearchParams: _toURLSearchParams,
                checkValidity: () => {
                    for (const i in fields) {
                        const valid = fields[i].checkValidity();
                        if (!valid) {
                            return false;
                        }
                    }
                    return true;
                },
                dispatchChanges: (changes: PartialForm<T> & {
                    [key: string]: Partial<GInputState<any>>
                }) => handlers._dispatchChanges({
                    fields: _merge<IForm<T> & {
                        [key: string]: GInputState;
                    }>({}, fields, changes)
                })
            };

            if (stateRef) stateRef.current = formState;

            return formState;
        }, [isFormInvalid]);

        const formComponent = useMemo(() => {
            const state = getFormState();

            const formChildren = typeof children === 'function' ? children(state) : children;

            return <El {...rest} ref={ref}>
                {formChildren}
            </El>;
        }, [getFormState, children]);

        useEffect(() => {
            const state = getFormState();

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

            const dispatchers: Record<string, Record<string, (changes: Partial<GInputState>) => void>> = {};
            
            if (__DEBUG__) {
                console.log('checking for initial values');
            }
            const fields = getState().fields;

            for (const fieldKey in fields) {
                dispatchers[fieldKey] = {
                    dispatchChanges: (changes: Partial<GInputState>) => handlers._dispatchChanges(changes, fieldKey),
                    checkValidity: () => {
                        const result = handlers._createInputChecker(state[fieldKey]);
                        handlers._dispatchChanges(state[fieldKey], fieldKey);
                        return result;
                    }
                };

                const field = fields[fieldKey];

                //we don't want to apply validation on empty fields so skip it.
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
            handlers._dispatchChanges({fields: _merge(dispatchers, state)});
        }, [getFormState]);

        return formComponent;
    }
) as <T>(props: RNGFormProps<T> & { ref?: Ref<any> }) => ReactElement | null;

export type RNGFormProps<T> = {
    children?: ReactNode | ReactNode[] | ((state: RNGFormState<T>) => ReactNode | ReactNode[]);
    /** @param stateRef - pass a ref which will points to the current state of the form (optional). */
    stateRef?: RefObject<RNGFormState<T> | undefined>;
    /** @param validators - an object for handling validations (optional). */
    validators?: GValidators<T>;
    /** @param onInit - execute a handler once the form has initialized (optional). */
    onInit?: (state: RNGFormState<T>) => void | PartialForm<T> | Promise<void | PartialForm<T>>;
    /** @param el - the element to use as the form container. */
    el: FC<any>;
};

/**
 * build dynamic forms with validations.
 * @link Docs - https://gform-react.onrender.com
 * @link Npm - https://www.npmjs.com/package/gform-react
 */
export const RNGForm = forwardRef<any, RNGFormProps<any>>(
    <T, >({children, validators, ...props}: RNGFormProps<T>, ref: React.Ref<any>) => {
        const initialState = useMemo(() => {
            return _buildFormInitialValues(
                typeof children === 'function'
                    ? children({} as RNGFormState<T>)
                    : children
            );
        }, [children]);

        return (
            <GFormContextProvider key={initialState.key} initialState={initialState} validators={validators}>
                <FormRenderer ref={ref} {...props}>
                    {children}
                </FormRenderer>
            </GFormContextProvider>
        );
    }
) as <T>(props: RNGFormProps<T> & { ref?: React.Ref<HTMLFormElement> }) => React.ReactElement | null;