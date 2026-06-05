import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GForm } from './GForm';
import { GInput } from './fields/GInput';
import { GValidator } from './validations';
import type { GFormState } from './state';

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

describe('GForm submission gating', () => {
    it('does not call onSubmit while a validator marks the form invalid', () => {
        const onSubmit = jest.fn();
        render(
            <GForm validators={{name: new GValidator().withRequiredMessage('required')}} onSubmit={onSubmit}>
                <GInput formKey="name" required data-testid="i"/>
                <button type="submit">Submit</button>
            </GForm>
        );

        fireEvent.blur(screen.getByTestId('i')); // validate empty required => error
        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();

        fireEvent.change(screen.getByTestId('i'), {target: {value: 'Tal'}});
        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});

describe('GForm onChange', () => {
    it('fires onChange with the form state on input change', () => {
        const onChange = jest.fn();
        render(
            <GForm onChange={onChange}>
                <GInput formKey="name" data-testid="i"/>
            </GForm>
        );

        fireEvent.change(screen.getByTestId('i'), {target: {value: 'x'}});

        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls[0][0]).toBeDefined(); // first arg is the form state
    });
});

describe('GForm serialization', () => {
    type Form = { first: string; last: string };

    const setup = () => {
        let latest: GFormState<Form> | undefined;
        render(
            <GForm<Form>>
                {(state) => {
                    latest = state;
                    return (
                        <>
                            <GInput formKey="first" data-testid="first"/>
                            <GInput formKey="last" data-testid="last"/>
                        </>
                    );
                }}
            </GForm>
        );
        fireEvent.change(screen.getByTestId('first'), {target: {value: 'Ada'}});
        fireEvent.change(screen.getByTestId('last'), {target: {value: 'Lovelace'}});
        return () => latest!;
    };

    it('toRawData returns a key/value map of field values', () => {
        expect(setup()().toRawData()).toEqual({first: 'Ada', last: 'Lovelace'});
    });

    it('toFormData includes field values', () => {
        const fd = setup()().toFormData();
        expect(fd.get('first')).toBe('Ada');
        expect(fd.get('last')).toBe('Lovelace');
    });

    it('toURLSearchParams serializes field values', () => {
        const params = setup()().toURLSearchParams();
        expect(params.get('first')).toBe('Ada');
        expect(params.get('last')).toBe('Lovelace');
    });
});

describe('GForm onInit', () => {
    it('applies initial values returned from onInit', async () => {
        render(
            <GForm<{ name: string }> onInit={() => ({name: {value: 'preset'}})}>
                <GInput formKey="name" data-testid="i"/>
            </GForm>
        );

        await waitFor(() =>
            expect((screen.getByTestId('i') as HTMLInputElement).value).toBe('preset')
        );
    });
});

describe('GForm stateRef', () => {
    it('points to the current form state', () => {
        const ref = React.createRef<GFormState<{ name: string }>>() as React.RefObject<GFormState<{ name: string }> | undefined>;
        render(
            <GForm<{ name: string }> stateRef={ref}>
                <GInput formKey="name" data-testid="i"/>
            </GForm>
        );

        fireEvent.change(screen.getByTestId('i'), {target: {value: 'hi'}});
        expect(ref.current?.name.value).toBe('hi');
    });
});

describe('GForm validity', () => {
    it('checkValidity() reflects native constraints', () => {
        let latest: GFormState<{ name: string }> | undefined;
        render(
            <GForm<{ name: string }>>
                {(state) => { latest = state; return <GInput formKey="name" required data-testid="i"/>; }}
            </GForm>
        );

        fireEvent.blur(screen.getByTestId('i')); // ensure a render with the committed form element

        // checkValidity() runs native validation, which fires `invalid` events → state updates,
        // so it must be wrapped in act()
        let result: boolean;
        act(() => { result = latest!.checkValidity(); });
        expect(result!).toBe(false); // required + empty

        fireEvent.change(screen.getByTestId('i'), {target: {value: 'x'}});
        act(() => { result = latest!.checkValidity(); });
        expect(result!).toBe(true);
    });

    it('isInvalid flips when a validator error surfaces', () => {
        let latest: GFormState<{ name: string }> | undefined;
        render(
            <GForm<{ name: string }> validators={{name: new GValidator().withRequiredMessage('required')}}>
                {(state) => { latest = state; return <GInput formKey="name" required data-testid="i"/>; }}
            </GForm>
        );

        expect(latest!.isValid).toBe(true); // not validated yet
        fireEvent.blur(screen.getByTestId('i'));
        expect(latest!.isInvalid).toBe(true);
    });
});

describe('GForm dynamic fields', () => {
    it('removes a field from form state when it unmounts', () => {
        let latest: GFormState<{ a: string; b: string }> | undefined;
        const Wrapper = ({show}: { show: boolean }) => (
            <GForm<{ a: string; b: string }>>
                {(state) => {
                    latest = state;
                    return (
                        <>
                            <GInput formKey="a" data-testid="a"/>
                            {show && <GInput formKey="b" data-testid="b"/>}
                        </>
                    );
                }}
            </GForm>
        );

        const {rerender} = render(<Wrapper show={true}/>);
        fireEvent.change(screen.getByTestId('a'), {target: {value: '1'}});
        fireEvent.change(screen.getByTestId('b'), {target: {value: '2'}});
        expect(Object.keys(latest!.toRawData())).toEqual(expect.arrayContaining(['a', 'b']));

        rerender(<Wrapper show={false}/>);
        expect(Object.keys(latest!.toRawData())).toEqual(['a']);
    });
});

describe('GForm optimized mode', () => {
    it('handles change and submit via event delegation, without a controlled-input warning', () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const onSubmit = jest.fn();
        render(
            <GForm optimized onSubmit={onSubmit}>
                <GInput formKey="name" optimized data-testid="i"/>
                <button type="submit">Submit</button>
            </GForm>
        );

        fireEvent.change(screen.getByTestId('i'), {target: {value: 'hello'}});
        fireEvent.submit(screen.getByRole('button'));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0].name.value).toBe('hello');
        // the no-op onChange must keep React from warning about a controlled value w/o onChange
        expect(errSpy).not.toHaveBeenCalled();
        errSpy.mockRestore();
    });
});

describe('GForm dispatchChanges (form-level)', () => {
    it('applies changes to multiple fields at once', () => {
        let latest: GFormState<{ a: string; b: string }> | undefined;
        render(
            <GForm<{ a: string; b: string }>>
                {(state) => {
                    latest = state;
                    return (
                        <>
                            <GInput formKey="a" data-testid="a"/>
                            <GInput formKey="b" data-testid="b"/>
                        </>
                    );
                }}
            </GForm>
        );

        // form-level dispatchChanges can target any number of fields in one call
        act(() => {
            latest!.dispatchChanges({a: {value: 'x'}, b: {value: 'y'}});
        });

        expect(latest!.a.value).toBe('x');
        expect(latest!.b.value).toBe('y');
        expect((screen.getByTestId('a') as HTMLInputElement).value).toBe('x');
        expect((screen.getByTestId('b') as HTMLInputElement).value).toBe('y');
    });
});