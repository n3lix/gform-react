import React, { FC } from "react";
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Knob } from 'primereact/knob';

import { GInput, RNGInput } from "@generic-form/fields";
import { GForm } from "@generic-form/GForm2";
import { SCSS_FormGroup } from "../styled";
import { SignUpForm, validators } from "../validators";

const PrimeReactExample: FC = () => {
    return (
        <GForm<SignUpForm> className="app-box" onSubmit={(state) => { console.log(state); }} validators={validators}>
            <h3>Prime React</h3>

            <RNGInput formKey="sdf" element={(input, props) => <>{}</>}/>

            <GInput formKey={'email'} required minLength={7} type="email"
                element={(input, props) => <SCSS_FormGroup>
                    <label htmlFor="email">Email</label>
                    <InputText {...props} id="email" aria-describedby="email-help" className={input.error ? "p-invalid" : ''} />
                    {input.error && <small id="email-help" className="p-error">{input.errorText}</small>}
                </SCSS_FormGroup>}
            />

            <GInput formKey={'firstName'}
                element={(input, props) => <SCSS_FormGroup>
                    <label htmlFor="firstName">First Name</label>
                    <InputText {...props} id="firstName" aria-describedby="firstName-help" className={input.error ? "p-invalid" : ''} />
                    {input.error && <small id="firstName-help" className="p-error">{input.errorText}</small>}
                </SCSS_FormGroup>}
            />

            <GInput formKey={'lastName'} type="text"
                element={(input, props) => <SCSS_FormGroup>
                    <label htmlFor="lastName">Last Name</label>
                    <InputText {...props} id="lastName" aria-describedby="lastName-help" className={input.error ? "p-invalid" : ''} />
                    {input.error && <small id="lastName-help" className="p-error">{input.errorText}</small>}
                </SCSS_FormGroup>}
            />

            <GInput formKey={'phoneNumber'} required
                element={(input, props) => <SCSS_FormGroup>
                    <label htmlFor="phoneNumber">Phone Number</label>
                    <InputText {...props} id="phoneNumber" aria-describedby="phoneNumber-help" className={input.error ? "p-invalid" : ''} />
                    {input.error && <small id="phoneNumber-help" className="p-error">{input.errorText}</small>}
                </SCSS_FormGroup>}
            />

            <GInput formKey={'password'} required
                element={(input, props) => <SCSS_FormGroup>
                    <label htmlFor="password">Password</label>
                    <InputText {...props} id="password" aria-describedby="password-help" className={input.error ? "p-invalid" : ''} />
                    {input.error && <small id="password-help" className="p-error">{input.errorText}</small>}
                </SCSS_FormGroup>}
            />

            <GInput formKey={'confirmPassword'} required
                element={(input, props) => <SCSS_FormGroup>
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <InputText {...props} id="confirmPassword" aria-describedby="confirmPassword-help" className={input.error ? "p-invalid" : ''} />
                    {input.error && <small id="confirmPassword-help" className="p-error">{input.errorText}</small>}
                </SCSS_FormGroup>}
            />

            <GInput formKey='city' required
                element={(input, props) => <div>
                    <Dropdown {...props} value={input.value} optionLabel="name" options={[
                        { name: 'New York', code: 'NY' },
                        { name: 'Rome', code: 'RM' },
                        { name: 'London', code: 'LDN' },
                        { name: 'Istanbul', code: 'IST' },
                        { name: 'Paris', code: 'PRS' }
                    ]}
                    placeholder="Select a City" className="w-full md:w-14rem" />
                    <small id="confirmPassword-help" className="p-error">{input.errorText}</small>
                </div>} />

            <GInput type='number' formKey='slider' required element={(input, props) => <Knob {...props} value={input.value}/>}/>

            <Button label="Submit" aria-label="Submit" type='submit' />
        </GForm>
    );
};

export default PrimeReactExample;