<div align="center">
    <a href="https://gform-react.onrender.com" title="GForm React – Fast and Simple React Forms with Validation">
        <img src="https://gform-react.onrender.com/gform-logo.png" alt="gform-react logo" />
    </a>
    <h1>gform-react</h1>
    <p>A lightweight React form library built for <b>performance</b>, <b>validation</b>, and clean <b>form logic</b></p>
</div>

## Features

- **Lightweight**
- **Tree‑shakeable**
- **Minimal re-renders** — only updates fields that change
- **Native HTML Constraint Validations**
- **Custom Validations**
- **Custom Async Validations**
- **Supports Yup, Zod, and more**
- **Dynamic forms** — add/remove fields on the fly
- **Accessibility‑friendly**  
  Automatically sets `aria-required` and `aria-invalid`
- **React Native support**

<div align="center">
  <a href="https://bundlephobia.com/package/gform-react">
    <img src="https://img.shields.io/bundlephobia/min/gform-react?label=minified%20size&color=darkergreen" alt="Minified size">
  </a>
  
  <a href="https://bundlephobia.com/package/gform-react">
    <img src="https://img.shields.io/bundlephobia/minzip/gform-react?label=gzip%20size&color=darkergreen" alt="Gzip size">
  </a>
  
  <img src="https://img.shields.io/npm/dm/gform-react" alt="npm downloads">
  
  <img src="https://img.shields.io/npm/dependency-version/gform-react/peer/react" alt="React peer dependency">
  
  <img src="https://img.shields.io/npm/dependency-version/gform-react/peer/react-dom" alt="React DOM peer dependency">
  
  <a href="https://unpkg.com/gform-react@latest/LICENSE.md">
    <img src="https://img.shields.io/npm/l/gform-react" alt="MIT License">
  </a>
</div>

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

## Documentation

Full documentation, examples, and API reference:

https://gform-react.onrender.com

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
