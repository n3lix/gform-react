import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';

import {GValidator} from './GValidator';
import {GForm} from '../GForm';
import {GInput} from '../fields/GInput';
import type {GInputState} from '../fields';

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
