import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {GForm} from '../GForm';
import {GInput} from '../fields/GInput';
import {GValidator} from "../validations";
import type {GElementProps, GInputState} from "../fields";

describe('GInput', () => {
    /*
        Test `onChange` event to set a new value of the input
     */
    it('updates value on change', () => {
        render(
            <GForm>
                <GInput formKey="testInput" data-testid="g-input"/>
            </GForm>
        );

        const input = screen.getByTestId('g-input') as HTMLInputElement;
        fireEvent.change(input, {target: {value: 'new value'}});

        expect(input.value).toBe('new value');
    });

    /*
        Test `element` Prop to render custom input
     */

    it('supports custom elements via element prop', () => {
        const CustomElement = (state: GInputState, props: GElementProps<any>) => (
            <div data-testid="custom-wrapper">
                <input {...props} data-testid="custom-input"/>
            </div>
        );

        render(
            <GForm validators={{requiredField: new GValidator().withRequiredMessage('custom')}}>
                <GInput formKey="custom" element={CustomElement}/>
            </GForm>
        );

        expect(screen.getByTestId('custom-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    /*
        Test `required` validation error with `errorText` and `aria-invalid`
     */

    it('displays error state when invalid', () => {
        render(
            <GForm validators={{requiredField: new GValidator().withRequiredMessage('required field')}}>
                <GInput formKey="requiredField" required data-testid="g-input"
                        element={(input, props) => <div data-testid="custom-wrapper">
                            <input {...props} />
                            {input.error && <span data-testid="g-error">{input.errorText}</span>}
                        </div>}
                />
            </GForm>
        );

        const input = screen.getByTestId('g-input');

        fireEvent.blur(input);

        const error = screen.getByTestId('g-error');

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(error).toHaveTextContent('required field');
    });

    /*
        Test `fetch` Prop
     */

    it('fires fetch function on init', async () => {
        render(
            <GForm>
                <GInput formKey="testInput"
                        data-testid="g-input"
                        fetch={() => {
                            return {value: 'new value'};
                        }}
                />
            </GForm>
        );

        const input = screen.getByTestId('g-input') as HTMLInputElement;
        await waitFor(() => {
            expect(input.value).toBe('new value');
        });
    });

    /*
        Test `fetchDeps` Prop
     */

    it('fires fetch function on another input change', async () => {
        render(
            <GForm>
                <GInput formKey="testInput"
                        data-testid="g-input"
                />

                <GInput formKey="testInput2"
                        data-testid="g-input2"
                        fetchDeps={['testInput']}
                        fetch={(input, fields) => {
                            if (!fields.testInput.value) return {value: 'first'};
                            return {value: 'success'};
                        }}
                />
            </GForm>
        );

        const input = screen.getByTestId('g-input') as HTMLInputElement;
        const input2 = screen.getByTestId('g-input2') as HTMLInputElement;

        fireEvent.change(input, {target: {value: 'new value'}});

        await waitFor(() => {
            expect(input2.value).toBe('success');
        });
    });
});