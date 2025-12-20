import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GForm } from './GForm';
import { GInput } from './fields/GInput';

describe('GForm', () => {
    it('renders children correctly', () => {
        render(
            <GForm data-testid="test-form">
                <GInput formKey="username" />
            </GForm>
        );
        expect(screen.getByTestId('test-form')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('calls onSubmit with form state when valid', () => {
        const handleSubmit = jest.fn();
        render(
            <GForm onSubmit={handleSubmit}>
                <GInput formKey="username" data-testid="g-input" />
                <button type="submit">Submit</button>
            </GForm>
        );

        const input = screen.getByTestId('g-input') as HTMLInputElement;

        fireEvent.change(input, {target: {value: 'testuser'}});
        fireEvent.submit(screen.getByRole('button'));

        expect(handleSubmit).toHaveBeenCalled();
        const [state] = handleSubmit.mock.calls[0];
        expect(state.username.value).toBe('testuser');
    });

    it('exposes form state via render props', () => {
        render(
            <GForm >
                {(state) => (
                    <div data-testid="state-display">
                        {state.isValid ? 'Valid' : 'Invalid'}
                    </div>
                )}
            </GForm>
        );
        expect(screen.getByTestId('state-display')).toHaveTextContent('Valid');
    });
});