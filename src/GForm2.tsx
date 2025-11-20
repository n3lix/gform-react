import React, {
    type ChangeEvent,
    Children,
    type ClipboardEvent,
    type FC,
    type FormEvent,
    forwardRef, useCallback, useEffect,
    useMemo,
    useRef
} from "react";
import {useFormSelector, GFormContextProvider, useFormStore, createSelector} from "./form-context";
import {
    _buildFormInitialValues,
    _merge,
    _toFormData,
    _toRawData,
    _toURLSearchParams, hasSubmitter
} from "./helpers";
import type {GFormState, ToRawDataOptions} from "./state";
import type {GChangeEvent, IForm, PartialForm} from "./form";
import type {GInputState} from "./fields";
import {GFormProps} from "./GForm";

const selectFields = [(state) => state.fields];

export const selectFirstInvalidField =
    createSelector(
        selectFields,
        (fields) => {
            for (const f in fields) {
                if (fields[f].error) {
                    return true;
                }
            }
            return false;
        }
    );

export const FormRenderer: <T extends any>(props: GFormProps<T>) => ReturnType<FC<GFormProps<T>>> = (<T extends any>() => {
    return forwardRef<HTMLFormElement, GFormProps<T>>(({
                                                           loader = <div>loading</div>,
                                                           stateRef,
                                                           onSubmit,
                                                           onChange,
                                                           onPaste,
                                                           children,
                                                           onInit,
                                                           optimized,
                                                           ...rest
                                                       }, ref) => {
        const formRef = useRef<HTMLFormElement | null>(null);
        const {getState, handlers} = useFormStore();
        const isFormInvalid = useFormSelector(selectFirstInvalidField);

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

        const getFormState = useCallback(() => {
            const fields = getState().fields;
            const formState: GFormState<T> = {
                ...fields,
                isValid: !isFormInvalid,
                isInvalid: isFormInvalid,
                toRawData: (options?: ToRawDataOptions<T>) => _toRawData(fields, options),
                toFormData: () => _toFormData(formRef.current),
                toURLSearchParams: _toURLSearchParams,
                checkValidity: function () { // it has to be function in order to refer to 'this'
                    this.isValid = formRef.current && formRef.current.checkValidity() || false;
                    this.isInvalid = !this.isValid;
                    return this.isValid;
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

            const _onSubmit = (e: FormEvent<HTMLFormElement>) => {
                const state = getFormState();
                if (state.isValid && onSubmit) {
                    onSubmit(state, e);
                }
            };

            let _onPaste;
            if (onPaste) {
                _onPaste = (e: ClipboardEvent<HTMLFormElement>) => onPaste(state, e);
            }

            return optimized
                ?
                <form
                    {...rest}
                    ref={refHandler}
                    onPaste={_onPaste}
                    onBlur={(e: GChangeEvent<HTMLFormElement>) => {
                        handlers._viHandler(state[e.target.name], e);
                    }}
                    onInvalid={(e: ChangeEvent<HTMLFormElement>) => {
                        e.preventDefault(); // hide default browser validation tooltip
                        handlers._viHandler(state[e.target.name], e);
                    }}
                    onChange={(e: GChangeEvent<HTMLFormElement>, unknown?: { value: unknown } | string | number) => {
                        handlers._updateInputHandler(state[e.target.name], e, unknown);
                        onChange && onChange(e);
                    }}
                    onSubmit={_onSubmit}>
                    {formChildren}
                </form>
                :
                <form {...rest} onChange={(e) => onChange && onChange(e)} ref={refHandler} onSubmit={_onSubmit}
                      onPaste={_onPaste}>
                    {formChildren}
                </form>;
        }, [children, getFormState]);

        useEffect(() => {
            const state = getFormState();

            if (__DEV__ && !hasSubmitter(formRef.current)) {
                console.warn(`[No Submit Button] - you have created a form without a button type=submit, this will prevent the onSubmit event from being fired.\nif you have a button with onClick event that handle the submission of the form then ignore this warning\nbut don't forget to manually invoke the checkValidity() function to check if the form is valid before perfoming any action, for example:\nif (formState.checkValidity()) { \n\t//do somthing\n}\n`);
            }

            if (onInit) {
                const changes = onInit(state);
                if (changes) {
                    const _handler = (_c: void | PartialForm<T>) => handlers._dispatchChanges({
                        fields: _merge<IForm<T> & {
                            [key: string]: GInputState;
                        }>({}, state, _c)
                    });
                    changes instanceof Promise ? changes.then(_handler) : _handler(changes);
                }
            }

            const dipatchers: Record<string, Record<string, (changes: Partial<GInputState>) => void>> = {};

            if (__DEBUG__) {
                console.log('checking for initial values');
            }
            const fields = getState().fields;

            for (const fieldKey in fields) {
                dipatchers[fieldKey] = {
                    dispatchChanges: (changes: Partial<GInputState>) => handlers._dispatchChanges(changes, fieldKey)
                };

                const field = fields[fieldKey];

                //we don't want to apply validation on empty fields so skip it.
                if (!field.value) continue;

                if (__DEBUG__) {
                    console.log(`found input '${fieldKey}', applying validation(s)`);
                }
                /**
                 * We have to manually check for validations (checkValidty() will not result with validty.tooShort = true).
                 * If an element has a minimum allowed value length, its dirty value flag is true, its value was last changed by a user edit (as opposed to a change made by a script), its value is not the empty string, and the length of the element's API value is less than the element's minimum allowed value length, then the element is suffering from being too short.
                 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#setting-minimum-input-length-requirements:-the-minlength-attribute
                 */
                handlers._viHandler(field);
            }
            handlers._dispatchChanges({fields: _merge(dipatchers, state)});
        }, []);

        return formComponent;
    });
})();

export const GForm2 = ({children, validators, ...props}) => {
    const childrenArray = useMemo(() => Children.toArray(children), [children]);

    const initialState = useMemo(() => {
        return _buildFormInitialValues<T>(typeof children === 'function' ? children({} as GFormState<T>) : children);
    }, [childrenArray]);

    return (
        <GFormContextProvider key={initialState.key} initialState={initialState} validators={validators}>
            <FormRenderer childrenArray={childrenArray} {...props}>
                {children}
            </FormRenderer>
        </GFormContextProvider>
    );
};