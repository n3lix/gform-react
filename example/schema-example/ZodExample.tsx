import React from 'react';
import { GForm } from '../../src/GForm';
import { GInput } from '../../src/fields/GInput';
import { zodValidators, type ZodSignUpForm } from './schemas';
import { fieldRenderer } from './Field';

const ZodExample = () => (
    <GForm<ZodSignUpForm>
        validators={zodValidators}
        onSubmit={(state, e) => {
            e.preventDefault();
            console.log('[zod] submit', state.toRawData());
        }}
    >
        {(state) => (
            <>
                <GInput formKey="email" type="email" placeholder="you@example.com" element={fieldRenderer('Email')} />
                <GInput formKey="password" type="password" placeholder="min 8 chars" element={fieldRenderer('Password')} />
                <GInput
                    formKey="confirm"
                    type="password"
                    placeholder="repeat password"
                    validatorDeps={['password']}
                    element={fieldRenderer('Confirm password')}
                />
                <button disabled={state.isInvalid}>Sign up zod (sync)</button>
            </>
        )}
    </GForm>
);

export default ZodExample;
