<div align="center">
    <a href="https://gform-react.onrender.com" title="GForm React – A lightweight React form library built for performance, validation, and clean form logic">
        <img src="https://gform-react.onrender.com/gform-logo.png" alt="gform-react logo" />
    </a>
    <h1>gform-react</h1>
    <p>A lightweight React form library built for <b>performance</b>, <b>validation</b>, and clean <b>form logic</b></p>
</div>

## Features

- **Lightweight**
- **Tree‑shakable** — import only what you use to keep bundles small
- **Minimal re-renders** — updates only the fields that actually change
- **Native HTML constraint validation** — full support for `min`, `max`, `pattern`, `minLength`, `maxLength`, `required`, and more
- **Custom Validations** – add custom validation with any rules
- **Async Validations** — run asynchronous rules for server-side checks
- **Supports Yup, Zod, and more** – use any validation library you like
- **Deeply Nested Forms** — structure forms however you like, across any number of components
- **Dynamic fields** — add or remove fields at runtime without losing state
- **Native `<form>` actions** — fully supports browser‑level form submission, including action, method, and HTTP navigation, with no JavaScript required
- **Next.js Server Actions support** — works seamlessly with Server Actions through standard `<form>` submissions, with no special adapters or client‑side wiring
- **Accessibility‑friendly** — automatically manages `aria-required` and `aria-invalid`
- **React Native support** — works seamlessly across web and mobile
 
<br/>
<div align="center">
  <a href="https://unpkg.com/gform-react@latest/dist/cjs/gform-react.production.js">
    <img src="http://img.badgesize.io/https://unpkg.com/gform-react@latest/dist/cjs/gform-react.production.js?compression=gzip&style=for-the-badge" alt="Minified size">
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

## Documentation

Full documentation, examples, and API reference:

https://gform-react.onrender.com

## QuickStart
```tsx
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
                                    console.log(formState);
                               }}>
                <GInput formKey='username'
                        required
                        element={(input, props) => <div>
                            <input {...props} placeholder='username'/>
                            {input.error && <small className="p-error">{input.errorText}</small>}
                        </div>}
                />
                <GInput formKey='password' 
                        type='password'
                        required
                        minLength={5}
                        element={(input, props) => <div>
                            <input {...props} placeholder='password'/>
                            {input.error && <small className="p-error">{input.errorText}</small>}
                        </div>}
                />
                <button>Submit</button>
            </GForm>
    );
};
```

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
react >=16.8.0, react-dom >=16.8.0 are peer dependencies

## License

MIT © Tal  
https://www.npmjs.com/package/gform-react
