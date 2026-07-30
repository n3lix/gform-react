import React, {useState} from 'react';
import {GForm} from '../../src/GForm';
import {GInput} from '../../src/fields/GInput';
import {GValidator} from '../../src/validations';
import type {GValidators} from '../../src/validations';
import type {GInputState, GElementProps} from '../../src/fields';
import Test from "./Test";

type Address = { street: string; city: string };

type CheckoutForm = {
    couponCode: string;
    billing: Address;
    shipping: Address;
};

const renderInput = (input: GInputState, props: GElementProps<any>) => (
    <div>
        <input {...props} />
        {input.error && <small style={{color: 'crimson'}}>{input.errorText}</small>}
    </div>
);

const validators: GValidators<CheckoutForm> = {
    '*': new GValidator().withRequiredMessage('required'),
};

const SectionsExample = () => {
    const [lastSubmit, setLastSubmit] = useState<string>('');

    return (
        <GForm<CheckoutForm>
            validators={validators}
            onSubmit={(state, e) => {
                e.preventDefault();
                console.log(state.toRawData().billing.street);
                setLastSubmit(JSON.stringify(state.toRawData(), null, 2));
            }}
        >
            <Test />
            <fieldset>
                <legend>Billing address</legend>
                <GInput formKey="street" sectionKey="billing" required placeholder="Street" element={renderInput}/>
                <GInput formKey="city" sectionKey="billing" required placeholder="City" element={renderInput}/>
            </fieldset>

            <fieldset>
                <legend>Shipping address</legend>
                <GInput formKey="street" sectionKey="shipping" required placeholder="Street" element={renderInput}/>
                <GInput formKey="city" sectionKey="shipping" required placeholder="City" element={renderInput}/>
            </fieldset>

            <GInput formKey="couponCode" placeholder="Coupon code (optional)" element={renderInput}/>

            <button type="submit">Submit</button>

            <pre data-testid="last-submit">{lastSubmit}</pre>
        </GForm>
    );
};

export default SectionsExample;
