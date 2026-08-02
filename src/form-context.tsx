import React, {createContext, useCallback, useContext, useMemo, useRef} from 'react';
import type {FC, PropsWithChildren, RefObject} from 'react';

import {useFormHandlers} from "./useFormHandlers";
import type {InitialState, Store} from "./state";
import type {GValidators} from "./validations";
import type {GInputInitialState, GInputProps, GInputState, RNGInputProps} from './fields';
import type {GDOMElement} from './form';
import {_buildInputInitialValues, _clearDebounce, _qualifyKey} from "./helpers";

const GFormContext = createContext<Store>({} as Store);

type GFormContextProviderProps = PropsWithChildren & {
    initialState: InitialState;
    validators?: GValidators;
    optimized?: boolean;
    formRef?: RefObject<HTMLFormElement | null>;
};

export const GFormContextProvider: FC<GFormContextProviderProps> = ({
    children,
    initialState,
    validators,
    optimized = false,
    formRef
}) => {
    const stateRef = useRef(initialState);
    const listeners = useRef<Set<() => void>>(null);

    const notify = useCallback(() => listeners.current!.forEach((listener) => listener()), []);

    const setState = useCallback((updater: InitialState | ((state: InitialState) => InitialState)) => {
        const prevState = stateRef.current;
        const nextState =
            typeof updater === "function" ? (updater as (s: InitialState) => InitialState)(prevState) : updater;

        if (Object.is(prevState, nextState)) {
            return;
        }

        stateRef.current = nextState;
        notify();
    }, []);

    const handlers = useFormHandlers(() => stateRef.current, setState, validators);

    const getInputElement = useCallback((formKey: string) => {
        if (!formRef || !formRef.current) return;
        // Use `elements.namedItem` instead of `formRef.current[formKey]`: the latter is
        // shadowed by HTMLFormElement's own properties, so a field named `submit`, `length`,
        // `action`, `method`, etc. would resolve to the wrong thing (e.g. the submit() method).
        return (formRef.current.elements.namedItem(formKey) ?? undefined) as unknown as GDOMElement;
    }, []);

    const registerField = useCallback((config: GInputProps | RNGInputProps) => {
        /* mutate stateRef without notifying listeners
         it is safe because this field didn't exist (no component was subscribed to it) */
        const prev = stateRef.current;
        const key = _qualifyKey(config.formKey, config.sectionKey);

        if (prev.fields[key]) {
            if (__DEV__) {
                console.warn(`DEV ONLY - [Duplicate Keys] - field with key '${key}' (formKey '${config.formKey}'${config.sectionKey ? ` in section '${config.sectionKey}'` : ''}) already defined.`);
            }
            return;
        }

        if (__DEV__) {
            const collision = config.sectionKey ? config.sectionKey : config.formKey;
            for (const existingKey in prev.fields) {
                const existing = prev.fields[existingKey];
                const collides = config.sectionKey
                    ? (!existing.sectionKey && existing.formKey === collision)
                    : (existing.sectionKey === collision);
                if (collides) {
                    console.warn(`DEV ONLY - [Section/Field Collision] - a top-level field and a section both use the key '${collision}'; 'state.${collision}' and 'toRawData().${collision}' cannot hold both (one overwrites the other). Rename the field or the section.`);
                    break;
                }
            }
        }

        const inputState = _buildInputInitialValues(config as GInputInitialState);

        inputState.checkValidity = () => {
            const input = stateRef.current.fields[key] as GInputState<any>;
            const el = getInputElement(key);
            // read `validity.valid` (not `checkValidity()`) so the native check fires no `invalid`
            // event — validation runs through exactly one path: the explicit `_viHandler` below.
            if (el && !el.validity.valid) return false; // native first (RN skips)
            handlers._viHandler(input);                 // run custom validation on the live field
            return !input.error;                        // valid = true
        };

        // Fields that mount with a value get their constraint validation baked in now, so
        // constraint errors render on the first paint (no follow-up re-render). Custom/async
        // validation still runs in the field's mount effect (with the full field set).
        if (inputState.value) {
            inputState.touched = true;
            handlers._checkConstraints(inputState);
        }

        // snapshot the resettable state so a native <form> reset can restore it (handlers._resetForm)
        inputState._initial = {
            value: inputState.value,
            error: inputState.error,
            errorText: inputState.errorText,
            touched: inputState.touched,
            dirty: inputState.dirty,
        };

        stateRef.current = {
            ...prev,
            fields: {
                ...prev.fields,
                [key]: {
                    ...inputState,
                    dispatchChanges: (changes: Partial<GInputState>, options?: {validate?: boolean}) =>
                        options?.validate
                            ? handlers._dispatchAndValidate(changes, key)
                            : handlers._dispatchChanges(changes, key)
                }
            }
        };
        // No listeners.current.forEach() here - the subscribing component
        // will read the updated stateRef immediately via useSyncExternalStore
    }, [handlers]);

    const unregisterField = useCallback((formKey: string) => {
        const prev = stateRef.current;
        const removed = prev.fields[formKey];
        if (!removed) return;

        // cancel & drop any pending debounce timers for this field so the timer map
        // doesn't grow unbounded (and to avoid a fetch firing after unmount)
        _clearDebounce(`${removed.gid}-fetch`, `${removed.gid}-async`);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[formKey]: _, ...remainingFields} = prev.fields;

        stateRef.current = {
            ...prev,
            fields: remainingFields
        };

        // Notify listeners so other components (e.g. submit button) re-render
        // with the updated isValid/isInvalid state
        notify();
    }, []);

    /**
     * per-section snapshot cache, shared by every subscriber of the same section.
     * one scan per store update per section, and all subscribers get the same object reference.
     * entries are validated against the `fields` map's identity, so a cache hit is O(1)
     * and a recompute reuses the previous snapshot when no member actually changed.
     */
    const sectionSnapshots = useRef<Map<string, {fields: InitialState['fields']; snapshot: {[key: string]: GInputState<any>}; size: number}>>(null);

    const getSectionState = useCallback((sectionKey: string) => {
        const fields = stateRef.current.fields;
        let cache = sectionSnapshots.current!.get(sectionKey);

        if (cache && cache.fields === fields) return cache.snapshot;

        const next: { [key: string]: GInputState<any> } = {};
        let size = 0;
        let changed = false;
        for (const key in fields) {
            const field = fields[key];
            if (field.sectionKey !== sectionKey) continue;
            next[field.formKey] = field;
            size++;
            if (!cache || cache.snapshot[field.formKey] !== field) changed = true;
        }

        if (cache && !changed && size === cache.size) {
            // no member changed — keep the previous reference so subscribers bail out
            cache.fields = fields;
            return cache.snapshot;
        }

        cache = {fields, snapshot: next, size};
        sectionSnapshots.current!.set(sectionKey, cache);
        return next;
    }, []);

    const store = useMemo<Store>(() => {
        sectionSnapshots.current = new Map(); // drop stale snapshots when the store state resets

        if (!listeners.current) {
            listeners.current = new Set();
            stateRef.current = initialState;
            for (const fieldKey in initialState.fields) {
                initialState.fields[fieldKey].dispatchChanges = (changes: Partial<GInputState>, options?: {validate?: boolean}) =>
                    options?.validate
                        ? handlers._dispatchAndValidate(changes, fieldKey)
                        : handlers._dispatchChanges(changes, fieldKey);
            }
        } else {
            if (__DEBUG__) {
                console.log(`[form-context] - form changed state from`, stateRef.current, '\nto\n', initialState);
            }
            listeners.current.clear();
            for (const fieldKey in stateRef.current.fields) {
                stateRef.current.fields[fieldKey].dispatchChanges = (changes: Partial<GInputState>, options?: {validate?: boolean}) =>
                    options?.validate
                        ? handlers._dispatchAndValidate(changes, fieldKey)
                        : handlers._dispatchChanges(changes, fieldKey);
            }
        }

        return {
            getState: () => stateRef.current,
            setState,
            subscribe: (listener: () => void) => {
                listeners.current!.add(listener);
                return () => listeners.current!.delete(listener);
            },
            notify,
            handlers,
            registerField,
            unregisterField,
            getInputElement,
            getSectionState,
            optimized
        };
    }, [initialState, optimized]);

    return <GFormContext.Provider value={store}>{children}</GFormContext.Provider>;
};

export const useFormStore = () => {
    const store = useContext(GFormContext);
    if (!store.getState) throw new Error('useFormStore must be used within `GForm` component');

    return store;
};