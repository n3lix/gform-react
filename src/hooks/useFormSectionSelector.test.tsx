import React, {useState} from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';

import {GForm} from '../GForm';
import {GInput} from '../fields/GInput';
import {useFormSectionSelector} from './useFormSectionSelector';

type Address = { street: string; city: string };

describe('useFormSectionSelector', () => {
    it('throws when used outside a GForm', () => {
        const Orphan = () => {
            useFormSectionSelector('billing');
            return null;
        };
        // silence React's error boundary noise for the expected throw
        const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(() => render(<Orphan/>)).toThrow('useFormStore must be used within `GForm` component');
        spy.mockRestore();
    });

    it('returns the section fields keyed by bare formKey and tracks member edits', () => {
        const Billing = () => {
            const billing = useFormSectionSelector<Address>('billing');
            return <span data-testid="billing-view">{billing.street?.value}|{billing.city?.value}</span>;
        };
        render(
            <GForm>
                <Billing/>
                <GInput formKey="street" sectionKey="billing" data-testid="billing-street"/>
                <GInput formKey="city" sectionKey="billing" data-testid="billing-city"/>
                <GInput formKey="street" sectionKey="shipping" data-testid="shipping-street"/>
            </GForm>
        );

        expect(screen.getByTestId('billing-view')).toHaveTextContent('|');

        fireEvent.change(screen.getByTestId('billing-street'), {target: {value: 'Main St 1'}});
        fireEvent.change(screen.getByTestId('billing-city'), {target: {value: 'Springfield'}});
        expect(screen.getByTestId('billing-view')).toHaveTextContent('Main St 1|Springfield');
    });

    it('does not re-render the subscriber when an unrelated section or flat field changes', () => {
        let renders = 0;
        const Billing = () => {
            renders++;
            const billing = useFormSectionSelector<Address>('billing');
            return <span data-testid="billing-street">{billing.street?.value}</span>;
        };
        render(
            <GForm>
                <Billing/>
                <GInput formKey="street" sectionKey="billing" data-testid="billing-street-input"/>
                <GInput formKey="street" sectionKey="shipping" data-testid="shipping-street-input"/>
                <GInput formKey="couponCode" data-testid="coupon-input"/>
            </GForm>
        );

        const settled = renders;
        fireEvent.change(screen.getByTestId('shipping-street-input'), {target: {value: 'Elm St 2'}});
        fireEvent.change(screen.getByTestId('coupon-input'), {target: {value: 'SAVE10'}});
        expect(renders).toBe(settled); // snapshot reference unchanged → Object.is bail-out

        fireEvent.change(screen.getByTestId('billing-street-input'), {target: {value: 'Main St 1'}});
        expect(renders).toBe(settled + 1); // a member change re-renders exactly once
        expect(screen.getByTestId('billing-street')).toHaveTextContent('Main St 1');
    });

    it('picks up a dynamically added section field without any other dispatch, and drops a removed one', () => {
        const Billing = () => {
            const billing = useFormSectionSelector<Address & { phone?: string }>('billing');
            return <span data-testid="billing-keys">{Object.keys(billing).sort().join(',')}</span>;
        };
        const Form = () => {
            const [showPhone, setShowPhone] = useState(false);
            return (
                <GForm>
                    <Billing/>
                    <GInput formKey="street" sectionKey="billing" data-testid="billing-street"/>
                    {showPhone && <GInput formKey="phone" sectionKey="billing" data-testid="billing-phone"/>}
                    <button type="button" onClick={() => setShowPhone(s => !s)}>toggle</button>
                </GForm>
            );
        };
        render(<Form/>);

        expect(screen.getByTestId('billing-keys')).toHaveTextContent('street');

        // mount: registration is silent, the field's mount effect must notify the subscriber
        fireEvent.click(screen.getByRole('button', {name: 'toggle'}));
        expect(screen.getByTestId('billing-keys')).toHaveTextContent('phone,street');

        // unmount: unregisterField notifies
        fireEvent.click(screen.getByRole('button', {name: 'toggle'}));
        expect(screen.getByTestId('billing-keys')).toHaveTextContent(/^street$/);
    });

    it('shares one snapshot reference between subscribers of the same section', () => {
        let first: object | undefined;
        let second: object | undefined;
        const First = () => {
            first = useFormSectionSelector<Address>('billing');
            return null;
        };
        const Second = () => {
            second = useFormSectionSelector<Address>('billing');
            return null;
        };
        render(
            <GForm>
                <First/>
                <Second/>
                <GInput formKey="street" sectionKey="billing" data-testid="billing-street"/>
            </GForm>
        );

        expect(first).toBe(second); // store-level cache: same object, one scan per update

        fireEvent.change(screen.getByTestId('billing-street'), {target: {value: 'Main St 1'}});
        expect(first).toBe(second); // still shared after an update
    });

    it('returns a stable empty object for an unknown section', () => {
        let renders = 0;
        let lastSnapshot: object | undefined;
        const Unknown = () => {
            renders++;
            lastSnapshot = useFormSectionSelector('nope');
            return null;
        };
        render(
            <GForm>
                <Unknown/>
                <GInput formKey="street" sectionKey="billing" data-testid="billing-street"/>
            </GForm>
        );

        expect(Object.keys(lastSnapshot!)).toHaveLength(0);
        const settled = renders;
        const snapshotBefore = lastSnapshot;

        fireEvent.change(screen.getByTestId('billing-street'), {target: {value: 'Main St 1'}});
        expect(renders).toBe(settled); // still empty → same reference → no re-render
        expect(lastSnapshot).toBe(snapshotBefore);
    });
});
