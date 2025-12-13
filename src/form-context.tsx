import React, {createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore} from 'react';
import type {FC, PropsWithChildren} from 'react';

import {useFormHandlers} from "./useFormHandlers";
import type {InitialState, Store} from "./state";
import type {GValidators} from "./validations";
import type {GInputState} from './fields';
import {_copyStateFields} from "./helpers";

const GFormContext = createContext<Store>({} as Store);

type GFormContextProviderProps = PropsWithChildren & {
    initialState: InitialState;
    validators?: GValidators;
    optimized?: boolean;
};

export const GFormContextProvider: FC<GFormContextProviderProps> = ({ children, initialState, validators, optimized }) => {
    const stateRef = useRef(initialState);
    const listeners = useRef<Set<() => void>>(null);

    const setState = useCallback((updater: InitialState | ((state: InitialState) => InitialState)) => {
        stateRef.current = typeof updater === 'function' ? updater(stateRef.current) : updater;
        listeners.current!.forEach((l) => l());
    }, []);

    const handlers = useFormHandlers(() => stateRef.current, setState, validators, optimized);

    const store = useMemo<Store>(() => {
        if (!listeners.current) {
            listeners.current = new Set();
        } else {
            if (__DEBUG__) {
                console.log(`[form-context] - form changed stated from`, stateRef.current, '\nto\n', initialState);
            }
            listeners.current.clear();
            _copyStateFields(stateRef.current, initialState);
        }

        stateRef.current = initialState;

        for (const fieldKey in initialState.fields) {
            initialState.fields[fieldKey].dispatchChanges = (changes: Partial<GInputState>) => handlers._dispatchChanges(changes, fieldKey);
        }

        return {
            getState: () => stateRef.current,
            setState,
            subscribe: (listener: () => void) => {
                listeners.current!.add(listener);
                return () => listeners.current!.delete(listener);
            },
            handlers
        };
    }, [initialState]);

    return <GFormContext.Provider value={store}>{children}</GFormContext.Provider>;
};

export const useFormStore = () => {
    const store = useContext(GFormContext);
    if (!store.getState) throw new Error('useGFormStore must be used within `GForm` component');

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
    State=InitialState,
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