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
