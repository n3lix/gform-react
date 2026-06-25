import {useMemo, useEffect, forwardRef} from "react";
import type {ReactNode, FC, ReactElement, Ref, RefObject} from "react";

import {_merge, _buildRNFormState} from "./helpers";
import {GFormContextProvider, useFormStore} from "./form-context";
import {useFormSelector} from "./hooks";
import type {RNGFormState} from "./state";
import type {GValidators} from "./validations";
import type {IForm, PartialForm} from "./form";
import type {GInputState} from "./fields";

const FormRenderer = forwardRef<any, RNGFormProps<any>>(
    <T, >({
        stateRef,
        children,
        onInit,
        el: El,
        ...rest
    }: RNGFormProps<T>, ref: React.Ref<any>) => {
        const {handlers, getState} = useFormStore();
        const fields = useFormSelector(state => state.fields) as IForm<T>;

        const formComponent = useMemo(() => {
            const state = _buildRNFormState(fields, handlers);

            if (stateRef) stateRef.current = state;
            const formChildren = typeof children === 'function' ? children(state) : children;

            return (
                <El {...rest} ref={ref}>
                    {formChildren}
                </El>
            );
        }, [children, fields]);

        useEffect(() => {
            const initialStateFields = getState<T>().fields;
            const state = _buildRNFormState(initialStateFields, handlers);

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

            // NOTE: initial-value validation is handled at field registration (constraints) and
            // in each RNGInput's mount effect (custom/async) — no separate loop needed here.
        }, []);

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
 * @link Docs - https://gform-react.vercel.app
 * @link Npm - https://www.npmjs.com/package/gform-react
 */
export const RNGForm = forwardRef<any, RNGFormProps<any>>(
    <T, >({children, validators, ...props}: RNGFormProps<T>, ref: React.Ref<any>) => {
        const initialState = useMemo(() => ({ fields: {} }), []);

        return (
            <GFormContextProvider initialState={initialState} validators={validators}>
                <FormRenderer ref={ref} {...props}>
                    {children}
                </FormRenderer>
            </GFormContextProvider>
        );
    }
) as <T>(props: RNGFormProps<T> & { ref?: React.Ref<HTMLFormElement> }) => React.ReactElement | null;