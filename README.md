![gform-react](https://gform-react.onrender.com/gform-logo.png)

[![Minified size](https://img.shields.io/bundlephobia/min/gform-react?label=minified%20size&color=darkergreen)](https://bundlephobia.com/package/gform-react)
[![Gzip size](https://img.shields.io/bundlephobia/minzip/gform-react?label=gzip%20size&color=darkergreen)](https://bundlephobia.com/package/gform-react)
![npm downloads](https://img.shields.io/npm/dm/gform-react)
![React peer dependency](https://img.shields.io/npm/dependency-version/gform-react/peer/react)
![React DOM peer dependency](https://img.shields.io/npm/dependency-version/gform-react/peer/react-dom)
[![MIT License](https://img.shields.io/npm/l/gform-react)](https://unpkg.com/gform-react@latest/LICENSE.md)
---

### Build generic forms easily with validations for React applications.

`gform-react` is a lightweight, UI‑agnostic form engine that focuses on **form logic**, **validation**, and **performance**.  
Use any UI library you want (Material UI, Chakra, Tailwind, custom components, etc.) — it only cares about the form and the inputs inside.
---

## Features

- **Lightweight**
- **Tree‑Shakeable**
- **Native HTML5 Constraint Validations**
- **Custom Validations**
- **Custom Async Validations**
- **Support Yup, Zod etc.**
- **Dynamic forms — add/remove fields on the fly**
- **UI‑agnostic** — works with any UI library or your custom components
- **Minimal re-renders** — only updates fields that change
- **Accessibility‑friendly**  
  Automatically sets `aria-required` and `aria-invalid`
- **React Native support**
- **Simple API with powerful capabilities**

---

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

---


## Documentation

Full documentation, examples, and API reference:

https://gform-react.onrender.com

---

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

---

## License

MIT © Tal  
https://www.npmjs.com/package/gform-react
