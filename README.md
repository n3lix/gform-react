<div align="center">
    <a href="https://gform-react.vercel.app" title="GForm React – A lightweight React form library built for performance, validation, and clean form logic">
        <img src="https://gform-react.vercel.app/gform-logo.png" alt="gform-react logo" />
    </a>
    <h1>gform-react</h1>
    <p><b>Performant, lightweight, Type-safe React forms</b> that work the same on the web, with native action and <b>Next.js Server Actions</b>, and in <b>React Native</b> - no adapters, no casts, zero dependencies.</p>
    <p>The whole point of gform-react is that it should feel closer to writing native forms than to configuring a
library.</p>
<br/>
<div align="center">
  <a href="https://unpkg.com/gform-react@latest/dist/cjs/gform-react.production.js">
    <img src="https://img.badgesize.io/https://unpkg.com/gform-react@3.4.1/dist/cjs/gform-react.production.js?compression=gzip&style=for-the-badge&label=gzip%20size" alt="Gzipped size">
  </a>

  <img src="https://img.shields.io/npm/dt/gform-react.svg?style=for-the-badge" alt="React DOM peer dependency">
  <img src="https://img.shields.io/npm/dm/gform-react?style=for-the-badge" alt="npm downloads">
</div>
<div align="center">
  <img src="https://img.shields.io/npm/dependency-version/gform-react/peer/react?style=for-the-badge" alt="React peer dependency">

  <img src="https://img.shields.io/npm/dependency-version/gform-react/peer/react-dom?style=for-the-badge" alt="React DOM peer dependency">

  <a href="https://unpkg.com/gform-react@latest/LICENSE.md">
    <img src="https://img.shields.io/npm/l/gform-react?style=for-the-badge" alt="MIT License">
  </a>
</div>
<br/>
<div><a href="https://gform-react.vercel.app">Home</a> | <a href="https://gform-react.vercel.app/docs">Docs</a> | <a href="https://gform-react.vercel.app/docs/guides">Guides</a> | <a href="https://gform-react.vercel.app/docs/examples">Examples</a></div>
</div>

## Features

- **Tiny & no dependencies** - 4.8 KB gzipped, tree‑shakable
- **Minimal re-renders** - updates only the fields that actually change
- **Native HTML constraint validation** - full support for `min`, `max`, `pattern`, `minLength`, `maxLength`,
  `required`, and more
- **Schema validation via [Standard Schema v1](https://standardschema.dev)** - any library implementing the spec works out of the box (Zod, Valibot, ArkType, Yup, …); drive the whole form from one schema via `GValidator.withSchema` / `withSchemaAsync`, including object-level cross-field rules - with zero runtime dependencies
- **Custom & async validation** - add any rule via `withCustomValidation`, including asynchronous server-side checks with `withCustomValidationAsync`
- **Cross-field validation** - re-validate a field when another changes (e.g. confirm-password) via `validatorDeps`
- **Deeply Nested Forms** - structure forms however you like, split a big form into focused and reusable components
- **Sections** - group inputs under a `sectionKey` so `formKey` only needs to be unique within its
  group (e.g. reusable billing/shipping address blocks); the form state, `toRawData()`, and
  `dispatchChanges()` nest sectioned fields under `state[sectionKey][formKey]`
- **Dynamic fields** - add or remove fields at runtime without losing state
- **Native `<form>` actions** - fully supports browser‑level form submission, including action, method, and HTTP
  navigation, with no JavaScript required
- **Next.js Server Actions support** - works seamlessly with Server Actions through standard `<form>` submissions, with
  no special adapters or client‑side wiring
- **Custom data on any input** - attach arbitrary data to a field via `dispatchChanges` (option lists,
  loading flags, fetched metadata); it's kept in form state for your UI, separate from the submitted value
- **Accessibility‑friendly** - automatically manages `aria-required` and `aria-invalid`
- **File inputs** - `type="file"` stores the real `File` object (or `File[]` with `multiple`), not the `C:\fakepath\...`
  string
- **React Native support** - the same API on web and mobile (via `gform-react/native`); no adapters, no separate mental model

## Documentation

Full documentation, examples, and API reference:

https://gform-react.vercel.app

## QuickStart

```tsx
import {type FC} from "react";
import {GForm, GInput, GValidator, type GValidators} from "gform-react";

interface SignInForm {
    username: string;
    password: string;
}

const baseValidator = new GValidator().withRequiredMessage('this field is required');

const validators: GValidators<SignInForm> = {
    '*': baseValidator, // a default validator for all other fields in the form

    password: new GValidator(baseValidator)
        .withMinLengthMessage((input) => `${input.formKey} must contain atleast ${input.minLength} chars`),
};

const App: FC = () => {
    return (
        <GForm<SignInForm> className='some-class'
                           validators={validators}
                           onSubmit={(formState, e) => { //can be used with native `action` or with Next.js `server actions`
                               e.preventDefault();
                               const data = formState.toRawData(); // key-value pairs of the form input values
                               console.log(data);
                           }}>
            <GInput formKey='username'
                    required
                    placeholder='username'
                    element={(input, props) => <div>
                        <input {...props}/>
                        {input.error && <small className="p-error">{input.errorText}</small>}
                    </div>}
            />
            <GInput formKey='password'
                    type='password'
                    required
                    minLength={5}
                    placeholder='password'
                    element={(input, props) => <div>
                        <input {...props}/>
                        {input.error && <small className="p-error">{input.errorText}</small>}
                    </div>}
            />
            <button>Submit</button>
        </GForm>
    );
};
```
## Schema validation (Zod / Yup / Standard Schema)

Drive the whole form from a single schema by wiring it to the `'*'` validator. gform parses the
**whole object** on each validation pass, so object-level rules — `.refine()` / `.superRefine()`,
conditional-required, confirm-password — fire and route to the field named by the issue's `path`
(not just each field's isolated leaf rule). Any library implementing
[Standard Schema](https://standardschema.dev) works, with **zero runtime dependencies** (gform reads
the `['~standard']` contract and never imports a schema library):

| Library | Method | Notes |
|---|---|---|
| Zod (≥ 3.24) | `withSchema` | synchronous |
| Valibot | `withSchema` | synchronous |
| ArkType | `withSchema` | synchronous |
| Yup (≥ 1.7) | `withSchemaAsync` | Yup's `validate` is asynchronous |

> Use `withSchemaAsync` for any schema whose validation is asynchronous (Yup, or async refinements).
> A synchronous `withSchema` handed an async schema warns in development and can't block submission.

```tsx
import {z} from "zod";
import {GForm, GInput, GValidator, type GValidators} from "gform-react";

interface SignUpForm {
    email: string;
    password: string;
    confirm: string;
}

// One schema — shareable with your backend. Cross-field rules set `path` to the target formKey.
const schema = z.object({
    email: z.string().email("enter a valid email"),
    password: z.string().min(8, "at least 8 characters"),
    confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
    message: "passwords must match",
    path: ["confirm"], // route the cross-field error onto the confirm field
});

const validators: GValidators<SignUpForm> = {
    '*': new GValidator().withSchema(schema), // routes every field by its formKey
};

const renderField = (input, props) => (
    <div><input {...props}/>{input.error && <small className="p-error">{input.errorText}</small>}</div>
);

const SignUp = () => (
    <GForm<SignUpForm> validators={validators}
                       onSubmit={(state, e) => { e.preventDefault(); console.log(state.toRawData()); }}>
        {(state) => (
            <>
                <GInput formKey="email" type="email" element={renderField}/>
                <GInput formKey="password" type="password" element={renderField}/>
                {/* validatorDeps re-checks confirm when password changes, so the mismatch clears as you fix it */}
                <GInput formKey="confirm" type="password" validatorDeps={['password']} element={renderField}/>
                <button disabled={state.isInvalid}>Sign up</button>
            </>
        )}
    </GForm>
);
```

**Cross-field rules:** set the rule's `path` to the target field's `formKey` (e.g. `path: ['confirm']`)
so the error surfaces on that field. To also clear/refresh the *other* field of the pair as the user
edits it, give the dependent field `validatorDeps={['password']}`.

For **Yup** (its Standard Schema validation is asynchronous), use `withSchemaAsync`:

```tsx
import * as yup from "yup";

const schema = yup.object({
    email: yup.string().email("enter a valid email").required("required"),
    password: yup.string().min(8, "at least 8 characters").required("required"),
    confirm: yup.string().oneOf([yup.ref("password")], "passwords must match").required("required"),
});

const validators: GValidators<SignUpForm> = {
    '*': new GValidator().withSchemaAsync(schema),
};
```

## Sections

Group inputs under a `sectionKey` when the same `formKey` needs to repeat across a form — billing
vs. shipping addresses, a list of contacts, and so on. `formKey` only needs to be unique *within*
its section. Type a section as a **plain nested object** in the form's interface — that's all it
takes to get it (and `toRawData()`) nested and type-safe:

```tsx
import {GForm, GInput, GValidator, type GValidators} from "gform-react";

interface CheckoutForm {
    couponCode: string;
    billing: { email: string; zip: string };
    shipping: { email: string; zip: string };
}

const validators: GValidators<CheckoutForm> = {
    '*': new GValidator().withRequiredMessage('required field'),
};

const renderField = (input, props) => (
    <div><input {...props}/>{input.error && <small className="p-error">{input.errorText}</small>}</div>
);

const Checkout = () => (
    <GForm<CheckoutForm> validators={validators}
                         onSubmit={(state, e) => { e.preventDefault(); console.log(state.toRawData()); }}>
        {(state) => (
            <>
                <fieldset>
                    <legend>Billing</legend>
                    <GInput formKey="email" sectionKey="billing" element={renderField}/>
                    <GInput formKey="zip" sectionKey="billing" element={renderField}/>
                </fieldset>
                <fieldset>
                    <legend>Shipping</legend>
                    <GInput formKey="email" sectionKey="shipping" element={renderField}/>
                    <GInput formKey="zip" sectionKey="shipping" element={renderField}/>
                </fieldset>
                <button disabled={state.isInvalid}>Submit</button>
            </>
        )}
    </GForm>
);
// state.toRawData() => { couponCode, billing: { email, zip }, shipping: { email, zip } }
// state.billing.email.value / state.shipping.email.value — read independently
```

A sectioned input's DOM `name` is `"sectionKey.formKey"` (e.g. `"billing.email"`), so
`toFormData()` / a Server Action reads it the same way: `formData.get('billing.email')`.

A plain-object key in the interface always means *section*. In the rare case a single field's
**value** is an object (set programmatically via `dispatchChanges`), wrap its shape in
`GFieldValue<...>` so it types as one field instead — `File`, `File[]`, `Date`, and arrays are
recognized as field values automatically:

```ts
import type {GFieldValue} from "gform-react";

interface MapForm {
    label: string;                                        // field
    pin: GFieldValue<{ lat: number; lng: number }>;       // one field with an object value
    address: { street: string; city: string };            // section
}
```

### Subscribing to a section — `useFormSectionSelector`

Any component inside the form can subscribe to a whole section. The returned object is
referentially stable — the component re-renders when one of the section's fields changes and stays
untouched by edits anywhere else in the form:

```tsx
import {useFormSectionSelector} from "gform-react";

const BillingPreview = () => {
    const billing = useFormSectionSelector<{ email: string; zip: string }>('billing');
    return <span>{billing.email?.value} / {billing.zip?.value}</span>;
};
```

For a *single* field (sectioned or not) keep using `useFormSelector`; a sectioned field lives
under its qualified key there: `useFormSelector(state => state.fields['billing.email'])`.

## Installation

npm:

```sh
npm install gform-react
```

yarn:

```sh
yarn add gform-react
```

## Peer dependencies

react >=18.0.0, react-dom >=18.0.0 are peer dependencies (the library is built on
`useSyncExternalStore`, which was introduced in React 18)

## License

MIT © Tal  
https://www.npmjs.com/package/gform-react
