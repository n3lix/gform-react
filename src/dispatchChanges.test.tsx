import React from 'react';
import {render, screen, act} from '@testing-library/react';

import {GForm} from './GForm';
import {GInput} from './fields/GInput';
import {GValidator} from './validations';
import type {GFormState} from './state';
import type {GInputState} from './fields';

type Form = { name: string };

const renderForm = () => {
    let api: GFormState<Form> | undefined;
    render(
        <GForm<Form> validators={{name: new GValidator().withRequiredMessage('required')}}>
            {(state) => {
                api = state;
                return (
                    <GInput
                        formKey="name"
                        required
                        element={(input: GInputState<any>, props: any) => (
                            <div>
                                <input {...props} data-testid="i"/>
                                {input.error && <span data-testid="err">{input.errorText}</span>}
                            </div>
                        )}
                    />
                );
            }}
        </GForm>
    );
    return () => api!;
};

describe('dispatchChanges validation', () => {
    it('re-validates the field when called with { validate: true }', () => {
        const get = renderForm();

        // programmatic empty value + validate => required violation surfaces
        act(() => { get().name.dispatchChanges({value: ''}, {validate: true}); });
        expect(screen.getByTestId('err')).toHaveTextContent('required');
        expect(get().isInvalid).toBe(true);

        // programmatic valid value + validate => error clears, form becomes valid
        act(() => { get().name.dispatchChanges({value: 'Tal'}, {validate: true}); });
        expect(screen.queryByTestId('err')).toBeNull();
        expect(get().isValid).toBe(true);
    });

    it('does not validate by default (preserves a manually-set error)', () => {
        const get = renderForm();

        // set a manual error WITHOUT validate => must be preserved, not validated away
        act(() => { get().name.dispatchChanges({value: 'anything', error: true, errorText: 'manual'}); });
        expect(screen.getByTestId('err')).toHaveTextContent('manual');
        expect(get().isInvalid).toBe(true);
    });
});
