import React, { useState } from 'react';
import { GForm } from '../../src/GForm';
import { GInput } from '../../src/fields/GInput';
import { GValidator, type GValidators } from '../../src/validations';

interface PocForm {
    username: string;
}

const validators: GValidators<PocForm> = {
    '*': new GValidator().withCustomValidation((input) => {
        input.errorText = 'username is required (custom rule)';
        return !input.value; // true - invalid when empty
    }),
};

const CustomValidationExample = () => {
    const [lastSubmit, setLastSubmit] = useState('— not submitted yet —');

    return (
        <section>
            <h2>Custom validation — submit-gating POC</h2>
            <p style={{ maxWidth: 580, color: '#444' }}>
                One input, a single <code>withCustomValidation</code> rule that rejects an empty value, and{' '}
                <strong>no native <code>required</code> attribute</strong>. Click <em>Submit</em>{' '}
                <strong>without touching the field</strong>. If <code>onSubmit</code> fires (the box below updates
                and the console logs an empty value), the untouched-submit hole exists for custom validators too —
                not just <code>withSchema</code>. Note <code>state.isInvalid</code> below: it stays{' '}
                <code>false</code> until the field is validated.
            </p>

            <GForm<PocForm>
                validators={validators}
                onSubmit={(state, e) => {
                    e.preventDefault();
                    const data = state.toRawData();
                    console.log('[custom-validation] onSubmit fired', data);
                    setLastSubmit(`onSubmit fired @ ${new Date().toLocaleTimeString()} → ${JSON.stringify(data)}`);
                }}
            >
                {(state) => (
                    <>
                        <GInput
                            formKey="username"
                            placeholder="username"
                            element={(input, props) => (
                                <label style={{ display: 'block', marginBottom: 12 }}>
                                    <input {...props} />
                                    {input.error && <small style={{ display: 'block', color: 'crimson' }}>{input.errorText}</small>}
                                </label>
                            )}
                        />
                        <button>Submit</button>
                        <p style={{ marginTop: 12 }}>
                            <code>state.isInvalid</code>: <strong>{String(state.isInvalid)}</strong>
                        </p>
                    </>
                )}
            </GForm>

            <pre style={{ background: '#f5f5f5', padding: 12, marginTop: 8 }}>{lastSubmit}</pre>
        </section>
    );
};

export default CustomValidationExample;
