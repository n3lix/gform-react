import React from 'react';
import Tabs, { Tab } from '../tabs';
import ZodExample from './ZodExample';
import YupExample from './YupExample';

const SchemaExample = () => (
    <section>
        <h2>Schema validation</h2>
        <p style={{ maxWidth: 560, color: '#444' }}>
            One whole-object schema validates the whole form through a single{' '}
            <code>{"'*': new GValidator().withSchema(schema)"}</code>. Object-level rules (the
            confirm-password match) fire and route to the field on the issue&apos;s <code>path</code>; the
            confirm field uses <code>{"validatorDeps={['password']}"}</code> so editing the password
            re-checks it.
        </p>
        <Tabs headersContainer={<div style={{ display: 'flex', gap: 8, marginBottom: 16 }} />}>
            <Tab index={0} header={<button type="button">Zod (sync · withSchema)</button>}>
                <ZodExample />
            </Tab>
            <Tab index={1} header={<button type="button">Yup (async · withSchemaAsync)</button>}>
                <YupExample />
            </Tab>
        </Tabs>
    </section>
);

export default SchemaExample;
