import React from 'react';
import Tabs, { Tab } from './tabs';
import BaseExample from './base-example';
import SchemaExample from './schema-example';
import CustomValidationExample from './custom-validation-example';

const App = () => (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <Tabs headersContainer={<div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #ddd', paddingBottom: 12 }} />}>
            <Tab index={0} active header={<button type="button">Custom validation (POC)</button>}>
                <CustomValidationExample />
            </Tab>
            <Tab index={1} header={<button type="button">Schema (Zod / Yup)</button>}>
                <SchemaExample />
            </Tab>
            <Tab index={2} header={<button type="button">Base</button>}>
                <BaseExample />
            </Tab>
        </Tabs>
    </div>
);

export default App;
