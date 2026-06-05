import React from 'react';
import {render, waitFor, act} from '@testing-library/react';

import {GForm} from './GForm';
import {GInput} from './fields/GInput';
import type {GFormState} from './state';

type Form = { doc: File | null; dep: string };

describe('fetchDeps signature (File-aware)', () => {
    it('re-runs fetch when the File dependency changes', async () => {
        const fetchSpy = jest.fn();
        let api: GFormState<Form> | undefined;

        render(
            <GForm<Form>>
                {(state) => {
                    api = state;
                    return (
                        <>
                            <GInput formKey="doc" type="file"/>
                            <GInput
                                formKey="dep"
                                debounce={20}
                                fetchDeps={['doc']}
                                fetch={() => { fetchSpy(); }}
                            />
                        </>
                    );
                }}
            </GForm>
        );

        // fetch fires once on mount
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

        const fileA = new File(['a'], 'a.pdf', {type: 'application/pdf'});
        act(() => { api!.doc.dispatchChanges({value: fileA}); });
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

        // a *different* file must be detected as a change (the bug: both stringify to "{}")
        const fileB = new File(['b'], 'b.pdf', {type: 'application/pdf'});
        act(() => { api!.doc.dispatchChanges({value: fileB}); });
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    });
});
