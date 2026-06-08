import React from 'react';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {GForm} from '../GForm';
import {GInput} from '../fields/GInput';
import {GValidator} from "../validations";
import type {GElementProps, GInputState} from "../fields";
import type {GFormState} from "../state";
import {_debounce, _clearDebounce} from "../helpers";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    /*
        Test `type="file"` stores the real File object (not the fakepath string)
     */

    it('stores the selected File for a file input', () => {
        const file = new File(['cv-content'], 'cv.pdf', {type: 'application/pdf'});

        render(
            <GForm<{ file: File | null }>>
                {(state) => (
                    <>
                        <GInput formKey="file" type="file" data-testid="g-input"/>
                        <span data-testid="g-name">{state.file?.value?.name ?? 'none'}</span>
                    </>
                )}
            </GForm>
        );

        const input = screen.getByTestId('g-input') as HTMLInputElement;
        fireEvent.change(input, {target: {files: [file]}});

        // the real File is stored on the field value, not the "C:\fakepath\..." string
        expect(input.files?.[0]).toBe(file);
        expect(screen.getByTestId('g-name')).toHaveTextContent('cv.pdf');
    });

    /*
        Test `type="file"` with `multiple` stores a File[] array
     */

    it('stores a File[] for a multiple file input', () => {
        const fileA = new File(['a'], 'a.pdf', {type: 'application/pdf'});
        const fileB = new File(['b'], 'b.pdf', {type: 'application/pdf'});

        render(
            <GForm<{ files: File[] }>>
                {(state) => (
                    <>
                        <GInput formKey="files" type="file" multiple data-testid="g-input"/>
                        <span data-testid="g-count">{state.files?.value?.length ?? 0}</span>
                    </>
                )}
            </GForm>
        );

        const input = screen.getByTestId('g-input') as HTMLInputElement;
        fireEvent.change(input, {target: {files: [fileA, fileB]}});

        expect(screen.getByTestId('g-count')).toHaveTextContent('2');
    });

    /*
        Test that a file input stays uncontrolled: React must not emit a
        controlled/value warning, and the stored value must be a File (never a string).
     */

    it('renders file inputs as uncontrolled without React warnings', () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const file = new File(['x'], 'cv.pdf', {type: 'application/pdf'});
        let stored: unknown = 'UNSET';

        render(
            <GForm<{ file: File | null }>>
                {(state) => {
                    stored = state.file?.value;
                    return <GInput formKey="file" type="file" data-testid="g-input"/>;
                }}
            </GForm>
        );

        const input = screen.getByTestId('g-input') as HTMLInputElement;
        fireEvent.change(input, {target: {files: [file]}});

        expect(stored).toBeInstanceOf(File);
        expect(typeof stored).not.toBe('string');
        expect(errSpy).not.toHaveBeenCalled();
        errSpy.mockRestore();
    });

    /*
        Test `required` validation for a file input (valueMissing when empty)
     */

    it('flags a required empty file input as invalid', () => {
        render(
            <GForm validators={{file: new GValidator().withRequiredMessage('file is required')}}>
                <GInput formKey="file" type="file" required data-testid="g-input"/>
            </GForm>
        );

        const input = screen.getByTestId('g-input');
        fireEvent.invalid(input);

        expect(input).toHaveAttribute('aria-invalid', 'true');
    });
});

describe('GInput debounce cleanup', () => {
    it('_clearDebounce cancels a pending debounce so it never resolves', async () => {
        let resolved = false;
        _debounce(40, 'unit-test-id').then(() => { resolved = true; });

        _clearDebounce('unit-test-id');

        await wait(80);
        expect(resolved).toBe(false);
    });

    it('cancels a pending fetch debounce when the field unmounts', async () => {
        const fetchSpy = jest.fn();

        const {unmount} = render(
            <GForm>
                <GInput formKey="x" debounce={50} fetch={() => { fetchSpy(); }}/>
            </GForm>
        );

        // unmount before the debounce window elapses → unregister must cancel it
        unmount();
        await wait(120);

        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('GInput field dispatchChanges', () => {
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
                            element={(input: GInputState<any>, props: GElementProps<any>) => (
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

describe('GInput initial value validation', () => {
    // `elementCalls` counts how many times the field's `_element` was (re)computed; a follow-up
    // validation re-render would bump it past 1.
    const renderWithInitial = (value: string) => {
        let elementCalls = 0;
        const Form = () => {
            const el = React.useCallback((input: GInputState<any>, props: GElementProps<any>) => {
                elementCalls++;
                return (
                    <div>
                        <input {...props}/>
                        {input.error && <small data-testid="err">{input.errorText}</small>}
                    </div>
                );
            }, []);
            return (
                <GForm validators={{a: new GValidator().withMinLengthMessage('too short')}}>
                    <GInput formKey="a" value={value} minLength={2} required element={el}/>
                </GForm>
            );
        };
        render(<Form/>);
        return () => elementCalls;
    };

    it('shows a constraint error for an invalid initial value on the first render (no extra validation render)', () => {
        const calls = renderWithInitial('J'); // length 1 < minLength 2

        expect(screen.getByTestId('err')).toHaveTextContent('too short');
        expect(calls()).toBe(1); // baked at registration → no follow-up validation re-render
    });

    it('shows no error for a valid initial value, and renders once', () => {
        const calls = renderWithInitial('John');

        expect(screen.queryByTestId('err')).toBeNull();
        expect(calls()).toBe(1);
    });

    // Regression: an invalid initial value must mark the field invalid *natively* so the browser
    // blocks submission. Otherwise the submit event fires, GForm sees `isInvalid` and skips
    // onSubmit/preventDefault, and the page does a native form refresh. A custom validator is
    // used because the browser has no native constraint for it — so this isolates our
    // setCustomValidity sync (a constraint like minLength might be flagged natively by jsdom).
    const renderWithCustom = (value: string) => {
        render(
            <GForm validators={{a: new GValidator().withCustomValidation((input) => {
                input.errorText = 'bad value';
                return input.value === 'bad'; // invalid only when value is "bad"
            })}}>
                <GInput formKey="a" value={value} data-testid="i"/>
                <button type="submit">Submit</button>
            </GForm>
        );
        const form = screen.getByTestId('i').closest('form') as HTMLFormElement;
        // checkValidity() fires `invalid` events → state updates → wrap in act
        let valid = false;
        act(() => { valid = form.checkValidity(); });
        return valid;
    };

    it('marks the form invalid natively for an invalid initial value (blocks submit, no refresh)', () => {
        expect(renderWithCustom('bad')).toBe(false);
    });

    it('keeps the form valid natively for a valid initial value', () => {
        expect(renderWithCustom('ok')).toBe(true);
    });
});

describe('GInput element control types', () => {
    // These spread the `element` props onto <select>/<textarea> WITHOUT a cast — if the typing
    // regressed, `tsc` would fail on these files (jest itself strips types).
    it('renders a <select> via element and updates value', () => {
        let api: GFormState<{ choice: string }> | undefined;
        render(
            <GForm<{ choice: string }>>
                {(state) => {
                    api = state;
                    return (
                        <GInput
                            formKey="choice"
                            value="a"
                            element={(input, props) => (
                                <select {...props} data-testid="sel">
                                    <option value="a">A</option>
                                    <option value="b">B</option>
                                </select>
                            )}
                        />
                    );
                }}
            </GForm>
        );

        const sel = screen.getByTestId('sel') as HTMLSelectElement;
        expect(sel.value).toBe('a');

        fireEvent.change(sel, {target: {value: 'b'}});
        expect(api!.choice.value).toBe('b');
    });

    it('renders a <textarea> via element and updates value', () => {
        let api: GFormState<{ bio: string }> | undefined;
        render(
            <GForm<{ bio: string }>>
                {(state) => {
                    api = state;
                    return (
                        <GInput
                            formKey="bio"
                            element={(input, props) => <textarea {...props} data-testid="ta"/>}
                        />
                    );
                }}
            </GForm>
        );

        fireEvent.change(screen.getByTestId('ta'), {target: {value: 'hello world'}});
        expect(api!.bio.value).toBe('hello world');
    });
});