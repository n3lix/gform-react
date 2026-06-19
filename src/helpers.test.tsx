import {_buildFormState, _buildRNFormState} from './helpers';
import type {InitialState} from './state';

describe('form-level dispatchChanges routing (web/RN parity)', () => {
    const makeFields = (): InitialState['fields'] =>
        ({
            name: {value: '', error: false},
            age: {value: '', error: false},
        } as unknown as InitialState['fields']);

    const cases = [
        ['web (_buildFormState)', (f: InitialState['fields'], dc: any, dav: any) =>
            _buildFormState(f, {} as HTMLFormElement, dc, dav)] as const,
        ['RN (_buildRNFormState)', (f: InitialState['fields'], dc: any, dav: any) =>
            _buildRNFormState(f, dc, dav)] as const,
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
