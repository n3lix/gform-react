import type {InitialState} from "./state";

/**
 * `JSON.stringify` can't represent a `File` (it serializes to `"{}"`, so different files
 * collide) and throws on `bigint`. This replacer maps such values to a stable signature so
 * `fetchDeps` can detect changes. Files are keyed by content descriptor — re-selecting the
 * exact same file is treated as unchanged; a genuinely different file re-triggers `fetch`.
 */
const _depsReplacer = (_key: string, value: unknown) => {
    if (typeof File !== 'undefined' && value instanceof File) {
        return `File:${value.name}:${value.size}:${value.lastModified}:${value.type}`;
    }
    if (typeof value === 'bigint') return `${value}n`;
    return value;
};

/**
 * Build a selector that produces a string signature of the given field values, used as the
 * `fetchDeps` change key. Returns a plain function (no memoization): it's recreated per render
 * by the caller, so a cache wouldn't survive, and the combiner is cheap.
 */
export const makeSelectFields = (keys: string[] = []) =>
    (state: InitialState): string | null => {
        const selected = keys.map((key) => JSON.stringify(state.fields[key]?.value, _depsReplacer)).join(', ');
        return selected.length ? selected : null;
    };