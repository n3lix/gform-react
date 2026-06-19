import {useSyncExternalStore} from "react";

import {useFormStore} from "../form-context";
import {InitialState} from "../state";

/**
 * subscribe a component to a slice of the form's state.
 *
 * the `selector` receives the whole form state (`{ fields }`, where each entry is a field's
 * `GInputState`) and returns the piece you care about. the component re-renders **only** when the
 * selected value changes (compared with `Object.is`), so a component watching one field is not
 * re-rendered by edits to unrelated fields.
 *
 * must be called inside a `GForm` / `RNGForm` subtree — it reads the form store from context and
 * throws if used outside one. SSR-safe (the server snapshot uses the same selector).
 *
 * @template T the type of the selected slice.
 * @param selector maps the form state to the slice to subscribe to. keep it referentially stable:
 *   return a primitive or an existing reference from state. returning a freshly built object/array
 *   on every call defeats the `Object.is` bail-out and re-renders on every store change.
 * @returns the currently selected value, kept in sync with the store.
 *
 * @example
 * // re-renders only when the `city` field changes
 * const city = useFormSelector(state => state.fields.city);
 * return <span>{city?.value}</span>;
 *
 * @example
 * // derive a primitive to stay referentially stable
 * const isCityInvalid = useFormSelector(state => state.fields.city?.error ?? false);
 */
export const useFormSelector = <T extends any>(selector: (state: InitialState) => T): T => {
    const store = useFormStore();

    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()) // for SSR
    );
};