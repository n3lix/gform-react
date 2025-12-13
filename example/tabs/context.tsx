// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import React, {createContext, useCallback, useContext, useRef, useSyncExternalStore} from 'react';

const TabStoreContext = createContext(null);

export const TabStoreProvider = ({ children, initialState }) => {
    const stateRef = useRef(initialState);
    const listeners = useRef(new Set());

    const getState = useCallback(() => stateRef.current, []);

    const setState = useCallback((updater) => {
        stateRef.current = typeof updater === 'function' ? updater(stateRef.current) : updater;
        listeners.current.forEach((l) => l());
    }, []);

    const subscribe = useCallback((listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
    }, []);

    const store = useRef({ getState, setState, subscribe });

    return <TabStoreContext.Provider value={store.current}>{children}</TabStoreContext.Provider>;
};

export const useTabStore = (): any => {
    const store = useContext(TabStoreContext);
    if (!store) throw new Error('useTabStore must be used within `Tabs` component');
    return store;
};

export const useTab = (selector: any) => {
    const store = useTabStore();

    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()) // for SSR
    );
};

