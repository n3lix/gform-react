import React, {createContext, useCallback, useContext, useRef, useSyncExternalStore} from 'react';
import {useFormHandlers} from "./useFormHandlers";

const NewGFormContext = createContext(null);

export const GFormContextProvider = ({ children, initialState, validators }) => {
    const stateRef = useRef(initialState);
    const listeners = useRef(new Set());

    const setState = useCallback((updater) => {
        stateRef.current = typeof updater === 'function' ? updater(stateRef.current) : updater;
        listeners.current.forEach((l) => l());
    }, []);

    const handlers = useFormHandlers(() => stateRef.current, setState, validators, false);

    const getState = useCallback(() => stateRef.current, []);

    const subscribe = useCallback((listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
    }, []);

    const store = useRef({ getState, setState, subscribe, handlers });

    return <NewGFormContext.Provider value={store.current}>{children}</NewGFormContext.Provider>;
};

export const createSelector = (selectors, combiner) => {
    let lastArgs = [];
    let lastResult;

    return (state) => {
        const args = selectors.map(fn => fn(state));
        if (
            lastArgs.length === args.length &&
            args.every((val, i) => val === lastArgs[i])
        ) {
            return lastResult;
        }
        lastArgs = args;
        lastResult = combiner(...args);
        return lastResult;
    };
};


export const useFormStore = () => {
    const store = useContext(NewGFormContext);
    if (!store) throw new Error('useGFormStore must be used within `GForm` component');
    return store;
};

export const useFormSelector = (selector) => {
    const store = useFormStore();

    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()) // for SSR
    );
};

