import {_buildFormState, _buildRNFormState} from './helpers';
import type {InitialState} from './state';

describe('form-level dispatchChanges routing (web/RN parity)', () => {
    const makeFields = (): InitialState['fields'] =>
        ({
            name: {value: '', error: false},
            age: {value: '', error: false},
        } as unknown as InitialState['fields']);

    const handlersOf = (dc: any, dav: any) => ({_dispatchChanges: dc, _dispatchAndValidate: dav, _validateForm: jest.fn()});

    const cases = [
        ['web (_buildFormState)', (f: InitialState['fields'], dc: any, dav: any) =>
            _buildFormState(f, {} as HTMLFormElement, handlersOf(dc, dav))] as const,
        ['RN (_buildRNFormState)', (f: InitialState['fields'], dc: any, dav: any) =>
            _buildRNFormState(f, handlersOf(dc, dav))] as const,
    ];

    it.each(cases)('%s: with { validate: true } routes each changed field through dispatchAndValidate, no bulk merge', (_label, build) => {
        const dispatchChanges = jest.fn();
        const dispatchAndValidate = jest.fn();
        const state = build(makeFields(), dispatchChanges, dispatchAndValidate);

        state.dispatchChanges({name: {value: 'Ada'}, age: {value: '30'}}, {validate: true});

        expect(dispatchAndValidate).toHaveBeenCalledTimes(2);
        expect(dispatchAndValidate).toHaveBeenCalledWith({value: 'Ada'}, 'name');
        expect(dispatchAndValidate).toHaveBeenCalledWith({value: '30'}, 'age');
        // the per-field path applies the value itself; no separate bulk merge dispatch
        expect(dispatchChanges).not.toHaveBeenCalled();
    });

    it.each(cases)('%s: without the option merges in a single dispatch and never validates', (_label, build) => {
        const dispatchChanges = jest.fn();
        const dispatchAndValidate = jest.fn();
        const state = build(makeFields(), dispatchChanges, dispatchAndValidate);

        state.dispatchChanges({name: {value: 'Ada'}, age: {value: '30'}});

        expect(dispatchChanges).toHaveBeenCalledTimes(1);
        const [arg] = dispatchChanges.mock.calls[0];
        expect(arg.fields.name.value).toBe('Ada');
        expect(arg.fields.age.value).toBe('30');
        expect(dispatchAndValidate).not.toHaveBeenCalled();
    });
});

describe('checkValidity runs the validators (not only native / not a field stub)', () => {
    const oneField = (error = false) => ({ name: { value: '', error, formKey: 'name' } } as unknown as InitialState['fields']);
    const handlersWith = (validateForm: any) => ({ _dispatchChanges: jest.fn(), _dispatchAndValidate: jest.fn(), _validateForm: validateForm } as any);

    it('web: runs custom rules via _validateForm() and combines them with native validity', () => {
        const fields = oneField();
        const validateForm = jest.fn(() => false); // a custom rule fails (returns invalid)
        const formEl = { checkValidity: () => true } as any;               // native passes (no constraints)

        const state = _buildFormState(fields, formEl, handlersWith(validateForm));
        const valid = state.checkValidity();

        expect(validateForm).toHaveBeenCalledTimes(1);
        expect(validateForm).toHaveBeenCalledWith(); // web mode (full defaults false)
        expect(valid).toBe(false);                   // custom rule gated it even though native passed
        expect(state.isInvalid).toBe(true);
    });

    it('web: native invalidity still gates when custom rules pass', () => {
        const fields = oneField();
        const formEl = { checkValidity: () => false } as any; // native fails

        const state = _buildFormState(fields, formEl, handlersWith(jest.fn()));
        expect(state.checkValidity()).toBe(false);
    });

    it('RN: validates every field via _validateForm(true) and returns its result (no field stub)', () => {
        const validateForm = jest.fn(() => false); // full validation reports the form invalid

        const state = _buildRNFormState(oneField(), handlersWith(validateForm));
        const valid = state.checkValidity();

        expect(validateForm).toHaveBeenCalledWith(true);
        expect(valid).toBe(false);
        expect(state.isInvalid).toBe(true);
    });

    it('RN: returns true when validation passes', () => {
        const state = _buildRNFormState(oneField(), handlersWith(jest.fn(() => true)));
        expect(state.checkValidity()).toBe(true);
        expect(state.isInvalid).toBe(false);
    });
});
