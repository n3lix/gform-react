import React from 'react';
import {render} from '@testing-library/react';

import {_debounce, _clearDebounce} from './helpers';
import {GForm} from './GForm';
import {GInput} from './fields/GInput';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('debounce timer map (cleanup)', () => {
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
