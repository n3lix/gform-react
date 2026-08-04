import React, { useRef, useState } from 'react';
import { GForm } from '../../src/GForm';
import { GInput } from '../../src/fields/GInput';
import { GValidator } from '../../src/validations';
import type { GValidators } from '../../src/validations';
import { useFormSelector } from '../../src/hooks';
import type { InitialState } from '../../src/state';
import { fieldRenderer } from './Field';

interface CheckoutForm {
    couponCode: string;
    billing: { email: string; zip: string };
    shipping: { email: string; zip: string };
}

const validators: GValidators<CheckoutForm> = {
    '*': new GValidator().withRequiredMessage('required field'),
};

// subscribed to the `billing` section only — the render counter should stay put while editing
// shipping or the coupon code, and only advance on a billing edit. Annotating the selector with
// InitialState<CheckoutForm> gives state.fields.billing full compile-time typing, no cast needed.
const BillingPreview = () => {
    const billing = useFormSelector((state: InitialState<CheckoutForm>) => state.fields.billing);
    const renders = useRef(0);
    renders.current += 1;

    return (
        <div style={{ border: '1px dashed #999', padding: 12, marginTop: 16, maxWidth: 420 }}>
            <strong>Billing preview</strong> <span style={{ color: '#666' }}>(subscribed to the <code>billing</code> section only)</span>
            <p style={{ margin: '8px 0' }}>Email: {billing?.email?.value || '—'}</p>
            <p style={{ margin: '8px 0' }}>Zip: {billing?.zip?.value || '—'}</p>
            <small style={{ color: '#666' }} data-testid="billing-renders">
                Renders: {renders.current} — try editing shipping or the coupon code; this number
                should not move.
            </small>
        </div>
    );
};

const SectionsExample = () => {
    const [lastSubmit, setLastSubmit] = useState('');

    return (
        <section>
            <h2>Sections (sectionKey)</h2>
            <p style={{ maxWidth: 560, color: '#444' }}>
                <code>sectionKey</code> groups fields into a named, repeatable subgroup —{' '}
                <code>state.billing.email</code> mirrors a flat field one level deeper. The same{' '}
                <code>formKey</code> (<code>email</code> / <code>zip</code>) is reused across both
                sections below without colliding.
            </p>

            <GForm<CheckoutForm>
                validators={validators}
                onInit={(state) => {return {
                    billing: {
                        email: {value: "test@walla.com"}
                    }
                };}}
                onReset={(state, e) => {console.log('[sections] reset', state, e);}}
                onSubmit={(state, e) => {
                    e.preventDefault();
                    console.log('[sections] submit', state);
                    setLastSubmit(JSON.stringify(state.toRawData(), null, 2));
                }}
            >
                {(state) => <>
                    <button type={'button'} onClick={() => {state.reset();}}>programmatic reset</button>
                    <fieldset style={{ marginBottom: 16 }}>
                        <legend>Billing address</legend>
                        <GInput formKey="email" sectionKey="billing" required type="email" placeholder="billing@example.com" element={fieldRenderer('Email')} />
                        <GInput formKey="zip" sectionKey="billing" required placeholder="12345" element={fieldRenderer('Zip')} />
                    </fieldset>

                    <fieldset style={{ marginBottom: 16 }}>
                        <legend>Shipping address</legend>
                        <GInput formKey="email" sectionKey="shipping" required type="email" placeholder="shipping@example.com" element={fieldRenderer('Email')} />
                        <GInput formKey="zip" sectionKey="shipping" required placeholder="12345" element={fieldRenderer('Zip')} />
                    </fieldset>

                    <GInput formKey="couponCode" placeholder="optional" element={fieldRenderer('Coupon code')} />

                    <BillingPreview />

                    <button type="submit" style={{ marginTop: 16 }}>Submit</button>
                </>}

            </GForm>

            {lastSubmit && (
                <pre style={{ marginTop: 16, background: '#f5f5f5', padding: 12, maxWidth: 420 }} data-testid="last-submit">
                    {lastSubmit}
                </pre>
            )}
        </section>
    );
};

export default SectionsExample;
