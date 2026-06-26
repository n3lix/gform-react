import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { z } from 'zod';
import * as yup from 'yup';
import { GForm } from './GForm';
import { GInput } from './fields/GInput';
import { GValidator } from './validations';
import type { GValidators } from './validations';
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

    it('toRawData honors include / exclude / transform', () => {
        const getState = setup();

        expect(getState().toRawData({include: ['first']})).toEqual({first: 'Ada'});
        expect(getState().toRawData({exclude: ['last']})).toEqual({first: 'Ada'});
        expect(getState().toRawData({transform: {first: (v) => v.toUpperCase()}}))
            .toEqual({first: 'ADA', last: 'Lovelace'});
    });

    it('toFormData honors include / exclude / transform', () => {
        const getState = setup();

        const included = getState().toFormData({include: ['first']});
        expect(included.get('first')).toBe('Ada');
        expect(included.get('last')).toBeNull();

        const excluded = getState().toFormData({exclude: ['last']});
        expect(excluded.get('first')).toBe('Ada');
        expect(excluded.get('last')).toBeNull();

        const transformed = getState().toFormData({transform: {first: (v) => v.toUpperCase()}});
        expect(transformed.get('first')).toBe('ADA');
        expect(transformed.get('last')).toBe('Lovelace');
    });

    it('toURLSearchParams honors include / exclude / transform', () => {
        const getState = setup();

        const included = getState().toURLSearchParams({include: ['first']});
        expect(included.get('first')).toBe('Ada');
        expect(included.get('last')).toBeNull();

        const excluded = getState().toURLSearchParams({exclude: ['last']});
        expect(excluded.get('first')).toBe('Ada');
        expect(excluded.get('last')).toBeNull();

        const transformed = getState().toURLSearchParams({transform: {first: (v) => v.toUpperCase()}});
        expect(transformed.get('first')).toBe('ADA');
        expect(transformed.get('last')).toBe('Lovelace');
    });

    it('toFormData keeps native checkbox serialization (omit unchecked, "on" when checked)', () => {
        let latest: GFormState<{agree: boolean}> | undefined;
        render(
            <GForm<{agree: boolean}>>
                {(state) => {
                    latest = state;
                    return <GInput formKey="agree" type="checkbox" data-testid="agree"/>;
                }}
            </GForm>
        );

        expect(latest!.toFormData().get('agree')).toBeNull(); // unchecked → omitted, like native

        fireEvent.click(screen.getByTestId('agree'));
        expect(latest!.toFormData().get('agree')).toBe('on'); // checked → native "on"
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

    it('checkValidity() runs custom rules, not just native constraints', () => {
        let latest: GFormState<{ name: string }> | undefined;
        render(
            <GForm<{ name: string }> validators={{ '*': new GValidator().withCustomValidation((i) => { i.errorText = 'required'; return !i.value; }) }}>
                {(state) => {
                    latest = state;
                    return (
                        <GInput formKey="name" element={(input, props) => (
                            <>
                                <input {...props} data-testid="n" />
                                {input.error && <small data-testid="n-err">{input.errorText}</small>}
                            </>
                        )} />
                    );
                }}
            </GForm>
        );

        // untouched custom field with NO native constraint: native-only checkValidity returned true
        let result: boolean;
        act(() => { result = latest!.checkValidity(); });
        expect(result!).toBe(false);                                       // custom rule ran
        expect(screen.getByTestId('n-err')).toHaveTextContent('required'); // and surfaced

        fireEvent.change(screen.getByTestId('n'), { target: { value: 'x' } });
        act(() => { result = latest!.checkValidity(); });
        expect(result!).toBe(true);
    });

    it('field-level checkValidity() validates the live value (not the registration snapshot)', () => {
        let latest: GFormState<{ name: string }> | undefined;
        render(
            <GForm<{ name: string }> validators={{ '*': new GValidator().withCustomValidation((i) => { i.errorText = 'required'; return !i.value; }) }}>
                {(state) => {
                    latest = state;
                    return <GInput formKey="name" element={(input, props) => <input {...props} data-testid="n" />} />;
                }}
            </GForm>
        );

        let r: boolean;
        act(() => { r = latest!.name.checkValidity(); });
        expect(r!).toBe(false); // empty → custom rule fails

        fireEvent.change(screen.getByTestId('n'), { target: { value: 'x' } });
        act(() => { r = latest!.name.checkValidity(); });
        expect(r!).toBe(true);  // live value used (would stay false if it validated the stale snapshot)
    });

    it('clears a custom error from native validity when the value becomes valid (setCustomValidity reset)', () => {
        render(
            <GForm validators={{ name: new GValidator().withCustomValidation((i) => { i.errorText = 'no foo'; return i.value === 'foo'; }) }}>
                <GInput formKey="name" element={(input, props) => <input {...props} data-testid="n" />} />
            </GForm>
        );
        const el = screen.getByTestId('n') as HTMLInputElement;

        // custom rule fails → the custom error is synced into native validity
        fireEvent.change(el, { target: { value: 'foo' } });
        expect(el.validity.customError).toBe(true);
        expect(el.validationMessage).toBe('no foo');

        // now valid → the `setCustomValidity('')` reset must release native validity
        // (without it, _findValidityKey sees the stale customError and the clear path is skipped)
        fireEvent.change(el, { target: { value: 'bar' } });
        expect(el.validity.customError).toBe(false);
        expect(el.validationMessage).toBe('');
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
                <GInput formKey="name" data-testid="i"/>
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

    it('delegated blur skips dispatch for a validator-less field but still validates one with a validator', () => {
        let renders = 0;
        render(
            <GForm optimized validators={{ validated: new GValidator().withRequiredMessage('required field') }}>
                <GInput formKey="plain" element={(input, props) => {
                    renders++;
                    return <input {...props} data-testid="plain"/>;
                }}/>
                <GInput formKey="validated" required element={(input, props) => (
                    <div>
                        <input {...props} data-testid="validated"/>
                        {input.error && <span data-testid="err">{input.errorText}</span>}
                    </div>
                )}/>
            </GForm>
        );

        const plain = screen.getByTestId('plain');
        fireEvent.blur(plain); // touched flip
        const after = renders;
        fireEvent.blur(plain);
        fireEvent.blur(plain);
        expect(renders).toBe(after); // no validator → delegated blur dispatches nothing further

        fireEvent.blur(screen.getByTestId('validated'));
        expect(screen.getByTestId('err')).toHaveTextContent('required field');
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

    it('re-validates changed fields and clears a stale error with { validate: true }', () => {
        const validators = { '*': new GValidator().withRequiredMessage('Required') };
        let latest: GFormState<{ name: string }> | undefined;
        render(
            <GForm<{ name: string }> validators={validators}>
                {(state) => {
                    latest = state;
                    return <GInput formKey="name" required/>;
                }}
            </GForm>
        );

        // arrive at a stale error: clear + validate surfaces the required rule
        act(() => {
            latest!.name.dispatchChanges({ value: '' }, { validate: true });
        });
        expect(latest!.name.error).toBe(true);
        expect(latest!.name.errorText).toBe('Required');

        // form-level autofill WITH validate re-runs the rule against the new value -> error clears
        act(() => {
            latest!.dispatchChanges({ name: { value: 'Ada' } }, { validate: true });
        });
        expect(latest!.name.value).toBe('Ada');
        expect(latest!.name.error).toBe(false);
        expect(latest!.name.errorText).toBe('');
        expect(latest!.isValid).toBe(true);
    });

    it('without the option, merges only and leaves a stale error untouched (contract)', () => {
        const validators = { '*': new GValidator().withRequiredMessage('Required') };
        let latest: GFormState<{ name: string }> | undefined;
        render(
            <GForm<{ name: string }> validators={validators}>
                {(state) => {
                    latest = state;
                    return <GInput formKey="name" required/>;
                }}
            </GForm>
        );

        act(() => {
            latest!.name.dispatchChanges({ value: '' }, { validate: true });
        });
        expect(latest!.name.error).toBe(true);

        // merge-only: the value updates but the stale error is deliberately left in place
        act(() => {
            latest!.dispatchChanges({ name: { value: 'Ada' } });
        });
        expect(latest!.name.value).toBe('Ada');
        expect(latest!.name.error).toBe(true);
    });
});

describe('GForm native reset', () => {
    it('restores fields to their initial values on a native reset', () => {
        render(
            <GForm>
                <GInput formKey="name" value="Ada" data-testid="name"/>
                <GInput formKey="city" data-testid="city"/>
                <button type="reset">Reset</button>
            </GForm>
        );

        const name = screen.getByTestId('name') as HTMLInputElement;
        const city = screen.getByTestId('city') as HTMLInputElement;

        fireEvent.change(name, {target: {value: 'Grace'}});
        fireEvent.change(city, {target: {value: 'London'}});
        expect(name.value).toBe('Grace');
        expect(city.value).toBe('London');

        fireEvent.click(screen.getByRole('button', {name: 'Reset'}));

        expect(name.value).toBe('Ada'); // back to its initial value
        expect(city.value).toBe('');    // back to empty (no initial value)
    });

    it('clears validation errors on reset and calls onReset with the form state', () => {
        const onReset = jest.fn();
        render(
            <GForm
                validators={{name: new GValidator().withRequiredMessage('required')}}
                onReset={onReset}
            >
                <GInput
                    formKey="name"
                    required
                    element={(input, props) => (
                        <div>
                            <input {...props} data-testid="name"/>
                            {input.error && <span data-testid="err">{input.errorText}</span>}
                        </div>
                    )}
                />
                <button type="reset">Reset</button>
            </GForm>
        );

        const name = screen.getByTestId('name') as HTMLInputElement;

        // drive the field invalid (required, left empty) so an error is showing
        fireEvent.change(name, {target: {value: 'x'}});
        fireEvent.change(name, {target: {value: ''}});
        fireEvent.blur(name);
        expect(screen.getByTestId('err')).toHaveTextContent('required');

        fireEvent.click(screen.getByRole('button', {name: 'Reset'}));

        expect(screen.queryByTestId('err')).toBeNull(); // error cleared
        expect(name.value).toBe('');
        expect(onReset).toHaveBeenCalledTimes(1);
        const [state] = onReset.mock.calls[0];
        expect(state.name.value).toBe('');
    });

    it('uses onInit-seeded values as the reset baseline', () => {
        render(
            <GForm onInit={() => ({name: {value: 'Seeded'}})}>
                <GInput formKey="name" data-testid="name"/>
                <button type="reset">Reset</button>
            </GForm>
        );

        const name = screen.getByTestId('name') as HTMLInputElement;
        expect(name.value).toBe('Seeded'); // onInit applied

        fireEvent.change(name, {target: {value: 'Edited'}});
        expect(name.value).toBe('Edited');

        fireEvent.click(screen.getByRole('button', {name: 'Reset'}));
        expect(name.value).toBe('Seeded'); // back to the onInit value, not empty
    });
});

describe('GForm async validator submit gating', () => {
    // Regression: an async validator re-validated on the blur fired by clicking submit used to
    // optimistically re-set `error = true`, blocking the first submit until the async re-resolved
    // (so only the second click worked). A value unchanged since its last settled result must not
    // be re-validated on blur.
    it('submits on the first attempt after an async validator settles valid', async () => {
        const onSubmit = jest.fn();
        const validators = {
            firstName: new GValidator().withCustomValidationAsync(async (input) => {
                input.errorText = 'must include !';
                return !String(input.value).includes('!'); // true => invalid
            }),
        };

        render(
            <GForm
                validators={validators}
                onSubmit={(state, e) => { e.preventDefault(); onSubmit(state); }}
            >
                <GInput
                    formKey="firstName"
                    value="asd"
                    debounce={20}
                    element={(input, props) => (
                        <div>
                            <input {...props} data-testid="firstName"/>
                            {input.error && <small data-testid="err">{input.errorText}</small>}
                        </div>
                    )}
                />
                <button type="submit">submit</button>
            </GForm>
        );

        const input = screen.getByTestId('firstName') as HTMLInputElement;

        // initial value 'asd' settles invalid → form blocked with the async error
        await waitFor(() => expect(screen.getByTestId('err')).toHaveTextContent('must include !'));

        // type a valid value and wait for the async to clear the error
        fireEvent.change(input, {target: {value: 'asd!'}});
        await waitFor(() => expect(screen.queryByTestId('err')).toBeNull());

        // clicking submit blurs the focused input first — this must NOT re-invalidate the field
        fireEvent.blur(input);
        expect(screen.queryByTestId('err')).toBeNull(); // guard: no optimistic re-block

        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1); // fires on the FIRST submit, not the second
    });

    // The async settled-value guard now lives in `_blurHandler`. Optimized mode delegates blur to
    // the <form> (which still routes through `_blurHandler`), so the first-submit fix must hold here too.
    it('submits on the first attempt in optimized mode (delegated blur)', async () => {
        const onSubmit = jest.fn();
        const validators = {
            firstName: new GValidator().withCustomValidationAsync(async (input) => {
                input.errorText = 'must include !';
                return !String(input.value).includes('!'); // true => invalid
            }),
        };

        render(
            <GForm
                optimized
                validators={validators}
                onSubmit={(state, e) => { e.preventDefault(); onSubmit(state); }}
            >
                <GInput
                    formKey="firstName"
                    value="asd"
                    debounce={20}
                    element={(input, props) => (
                        <div>
                            <input {...props} data-testid="firstName"/>
                            {input.error && <small data-testid="err">{input.errorText}</small>}
                        </div>
                    )}
                />
                <button type="submit">submit</button>
            </GForm>
        );

        const input = screen.getByTestId('firstName') as HTMLInputElement;

        await waitFor(() => expect(screen.getByTestId('err')).toHaveTextContent('must include !'));

        fireEvent.change(input, {target: {value: 'asd!'}});
        await waitFor(() => expect(screen.queryByTestId('err')).toBeNull());

        fireEvent.blur(input); // delegated to the <form> → _blurHandler → must not re-block
        expect(screen.queryByTestId('err')).toBeNull();

        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});

describe('GForm validatorDeps (cross-field validation)', () => {
    type PwForm = { password: string; confirm: string };

    const makeValidators = (): GValidators<PwForm> => ({
        '*': new GValidator().withRequiredMessage('required'),
        confirm: new GValidator()
            .withRequiredMessage('required')
            .withCustomValidation((input, fields) => {
                if (input.value !== fields.password.value) {
                    input.errorText = "Passwords don't match";
                    return true; // invalid
                }
                return false; // valid
            }),
    });

    const renderForm = (onSubmit = jest.fn()) => {
        render(
            <GForm<PwForm> validators={makeValidators()} onSubmit={onSubmit}>
                <GInput formKey="password" required data-testid="password" />
                <GInput
                    formKey="confirm"
                    required
                    validatorDeps={['password']}
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="confirm" />
                            {input.error && <small data-testid="confirm-error">{input.errorText}</small>}
                        </>
                    )}
                />
                <button type="submit">Submit</button>
            </GForm>
        );
        return onSubmit;
    };

    it('re-validates a touched dependent when its dependency changes', () => {
        const onSubmit = renderForm();
        const password = screen.getByTestId('password');

        fireEvent.change(password, { target: { value: 'secret1' } });
        fireEvent.change(screen.getByTestId('confirm'), { target: { value: 'secret1' } });

        // matching → valid → submit goes through, no error shown
        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('confirm-error')).toBeNull();

        // changing the dependency makes the (untouched-since) confirm stale → must re-validate
        onSubmit.mockClear();
        fireEvent.change(password, { target: { value: 'secret2' } });

        expect(screen.getByTestId('confirm-error')).toHaveTextContent("Passwords don't match");
        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled(); // invalid dependent blocks submit
    });

    it('clears a stale mismatch when the dependency catches up (confirm typed first)', () => {
        renderForm();

        // type confirm first → mismatches the (still empty) password
        fireEvent.change(screen.getByTestId('confirm'), { target: { value: 'qwe!' } });
        expect(screen.getByTestId('confirm-error')).toHaveTextContent("Passwords don't match");

        // now type the same into password → confirm must re-validate and clear
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'qwe!' } });
        expect(screen.queryByTestId('confirm-error')).toBeNull();
    });

    it('does not surface an error on a dependent the user has not touched', () => {
        renderForm();

        // only the dependency is edited; confirm was never touched
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'abc' } });

        expect(screen.queryByTestId('confirm-error')).toBeNull();
    });

    it('syncs native validity so an invalid dependent blocks a native submit', () => {
        renderForm();
        const confirm = screen.getByTestId('confirm') as HTMLInputElement;

        fireEvent.change(screen.getByTestId('password'), { target: { value: 'secret1' } });
        fireEvent.change(confirm, { target: { value: 'secret1' } });
        expect(confirm.validity.customError).toBe(false);

        fireEvent.change(screen.getByTestId('password'), { target: { value: 'secret2' } });

        expect(confirm.validity.customError).toBe(true);
        expect(confirm.validationMessage).toBe("Passwords don't match");
    });

    it('re-validates an async dependent when its dependency changes (no longer stale)', async () => {
        const validators: GValidators<PwForm> = {
            '*': new GValidator().withRequiredMessage('required'),
            confirm: new GValidator()
                .withRequiredMessage('required')
                .withCustomValidationAsync(async (input, fields) => {
                    input.errorText = "Passwords don't match";
                    return input.value !== fields.password.value; // true => invalid
                }),
        };

        render(
            <GForm<PwForm> validators={validators}>
                <GInput formKey="password" required debounce={20}
                    element={(input, props) => <input {...props} data-testid="password" />}
                />
                <GInput formKey="confirm" required validatorDeps={['password']} debounce={20}
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="confirm" />
                            {input.error && <small data-testid="confirm-error">{input.errorText}</small>}
                        </>
                    )}
                />
            </GForm>
        );

        // match → confirm's async settles valid
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'abc' } });
        fireEvent.change(screen.getByTestId('confirm'), { target: { value: 'abc' } });
        await waitFor(() => expect(screen.queryByTestId('confirm-error')).toBeNull());

        // change the dependency → before this refactor confirm stayed stale-valid (the async-skip
        // short-circuited the unchanged value); now its async re-runs and surfaces the mismatch
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'xyz' } });
        await waitFor(() => expect(screen.getByTestId('confirm-error')).toHaveTextContent("Passwords don't match"));
    });

    it('keeps both fields correct when each carries the match rule (mutual deps)', () => {
        // mirrors the real confirm-password setup where BOTH validators read the other field
        const validators: GValidators<PwForm> = {
            '*': new GValidator().withRequiredMessage('required'),
            password: new GValidator()
                .withRequiredMessage('required')
                .withCustomValidation((input, fields) => {
                    input.errorText = "Passwords don't match";
                    return input.value !== fields.confirm.value;
                }),
            confirm: new GValidator()
                .withRequiredMessage('required')
                .withCustomValidation((input, fields) => {
                    input.errorText = "Passwords don't match";
                    return input.value !== fields.password.value;
                }),
        };

        render(
            <GForm<PwForm> validators={validators}>
                <GInput formKey="password" required validatorDeps={['confirm']}
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="password" />
                            {input.error && <small data-testid="password-error">{input.errorText}</small>}
                        </>
                    )}
                />
                <GInput formKey="confirm" required validatorDeps={['password']}
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="confirm" />
                            {input.error && <small data-testid="confirm-error">{input.errorText}</small>}
                        </>
                    )}
                />
            </GForm>
        );

        // type password first → it mismatches the still-empty confirm and errors
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'asd!' } });
        expect(screen.getByTestId('password-error')).toBeInTheDocument();

        // typing a matching confirm must clear BOTH (mutual deps re-validate each direction)
        fireEvent.change(screen.getByTestId('confirm'), { target: { value: 'asd!' } });
        expect(screen.queryByTestId('password-error')).toBeNull();
        expect(screen.queryByTestId('confirm-error')).toBeNull();
    });

    it('does not infinite-loop on mutual dependencies', () => {
        const onSubmit = jest.fn();
        render(
            <GForm<PwForm> validators={makeValidators()} onSubmit={onSubmit}>
                <GInput formKey="password" required validatorDeps={['confirm']} data-testid="password" />
                <GInput
                    formKey="confirm"
                    required
                    validatorDeps={['password']}
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="confirm" />
                            {input.error && <small data-testid="confirm-error">{input.errorText}</small>}
                        </>
                    )}
                />
                <button type="submit">Submit</button>
            </GForm>
        );

        fireEvent.change(screen.getByTestId('password'), { target: { value: 'secret1' } });
        fireEvent.change(screen.getByTestId('confirm'), { target: { value: 'secret1' } });
        // mutating the dependency re-validates confirm without re-triggering password's effect
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'secret2' } });

        expect(screen.getByTestId('confirm-error')).toHaveTextContent("Passwords don't match");
        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();
    });
});

describe('GForm withSchema (Zod)', () => {
    type Form = { password: string; confirm: string };

    // one whole-object schema, including a cross-field refine routed to `confirm`
    const schema = z.object({
        password: z.string().min(4, 'Min 4 chars'),
        confirm: z.string(),
    }).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ['confirm'] });

    const validators: GValidators<Form> = { '*': new GValidator().withSchema(schema) };

    const renderForm = (onSubmit = jest.fn()) => {
        render(
            <GForm<Form> validators={validators} onSubmit={(state, e) => { e.preventDefault(); onSubmit(state); }}>
                <GInput
                    formKey="password"
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="password" />
                            {input.error && <small data-testid="password-error">{input.errorText}</small>}
                        </>
                    )}
                />
                <GInput
                    formKey="confirm"
                    validatorDeps={['password']}
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="confirm" />
                            {input.error && <small data-testid="confirm-error">{input.errorText}</small>}
                        </>
                    )}
                />
                <button type="submit">Submit</button>
            </GForm>
        );
        return onSubmit;
    };

    it('submits when the whole-object schema passes', () => {
        const onSubmit = renderForm();
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'abcd' } });
        fireEvent.change(screen.getByTestId('confirm'), { target: { value: 'abcd' } });

        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('blocks submit and shows a leaf error while a field violates the schema', () => {
        const onSubmit = renderForm();
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'ab' } }); // min(4) fails

        expect(screen.getByTestId('password-error')).toHaveTextContent('Min 4 chars');
        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('fires the cross-field refine on the confirm field, and clears it when password catches up', () => {
        renderForm();
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'abcd' } });
        fireEvent.change(screen.getByTestId('confirm'), { target: { value: 'abcdX' } });

        // object-level .refine() fired (leaf-only routing never would) and routed to confirm
        expect(screen.getByTestId('confirm-error')).toHaveTextContent("Passwords don't match");

        // editing the dependency re-validates the touched confirm (validatorDeps) → mismatch clears
        fireEvent.change(screen.getByTestId('password'), { target: { value: 'abcdX' } });
        expect(screen.queryByTestId('confirm-error')).toBeNull();
    });
});

describe('GForm withSchemaAsync (Yup)', () => {
    type Form = { email: string };

    // Yup's Standard Schema `validate` is async, so it must go through withSchemaAsync
    const schema = yup.object({ email: yup.string().email('Enter a valid email').required('Required') });
    const validators: GValidators<Form> = { '*': new GValidator().withSchemaAsync(schema) };

    it('validates a real Yup schema through the debounced async path', async () => {
        render(
            <GForm<Form> validators={validators}>
                <GInput
                    formKey="email"
                    debounce={20}
                    element={(input, props) => (
                        <>
                            <input {...props} data-testid="email" />
                            {input.error && input.errorText && <small data-testid="email-error">{input.errorText}</small>}
                        </>
                    )}
                />
            </GForm>
        );

        fireEvent.change(screen.getByTestId('email'), { target: { value: 'nope' } });
        await waitFor(() => expect(screen.getByTestId('email-error')).toHaveTextContent('Enter a valid email'));

        fireEvent.change(screen.getByTestId('email'), { target: { value: 'a@b.com' } });
        await waitFor(() => expect(screen.queryByTestId('email-error')).toBeNull());
    });
});

describe('GForm submit-time validation gating (custom rules with no native constraint)', () => {
    const renderWithError = (testId: string) =>
        (input: any, props: any) => (
            <>
                <input {...props} data-testid={testId} />
                {input.error && input.errorText && <small data-testid={`${testId}-err`}>{input.errorText}</small>}
            </>
        );

    it('blocks an untouched custom-validation form and surfaces the error', () => {
        const onSubmit = jest.fn();
        render(
            <GForm
                validators={{ '*': new GValidator().withCustomValidation((i) => { i.errorText = 'required'; return !i.value; }) }}
                onSubmit={(s, e) => { e.preventDefault(); onSubmit(s.toRawData()); }}
            >
                <GInput formKey="username" element={renderWithError('u')} />
                <button>submit</button>
            </GForm>
        );

        fireEvent.submit(screen.getByRole('button')); // never touched the field
        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByTestId('u-err')).toHaveTextContent('required');
    });

    it('blocks an untouched withSchema (zod) form', () => {
        const onSubmit = jest.fn();
        const schema = z.object({ email: z.string().email('enter a valid email') });
        render(
            <GForm validators={{ '*': new GValidator().withSchema(schema) }} onSubmit={(s, e) => { e.preventDefault(); onSubmit(); }}>
                <GInput formKey="email" element={renderWithError('email')} />
                <button>submit</button>
            </GForm>
        );

        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('blocks an untouched field whose native constraint does not cover empty (minLength + custom)', () => {
        // the counterexample: minLength passes on an empty field, so only the custom rule can gate it
        const onSubmit = jest.fn();
        const validators: GValidators = { username: new GValidator().withCustomValidation((i) => { i.errorText = 'custom required'; return !i.value; }) };
        render(
            <GForm validators={validators} onSubmit={(s, e) => { e.preventDefault(); onSubmit(); }}>
                <GInput formKey="username" minLength={3} element={renderWithError('u')} />
                <button>submit</button>
            </GForm>
        );

        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByTestId('u-err')).toHaveTextContent('custom required');
    });

    it('submits once when the custom rule passes', () => {
        const onSubmit = jest.fn();
        render(
            <GForm
                validators={{ '*': new GValidator().withCustomValidation((i) => { i.errorText = 'required'; return !i.value; }) }}
                onSubmit={(s, e) => { e.preventDefault(); onSubmit(); }}
            >
                <GInput formKey="username" element={renderWithError('u')} />
                <button>submit</button>
            </GForm>
        );

        fireEvent.change(screen.getByTestId('u'), { target: { value: 'tal' } });
        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('blocks an untouched async-schema (Yup) form (best-effort: optimistic block)', async () => {
        const onSubmit = jest.fn();
        const schema = yup.object({ email: yup.string().email('bad').required('required') });
        render(
            <GForm validators={{ '*': new GValidator().withSchemaAsync(schema) }} onSubmit={(s, e) => { e.preventDefault(); onSubmit(); }}>
                <GInput formKey="email" debounce={20} element={renderWithError('email')} />
                <button>submit</button>
            </GForm>
        );

        fireEvent.submit(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.getByTestId('email-err')).toHaveTextContent('required'));
    });
});