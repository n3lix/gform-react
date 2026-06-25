import {useFormHandlers} from './useFormHandlers';
import {GValidator, type GValidators} from './validations';
import type {GInputState} from './fields';
import type {InitialState, Store} from './state';

const makeInput = (overrides: Partial<GInputState<any>> = {}): GInputState<any> => ({
    formKey: 'name',
    type: 'text',
    gid: 'test-gid',
    dirty: false,
    touched: false,
    value: '',
    error: false,
    errorText: '',
    dispatchChanges: () => undefined,
    checkValidity: () => false,
    ...overrides,
});

const createHandlers = (validators?: GValidators) => {
    let state: InitialState = {fields: {}};
    const setState = jest.fn((updater: InitialState | ((prev: InitialState) => InitialState)) => {
        state = typeof updater === 'function' ? updater(state) : updater;
    });
    const handlers = useFormHandlers(
        (() => state) as Store['getState'],
        setState as unknown as Store['setState'],
        validators
    );
    return {handlers, setState};
};

describe('useFormHandlers._blurHandler', () => {
    it('skips validation for a field without a validator and dispatches only the one-time touched flip', () => {
        const {handlers, setState} = createHandlers({});
        const input = makeInput();

        handlers._blurHandler(input);
        expect(input.touched).toBe(true);
        expect(input.error).toBe(false);
        expect(setState).toHaveBeenCalledTimes(1); // touched flip must reach subscribers

        handlers._blurHandler(input);
        handlers._blurHandler(input);
        expect(setState).toHaveBeenCalledTimes(1); // no further dispatches → no re-renders
    });

    it('points checkValidity at the error flag for validator-less fields (RN form checkValidity contract)', () => {
        const {handlers} = createHandlers({});
        const input = makeInput();

        expect(input.checkValidity()).toBe(false); // registration default: always false

        handlers._blurHandler(input);
        expect(input.checkValidity()).toBe(true); // no validator → valid unless error is set

        input.error = true; // e.g. an explicit consumer dispatchChanges({error: true})
        expect(input.checkValidity()).toBe(false);
    });

    it('runs the full validation pipeline when a validator matches the formKey', () => {
        const {handlers, setState} = createHandlers({name: new GValidator().withRequiredMessage('required')});
        const input = makeInput({required: true});

        handlers._blurHandler(input);
        expect(input.touched).toBe(true);
        expect(input.error).toBe(true);
        expect(input.errorText).toBe('required');

        handlers._blurHandler(input);
        expect(setState).toHaveBeenCalledTimes(2); // validation path dispatches on every blur
    });

    it("runs validation when only the '*' wildcard validator exists", () => {
        const {handlers} = createHandlers({'*': new GValidator().withRequiredMessage('required')});
        const input = makeInput({formKey: 'anyField', required: true});

        handlers._blurHandler(input);
        expect(input.error).toBe(true);
        expect(input.errorText).toBe('required');
    });

    it('resolves the validator through validatorKey', () => {
        const {handlers} = createHandlers({shared: new GValidator().withRequiredMessage('required')});
        const input = makeInput({formKey: 'other', validatorKey: 'shared', required: true});

        handlers._blurHandler(input);
        expect(input.error).toBe(true);
        expect(input.errorText).toBe('required');
    });

    it('ignores a missing field (delegated blur may target non-gform elements)', () => {
        const {handlers, setState} = createHandlers({});

        expect(() => handlers._blurHandler(undefined as unknown as GInputState<any>)).not.toThrow();
        expect(setState).not.toHaveBeenCalled();
    });
});


describe('useFormHandlers._validateForm(true) — React Native full validation', () => {
    const setup = (fields: InitialState['fields'], validators?: GValidators) => {
        let state: InitialState = {fields};
        const setState = jest.fn((updater: InitialState | ((prev: InitialState) => InitialState)) => {
            state = typeof updater === 'function' ? updater(state) : updater;
        });
        const handlers = useFormHandlers((() => state) as Store['getState'], setState as unknown as Store['setState'], validators);
        return {handlers, getState: () => state};
    };

    it('enforces native constraints in JS and returns the whole-form validity', () => {
        const {handlers, getState} = setup(
            {name: makeInput({required: true})},
            {name: new GValidator().withRequiredMessage('required')},
        );

        expect(handlers._validateForm(true)).toBe(false); // required + empty → invalid (no browser)
        expect(getState().fields.name.error).toBe(true);
        expect(getState().fields.name.errorText).toBe('required');
    });

    it('returns true when every field passes', () => {
        const {handlers, getState} = setup(
            {name: makeInput({required: true, value: 'Tal'})},
            {name: new GValidator().withRequiredMessage('required')},
        );

        expect(handlers._validateForm(true)).toBe(true);
        expect(getState().fields.name.error).toBe(false);
    });

    it('runs custom rules too', () => {
        const {handlers} = setup(
            {code: makeInput({formKey: 'code', value: 'foo'})},
            {code: new GValidator().withCustomValidation((i) => { i.errorText = 'no foo'; return i.value === 'foo'; })},
        );

        expect(handlers._validateForm(true)).toBe(false); // custom rule rejects 'foo'
    });

    it('skips a field with no validator (RN limitation: native constraints need a message handler)', () => {
        const {handlers} = setup({name: makeInput({required: true})}); // required attr, but no validators
        expect(handlers._validateForm(true)).toBe(true);
    });
});
