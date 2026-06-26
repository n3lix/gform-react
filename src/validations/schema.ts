import type {GInputState} from '../fields';
import type {StandardSchemaV1Issue, StandardSchemaV1Result} from './standardSchema';

if (__DEV__) {
    var _warnedPathless = false;
}

/**
 * Map a schema's issues to the message for a single field. Returns the first issue whose first path
 * segment matches `formKey` or `undefined` when no issue targets this field.
 *
 * Path segments may be primitives or `{ key }` objects (Standard Schema allows both); both are
 * normalized. A pathless (root) issue can't be mapped to a field and is skipped here — surfacing
 * that as a DEV warning is the caller's job (so it can warn once, not once per field).
 */
export const _routeSchemaIssue = (issues: ReadonlyArray<StandardSchemaV1Issue>, formKey: string): string | undefined => {
    for (const issue of issues) {
        const segment = issue.path?.[0];
        if (!segment) continue;
        const key = typeof segment === 'object' ? segment.key : segment;
        if (key === formKey) return issue.message;
    }
};

export const _applySchemaResult = (result: StandardSchemaV1Result<unknown>, input: GInputState<any>): boolean => {
    if (!result.issues) return false;

    const message = _routeSchemaIssue(result.issues, input.formKey);
    if (message) {
        input.errorText = message;
        return true;
    }

    if (__DEV__ && !_warnedPathless) {
        for (const issue of result.issues) {
            if (!issue.path?.[0]) {
                _warnedPathless = true;
                console.warn(`DEV ONLY - [Schema Pathless Issue] - a schema issue has no 'path', so it can't be routed to a field and won't surface. Give cross-field rules a 'path' set to a formKey, e.g. .refine(fn, { message, path: ['confirmPassword'] }).`);
                break;
            }
        }
    }

    return false;
};