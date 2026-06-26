import { _applySchemaResult, _routeSchemaIssue } from './schema';
import type { GInputState } from '../fields';
import type { StandardSchemaV1Issue, StandardSchemaV1Result } from './standardSchema';

const issue = (message: string, path?: StandardSchemaV1Issue['path']): StandardSchemaV1Issue => ({ message, path });
const input = (formKey: string): GInputState<any> => ({ formKey, errorText: '' } as GInputState<any>);

describe('_routeSchemaIssue', () => {
    it('returns the message of the first issue whose first path segment matches the formKey', () => {
        const issues = [issue('bad email', ['email']), issue('weak', ['password'])];
        expect(_routeSchemaIssue(issues, 'email')).toBe('bad email');
        expect(_routeSchemaIssue(issues, 'password')).toBe('weak');
    });

    it('returns undefined when no issue targets the field', () => {
        expect(_routeSchemaIssue([issue('bad email', ['email'])], 'password')).toBeUndefined();
    });

    it('first match wins for repeated keys (mirrors the native short-circuit)', () => {
        const issues = [issue('first', ['email']), issue('second', ['email'])];
        expect(_routeSchemaIssue(issues, 'email')).toBe('first');
    });

    it('normalizes an object { key } path segment', () => {
        expect(_routeSchemaIssue([issue('bad', [{ key: 'email' }])], 'email')).toBe('bad');
    });

    it('compares the first segment whole — a dotted formKey is not split', () => {
        const issues = [issue('bad', ['address.street'])];
        expect(_routeSchemaIssue(issues, 'address.street')).toBe('bad');
        expect(_routeSchemaIssue(issues, 'address')).toBeUndefined();
    });

    it('skips pathless (root) issues', () => {
        expect(_routeSchemaIssue([issue('root', [])], 'email')).toBeUndefined();
        expect(_routeSchemaIssue([issue('root')], 'email')).toBeUndefined();
    });
});

describe('_applySchemaResult', () => {
    const success: StandardSchemaV1Result<unknown> = { value: {} };

    it('returns false and leaves errorText alone on a successful result', () => {
        const i = input('email');
        expect(_applySchemaResult(success, i)).toBe(false);
        expect(i.errorText).toBe('');
    });

    it('routes a matching issue onto errorText and returns true', () => {
        const i = input('email');
        const result: StandardSchemaV1Result<unknown> = { issues: [issue('bad email', ['email'])] };
        expect(_applySchemaResult(result, i)).toBe(true);
        expect(i.errorText).toBe('bad email');
    });

    it('returns false when no issue targets this field', () => {
        const i = input('password');
        const result: StandardSchemaV1Result<unknown> = { issues: [issue('bad email', ['email'])] };
        expect(_applySchemaResult(result, i)).toBe(false);
    });

    describe('pathless reporting (dev)', () => {
        const original = (globalThis as any).__DEV__;
        beforeEach(() => { (globalThis as any).__DEV__ = true; });
        afterEach(() => { (globalThis as any).__DEV__ = original; jest.restoreAllMocks(); });

        it('warns when a result carries a pathless issue', () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            const result: StandardSchemaV1Result<unknown> = { issues: [issue('root rule')] };
            expect(_applySchemaResult(result, input('email'))).toBe(false);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('Schema Pathless Issue'));
        });

        it('does not warn when a matching issue is found first', () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            const result: StandardSchemaV1Result<unknown> = { issues: [issue('bad email', ['email']), issue('root')] };
            _applySchemaResult(result, input('email'));
            expect(warn).not.toHaveBeenCalled();
        });
    });
});
