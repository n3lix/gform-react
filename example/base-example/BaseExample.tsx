import React, {useCallback, useRef} from "react";
import Tabs from "../tabs/Tabs";
import {Tab} from "../tabs";
import {GForm} from "../../src/GForm";
import {SignUpForm, validators} from "../validators";
import {GInput} from "../../src/fields/GInput";
import {useFormSelector} from "../../src/form-context";
import TestForm from "./TestForm";
import {GInputState, GElementProps} from '../../src/fields';

const Test = () => {
    const city = useFormSelector(state => state.fields.city);
    // console.log(city);
    return (<div>test!!!!!!!</div>);
};

const values = {
    firstName: '',
    lastName: 'Doe',
    email: 'test@test.com',
    phone: '1234567890',
    city: 'New York'
};

const BaseExample = () => {

    const ref = useRef<HTMLFormElement>(null);

    const renderInput = useCallback((input: GInputState, props: GElementProps<any>) => {
        console.log(input);
        return <div>
            <input {...props} />
            {input.error && <small>{input.errorText}</small>}
        </div>;
    }, []);

    return (
        <Tabs headersContainer={<div/>}>
            <Tab index={0} header={<button>Email</button>}>
                <GForm<SignUpForm> ref={ref} validators={validators}
                                   onSubmit={(state, e) => {
                                       e.preventDefault();
                                       console.log(state);
                                   }}>
                    <GInput formKey={'firstName'}
                            id="firstName"
                            value={values.firstName}
                            placeholder="Enter your firstName"
                            minLength={2}
                            required
                            element={renderInput}
                    />

                    <GInput formKey={'lastName'}
                            id="lastName"
                            value={values.lastName}
                            placeholder="Enter your lastName"
                            required
                            element={renderInput}
                    />

                    <GInput formKey={'email'}
                            value={values.email}
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            required
                            validatorKey={'email'}
                            element={renderInput}
                    />

                    <GInput formKey={'select'}
                            id="select"
                            required
                            element={(input, props) => {
                                return <div>
                                    <select {...props}>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                    </select>
                                    {input.error && <small>{input.errorText}</small>}
                                </div>;
                            }}
                    />

                    <button>test</button>

                </GForm>
            </Tab>
            <Tab index={1} header={<button>Phone</button>}>
                <GForm validators={validators} optimized onSubmit={(state, e) => {
                    e.preventDefault();
                    console.log(state);
                }}>
                    {/*<GInput formKey={'phone'}*/}
                    {/*        id="phone"*/}
                    {/*        type="tel"*/}
                    {/*        placeholder="Enter your phone number"*/}
                    {/*        autoComplete="phone"*/}
                    {/*        required*/}
                    {/*        element={(input, props) => <div>*/}
                    {/*            <input {...props} />*/}
                    {/*            {input.error && <small>{input.errorText}</small>}*/}
                    {/*        </div>}*/}
                    {/*/>*/}
                    <TestForm />

                    <button type="submit">
                        Send Verification Code
                    </button>
                </GForm>
            </Tab>
        </Tabs>
    );
};

export default BaseExample;