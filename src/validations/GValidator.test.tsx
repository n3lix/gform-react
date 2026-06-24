import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';

import {GValidator} from './GValidator';
import {GForm} from '../GForm';
import {GInput} from '../fields/GInput';
import type {GInputState} from '../fields';
import type {StandardSchemaV1} from './standardSchema';

const makeInput = (overrides: Partial<GInputState<any>> = {}): GInputState<any> =>
    ({formKey: 'field', value: '', error: false, errorText: '', ...overrides} as GInputState<any>);

describe('GValidator (unit)', () => {
    it('registers a constraint handler that sets errorText on a matching violation', () => {
        const validator = new GValidator().withRequiredMessage('required!');
        const handler = validator.constraintHandlers[0];
        const input = makeInput();

        expect(handler(input, 'valueMissing')).toBe(true);
        expect(input.errorText).toBe('required!');
    });

    it('returns false for a non-matching violation', () => {
        const validator = new GValidator().withRequiredMessage('required!');
        const handler = validator.constraintHandlers[0];

        expect(handler(makeInput(), 'tooShort')).toBe(false);
    });

    it('supports a function message resolved against the input', () => {
        const validator = new GValidator().withRequiredMessage((input) => `${input.formKey} is required`);
        const input = makeInput({formKey: 'email'});

        validator.constraintHandlers[0](input, 'valueMissing');
        expect(input.errorText).toBe('email is required');
    });

    it('registers custom and async handlers on their respective lists', () => {
        const sync = () => true;
        const async = async () => true;
        const validator = new GValidator().withCustomValidation(sync).withCustomValidationAsync(async);

        expect(validator.handlers).toContain(sync);
        expect(validator.asyncHandlers).toContain(async);
    });

    it('composes a base validator without mutating it', () => {
        const base = new GValidator().withRequiredMessage('req');
        const child = new GValidator(base).withMinLengthMessage('min');

        expect(child.constraintHandlers).toHaveLength(2);
        // base must be untouched (handlers are copied, not shared by reference)
        expect(base.constraintHandlers).toHaveLength(1);
    });
});

describe('GValidator (dev-only tracking)', () => {
    const original = (globalThis as any).__DEV__;
    beforeAll(() => { (globalThis as any).__DEV__ = true; });
    afterAll(() => { (globalThis as any).__DEV__ = original; });

    it('hasConstraint reflects registered constraints', () => {
        const validator = new GValidator().withRequiredMessage('r').withMinLengthMessage('m');

        expect(validator.hasConstraint('valueMissing')).toBe(true);
        expect(validator.hasConstraint('tooShort')).toBe(true);
        expect(validator.hasConstraint('patternMismatch')).toBe(false);
    });

    it('warns on duplicate constraint handlers', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        new GValidator().withRequiredMessage('a').withRequiredMessage('b');

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate Handlers'));
        warn.mockRestore();
    });

    it('composes tracked constraints from a base validator', () => {
        const base = new GValidator().withRequiredMessage('r');
        const child = new GValidator(base).withMinLengthMessage('m');

        expect(child.hasConstraint('valueMissing')).toBe(true);
        expect(child.hasConstraint('tooShort')).toBe(true);
        expect(base.hasConstraint('tooShort')).toBe(false);
    });
});

describe('validation engine (integration via GForm)', () => {
    const withError = (testId: string) =>
        (input: GInputState<any>, props: any) => (
            <div>
                <input {...props} data-testid={testId}/>
                {input.error && <span data-testid={`${testId}-err`}>{input.errorText}</span>}
            </div>
        );

    it('shows a required error on blur and clears it when filled', () => {
        render(
            <GForm validators={{name: new GValidator().withRequiredMessage('name required')}}>
                <GInput formKey="name" required element={withError('name')}/>
            </GForm>
        );

        const input = screen.getByTestId('name');
        fireEvent.blur(input);
        expect(screen.getByTestId('name-err')).toHaveTextContent('name required');

        fireEvent.change(input, {target: {value: 'Tal'}});
        expect(screen.queryByTestId('name-err')).toBeNull();
    });

    it('runs a custom synchronous validator', () => {
        render(
            <GForm
                validators={{
                    code: new GValidator().withCustomValidation((input) => {
                        input.errorText = 'no foo allowed';
                        return input.value === 'foo'; // true => invalid
                    })
                }}
            >
                <GInput formKey="code" element={withError('code')}/>
            </GForm>
        );

        const input = screen.getByTestId('code');
        fireEvent.change(input, {target: {value: 'foo'}});
        expect(screen.getByTestId('code-err')).toHaveTextContent('no foo allowed');

        fireEvent.change(input, {target: {value: 'bar'}});
        expect(screen.queryByTestId('code-err')).toBeNull();
    });

    it('runs a custom async validator', async () => {
        render(
            <GForm
                validators={{
                    user: new GValidator().withCustomValidationAsync(async (input) => {
                        input.errorText = 'username taken';
                        return input.value === 'taken'; // true => invalid
                    })
                }}
            >
                <GInput formKey="user" debounce={50} element={withError('user')}/>
            </GForm>
        );

        fireEvent.change(screen.getByTestId('user'), {target: {value: 'taken'}});

        await waitFor(() =>
            expect(screen.getByTestId('user-err')).toHaveTextContent('username taken')
        );
    });
});

// A hand-rolled Standard Schema object — no schema library needed to exercise the routing logic.
const standardSchema = (validate: (value: any) => any): StandardSchemaV1 => ({
    '~standard': { version: 1, vendor: 'test', validate },
});

const fieldsOf = (values: Record<string, any>) =>
    Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v }])) as any;

describe('GValidator withSchema (sync, Standard Schema)', () => {
    it('routes a leaf issue to the matching field and sets errorText', () => {
        const schema = standardSchema((v) =>
            v.email.includes('@') ? { value: v } : { issues: [{ message: 'bad email', path: ['email'] }] });
        const handler = new GValidator().withSchema(schema).handlers[0];

        const fields = fieldsOf({ email: 'nope', password: 'whatever' });
        const email = makeInput({ formKey: 'email' });
        expect(handler(email, fields)).toBe(true);
        expect(email.errorText).toBe('bad email');

        // a field with no issue stays valid
        expect(handler(makeInput({ formKey: 'password' }), fields)).toBe(false);
    });

    it('fires object-level (refine-style) rules and routes by issue path', () => {
        const schema = standardSchema((v) =>
            v.password === v.confirm ? { value: v } : { issues: [{ message: 'must match', path: ['confirm'] }] });
        const handler = new GValidator().withSchema(schema).handlers[0];

        const fields = fieldsOf({ password: 'a', confirm: 'b' });
        // the mismatch routes to confirm, not password
        expect(handler(makeInput({ formKey: 'password' }), fields)).toBe(false);
        const confirm = makeInput({ formKey: 'confirm' });
        expect(handler(confirm, fields)).toBe(true);
        expect(confirm.errorText).toBe('must match');
    });

    it('surfaces every invalid field from one parse (not abort-early)', () => {
        const schema = standardSchema(() => ({
            issues: [{ message: 'a bad', path: ['a'] }, { message: 'b bad', path: ['b'] }],
        }));
        const handler = new GValidator().withSchema(schema).handlers[0];
        const fields = fieldsOf({ a: '', b: '' });

        const a = makeInput({ formKey: 'a' });
        const b = makeInput({ formKey: 'b' });
        expect(handler(a, fields)).toBe(true);
        expect(handler(b, fields)).toBe(true);
        expect(a.errorText).toBe('a bad');
        expect(b.errorText).toBe('b bad');
    });

    it('parses once for N fields sharing the same values, and re-parses when values change', () => {
        const validate = jest.fn(() => ({ issues: [{ message: 'x', path: ['nope'] }] }));
        const handler = new GValidator().withSchema(standardSchema(validate)).handlers[0];

        const fields = fieldsOf({ a: '1', b: '2' });
        handler(makeInput({ formKey: 'a' }), fields);
        handler(makeInput({ formKey: 'b' }), fields);
        expect(validate).toHaveBeenCalledTimes(1); // memoized by values signature

        handler(makeInput({ formKey: 'a' }), fieldsOf({ a: '9', b: '2' }));
        expect(validate).toHaveBeenCalledTimes(2); // values changed → re-parse
    });

    it('normalizes a { key } path segment', () => {
        const schema = standardSchema(() => ({ issues: [{ message: 'bad', path: [{ key: 'email' }] }] }));
        const handler = new GValidator().withSchema(schema).handlers[0];
        const email = makeInput({ formKey: 'email' });
        expect(handler(email, fieldsOf({ email: 'x' }))).toBe(true);
        expect(email.errorText).toBe('bad');
    });
});

describe('GValidator withSchema (sync) — dev diagnostics', () => {
    const original = (globalThis as any).__DEV__;
    beforeEach(() => { (globalThis as any).__DEV__ = true; });
    afterEach(() => { (globalThis as any).__DEV__ = original; jest.restoreAllMocks(); });

    it('warns and stays valid when handed an async schema', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const schema = standardSchema(async () => ({ issues: [{ message: 'x', path: ['email'] }] }));
        const handler = new GValidator().withSchema(schema).handlers[0];

        expect(handler(makeInput({ formKey: 'email' }), fieldsOf({ email: 'x' }))).toBe(false);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Async Schema'));
    });

    it('warns once when a cross-field rule has no path', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const schema = standardSchema(() => ({ issues: [{ message: 'root rule' }] }));
        const handler = new GValidator().withSchema(schema).handlers[0];

        expect(handler(makeInput({ formKey: 'email' }), fieldsOf({ email: 'x' }))).toBe(false);
        expect(handler(makeInput({ formKey: 'password' }), fieldsOf({ email: 'x' }))).toBe(false);
        expect(warn.mock.calls.filter(c => String(c[0]).includes('Schema Pathless Issue'))).toHaveLength(1);
    });
});

describe('GValidator withSchemaAsync (async, Standard Schema)', () => {
    it('awaits the schema and routes the matching issue', async () => {
        const schema = standardSchema(async (v: any) =>
            v.email.includes('@') ? { value: v } : { issues: [{ message: 'bad email', path: ['email'] }] });
        const handler = new GValidator().withSchemaAsync(schema).asyncHandlers[0];

        const email = makeInput({ formKey: 'email' });
        await expect(handler(email, fieldsOf({ email: 'nope' }))).resolves.toBe(true);
        expect(email.errorText).toBe('bad email');
    });

    it('also accepts a synchronous validate (await passes it through)', async () => {
        const schema = standardSchema(() => ({ issues: [{ message: 'bad', path: ['email'] }] }));
        const handler = new GValidator().withSchemaAsync(schema).asyncHandlers[0];
        await expect(handler(makeInput({ formKey: 'email' }), fieldsOf({ email: 'x' }))).resolves.toBe(true);
    });

    it('parses once for N fields sharing the same values', async () => {
        const validate = jest.fn(async () => ({ issues: [{ message: 'x', path: ['nope'] }] }));
        const handler = new GValidator().withSchemaAsync(standardSchema(validate)).asyncHandlers[0];
        const fields = fieldsOf({ a: '1', b: '2' });

        await Promise.all([
            handler(makeInput({ formKey: 'a' }), fields),
            handler(makeInput({ formKey: 'b' }), fields),
        ]);
        expect(validate).toHaveBeenCalledTimes(1);
    });
});
