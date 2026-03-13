import React, {createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore} from 'react';
import type {FC, PropsWithChildren, PropsWithoutRef, RefObject} from 'react';

import {useFormHandlers} from "./useFormHandlers";
import type {InitialState, Store} from "./state";
import type {GValidators} from "./validations";
import type {GInputProps, GInputState} from './fields';
import {_buildInputInitialValues} from "./helpers";

const GFormContext = createContext<Store>({} as Store);

type GFormContextProviderProps = PropsWithChildren & {
    initialState: InitialState;
    validators?: GValidators;
    optimized?: boolean;
    formRef: RefObject<HTMLFormElement | null>;
};

export const GFormContextProvider: FC<GFormContextProviderProps> = ({
    children,
    initialState,
    validators,
    optimized,
    formRef
}) => {
    const stateRef = useRef(initialState);
    const listeners = useRef<Set<() => void>>(null);

    const setState = useCallback((updater: InitialState | ((state: InitialState) => InitialState)) => {
        const prevState = stateRef.current;
        const nextState =
            typeof updater === "function" ? (updater as (s: InitialState) => InitialState)(prevState) : updater;

        if (Object.is(prevState, nextState)) {
            return;
        }

        stateRef.current = nextState;
        listeners.current!.forEach((listener) => listener());
    }, []);

    const handlers = useFormHandlers(() => stateRef.current, setState, validators, optimized);

    const getInputElement = useCallback((formKey: string) => {
        const element: HTMLInputElement = formRef.current?.[formKey];
        return element;
    }, []);

    const registerField = useCallback((config: PropsWithoutRef<GInputProps>) => {
        /* mutate stateRef without notifying listeners
         it is safe because this field didn't exist (no component was subscribed to it) */
        const prev = stateRef.current;

        if (prev.fields[config.formKey]) {
            if (__DEV__) {
                console.warn(`DEV ONLY - [Duplicate Keys] - field with key '${config.formKey}' already defined.`);
            }
            return;
        }

        const inputState = _buildInputInitialValues(config);

        stateRef.current = {
            ...prev,
            fields: {
                ...prev.fields,
                [config.formKey]: {
                    ...inputState,
                    dispatchChanges: (changes: Partial<GInputState>) =>
                        handlers._dispatchChanges(changes, config.formKey)
                }
            }
        };
        // No listeners.current.forEach() here — the subscribing component
        // will read the updated stateRef immediately via useSyncExternalStore
    }, [handlers]);

    const unregisterField = useCallback((formKey: string) => {
        const prev = stateRef.current;
        if (!prev.fields[formKey]) return;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[formKey]: _, ...remainingFields} = prev.fields;

        stateRef.current = {
            ...prev,
            fields: remainingFields
        };

        // Notify listeners so other components (e.g. submit button) re-render
        // with the updated isValid/isInvalid state
        listeners.current!.forEach(listener => listener());
    }, []);

    const store = useMemo<Store>(() => {
        if (!listeners.current) {
            listeners.current = new Set();
            stateRef.current = initialState;
            for (const fieldKey in initialState.fields) {
                initialState.fields[fieldKey].dispatchChanges = (changes: Partial<GInputState>) =>
                    handlers._dispatchChanges(changes, fieldKey);
            }
        } else {
            if (__DEBUG__) {
                console.log(`[form-context] - form changed state from`, stateRef.current, '\nto\n', initialState);
            }
            listeners.current.clear();
            for (const fieldKey in stateRef.current.fields) {
                stateRef.current.fields[fieldKey].dispatchChanges = (changes: Partial<GInputState>) =>
                    handlers._dispatchChanges(changes, fieldKey);
            }
        }

        return {
            getState: () => stateRef.current,
            setState,
            subscribe: (listener: () => void) => {
                listeners.current!.add(listener);
                return () => listeners.current!.delete(listener);
            },
            handlers,
            registerField,
            unregisterField,
            getInputElement
        };
    }, [initialState]);

    return <GFormContext.Provider value={store}>{children}</GFormContext.Provider>;
};

export const useFormStore = () => {
    const store = useContext(GFormContext);
    if (!store.getState) throw new Error('useFormStore must be used within `GForm` component');

    return store;
};

export const useFormSelector = <T extends any>(selector: (state: InitialState) => T): T => {
    const store = useFormStore();

    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()) // for SSR
    );
};

export function createSelector<
    State = InitialState,
    Selectors extends Array<(state: State) => any> = [],
    Result = any
>(
    selectors: Selectors,
    combiner: (...args: {
        [K in keyof Selectors]: Selectors[K] extends (state: State) => infer R ? R : never;
    }) => Result
): (state: State) => Result {
    let lastArgs: any[] = [];
    let lastResult: Result;

    return (state: State): Result => {
        const args = selectors.map(fn => fn(state));
        if (
            lastArgs.length === args.length &&
            args.every((val, i) => val === lastArgs[i])
        ) {
            return lastResult;
        }
        lastArgs = args;
        lastResult = combiner(...args as any);
        return lastResult;
    };
}