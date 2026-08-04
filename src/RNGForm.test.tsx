import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RNGForm } from './RNGForm';
import { GInput } from './fields/GInput';
import type { RNGFormState } from './state';

/**
 * `RNGForm` itself has no `react-native` import (only `RNGInput` does, via `TextInput`), and its
 * logic — state building, `reset`, `onInit` — is renderer-agnostic. we don't have a
 * `react-native` test renderer configured yet, so these tests drive `RNGForm` with the web `GInput`
 * as a stand-in registrable field (a plain `<input>`) purely to exercise `RNGForm`'s own state
 * management, not to assert anything about `RNGInput`/native rendering.
 */
const El = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

describe('RNGForm reset', () => {
    it('state.reset() restores fields and fires onReset with fresh post-reset state', () => {
        const onReset = jest.fn();
        let latest: RNGFormState<{ name: string }> | undefined;

        render(
            <RNGForm<{ name: string }> el={El} onReset={onReset}>
                {(state) => {
                    latest = state;
                    return <GInput formKey="name" value="Ada" data-testid="name" />;
                }}
            </RNGForm>
        );

        const name = screen.getByTestId('name') as HTMLInputElement;
        fireEvent.change(name, { target: { value: 'Grace' } });
        expect(name.value).toBe('Grace');

        act(() => {
            latest!.reset();
        });

        expect(name.value).toBe('Ada'); // back to its initial value
        expect(onReset).toHaveBeenCalledTimes(1);
        const [state] = onReset.mock.calls[0];
        expect(state.name.value).toBe('Ada'); // fresh post-reset state, not the stale pre-reset snapshot
    });

    it('does not throw or call onReset when onReset is not provided', () => {
        let latest: RNGFormState<{ name: string }> | undefined;
        render(
            <RNGForm<{ name: string }> el={El}>
                {(state) => {
                    latest = state;
                    return <GInput formKey="name" value="Ada" data-testid="name" />;
                }}
            </RNGForm>
        );

        const name = screen.getByTestId('name') as HTMLInputElement;
        fireEvent.change(name, { target: { value: 'Grace' } });

        expect(() => act(() => { latest!.reset(); })).not.toThrow();
        expect(name.value).toBe('Ada');
    });
});
