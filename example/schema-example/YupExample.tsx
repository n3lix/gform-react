import React from 'react';
import { GForm } from '../../src/GForm';
import { GInput } from '../../src/fields/GInput';
import { yupValidators, type YupSignUpForm } from './schemas';
import { fieldRenderer } from './Field';

const YupExample = () => (
    <GForm<YupSignUpForm>
        validators={yupValidators}
        onSubmit={(state, e) => {
            e.preventDefault();
            console.log('[yup] submit', state.toRawData());
        }}
    >
        {(state) => (
            <>
                <GInput formKey="email" type="email" debounce={250} placeholder="you@example.com" element={fieldRenderer('Email')} />
                <GInput formKey="password" type="password" debounce={250} placeholder="min 8 chars" element={fieldRenderer('Password')} />
                <GInput
                    formKey="confirm"
                    type="password"
                    debounce={250}
                    placeholder="repeat password"
                    validatorDeps={['password']}
                    element={fieldRenderer('Confirm password')}
                />
                <button disabled={state.isInvalid}>Sign up yup (async)</button>
            </>
        )}
    </GForm>
);

export default YupExample;
