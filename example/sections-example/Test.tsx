import React from 'react';
import {useFormSelector} from "../../src/hooks/useFormSelector";

const Test = () => {
    const billing = useFormSelector(state => state.fields.billing);
    console.log(billing);
    return <div>Test</div>;
};

export default Test;