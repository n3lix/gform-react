import {createSelector} from "./form-context";
import type {InitialState} from "./state";

const selectFields = [(state: InitialState) => state.fields];

export const makeSelectFields = (keys: string[] = []) =>
    createSelector(
        selectFields,
        (fields) => {
            const selected = keys.map((key) => JSON.stringify(fields[key].value)).join(', ');
            return selected.length ? selected : null;
        }
    );