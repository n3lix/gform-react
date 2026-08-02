import {useSyncExternalStore} from "react";

import {useFormStore} from "../form-context";
import type {GSectionState} from "../form";

/**
 * subscribe a component to one **section** of the form (see `GInput`'s `sectionKey` prop).
 *
 * returns the section's fields keyed by their bare `formKey` — the same shape the render-prop
 * state exposes as `state[sectionKey]`. the returned object is **referentially stable**: its
 * reference changes iff one of the section's member fields changes (a field added, removed, or
 * updated), so the component re-renders on member changes and bails out — via
 * `useSyncExternalStore`'s `Object.is` check — on every unrelated field's update. the snapshot
 * cache lives in the form store (`getSectionState`) and is shared: every subscriber of the same
 * section receives the same object reference, at one scan per store update per section.
 *
 * pass the section's raw shape as `F` for full typing. for a *single* field (sectioned or not),
 * use `useFormSelector` instead; a sectioned field's flat key there is `"sectionKey.formKey"`.
 *
 * must be called inside a `GForm` / `RNGForm` subtree — it reads the form store from context and
 * throws if used outside one. SSR-safe (the server snapshot uses the same computation). an
 * unknown or empty section returns a stable empty object.
 *
 * @template F the section's raw shape (`{ [formKey]: valueType }`).
 * @param sectionKey the section to subscribe to, as passed to the member `GInput`s.
 * @returns the section's field states, kept in sync with the store.
 *
 * @example
 * type Address = { street: string; city: string };
 * // re-renders only when a billing field changes
 * const billing = useFormSectionSelector<Address>('billing');
 * return <span>{billing.street?.value}</span>;
 */
export const useFormSectionSelector = <F = any>(sectionKey: string): GSectionState<F> => {
    const store = useFormStore();

    const getSnapshot = (): GSectionState<F> => store.getSectionState(sectionKey) as GSectionState<F>;

    return useSyncExternalStore(
        store.subscribe,
        getSnapshot,
        getSnapshot // for SSR
    );
};
