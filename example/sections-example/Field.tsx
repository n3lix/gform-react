import React from 'react';
import type { GInputState, GElementProps } from '../../src/fields';

export const fieldRenderer = (label: string) =>
    (input: GInputState, props: GElementProps<any>) => (
        <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{label}</span>
            <input {...props} />
            {input.error && input.errorText && (
                <small style={{ display: 'block', color: 'crimson' }}>{input.errorText}</small>
            )}
        </label>
    );
