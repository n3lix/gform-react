import {createSelector} from "./form-context";
import type {InitialState} from "./state";

const selectFields = [(state: InitialState) => state.fields];

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

export const makeSelectFields = (keys: string[] = []) =>
    createSelector(
        selectFields,
        (fields) => {
            const selected = keys.map((key) => JSON.stringify(fields[key]?.value, _depsReplacer)).join(', ');
            return selected.length ? selected : null;
        }
    );