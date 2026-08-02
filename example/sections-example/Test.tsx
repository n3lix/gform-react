import React from 'react';

import {useFormSectionSelector} from "../../src/hooks/useFormSectionSelector";

type Address = { street: string; city: string };

/**
 * subscribed to the `billing` section only — re-renders when a billing field changes and stays
 * untouched by edits to `shipping` / `couponCode` (watch it in React DevTools' highlight-updates).
 */
const Test = () => {
    const billing = useFormSectionSelector<Address>('billing');

    return (
        <p>
            <strong>Live billing preview:</strong>{' '}
            {billing.street?.value || '(no street)'}, {billing.city?.value || '(no city)'}
        </p>
    );
};

export default Test;
