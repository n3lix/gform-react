import {createSelector} from "./form-context";
import {InitialState} from "./state";

const selectFields = [(state: InitialState) => state.fields];

export const selectFirstInvalidField =
    createSelector(
        selectFields,
        (fields) => {
            for (const f in fields) {
                if (fields[f].error) {
                    return true;
                }
            }
            return false;
        }
    );

export const makeSelectFields = (keys: string[] = []) =>
    createSelector(
        selectFields,
        (fields) => {
            const selected = keys.map((key) => fields[key]).filter(Boolean);
            return selected.length ? selected : null;
        }
    );