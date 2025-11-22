import React, {useCallback, useRef, useState} from "react";
import Tabs from "../tabs/Tabs";
import {Tab} from "../tabs";
import {GForm} from "../../src/GForm";
import {SignUpForm, validators} from "../validators";
import {GInput} from "../../src/fields/GInput";

const BaseExample = () => {
    const [c, setC] = useState(0);

    const ref = useRef<HTMLFormElement>(null);

    const renderInput = useCallback((input: any, props: any) => {
        return <div>
            <input {...props} />
            {input.error && <small>{input.errorText}</small>}
        </div>
    }, []);

    return (
        <Tabs headersContainer={<div />}>
            <Tab index={0} header={<button>Email</button>}>
                <GForm<SignUpForm> ref={ref} onInit={(state) => {
                    console.log(state);
                }} validators={validators}
                                   onSubmit={(state, e) => {
                                       e.preventDefault();
                                       console.log(state);
                                   }}>
                    {(state) => <>
                        <GInput formKey={'email'}
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                required
                                minLength={1}
                                validatorKey={'email'}
                            // fetch={(state) => {
                            //     console.log('fetch');
                            //     console.log(state.dispatchChanges({value: 'test'}))
                            // }}
                            // fetchDeps={['email2']}
                                element={renderInput}
                        />

                        <GInput formKey={'email2'}
                                id="email2"
                                type="email"
                                required
                                minLength={2}
                                placeholder="repeat Enter your email"
                                element={renderInput}
                        />

                        {/*<GInput formKey={'phone'}*/}
                        {/*        id="phone"*/}
                        {/*        type="tel"*/}
                        {/*        required*/}
                        {/*        placeholder="Enter your phone number"*/}
                        {/*        autoComplete="phone"*/}
                        {/*        element={renderInput}*/}
                        {/*/>*/}
                        <button type="submit" disabled={state.isInvalid}>
                            Send Verification Code
                        </button>
                    </>}

                </GForm>
            </Tab>
            <Tab index={1} header={<button>Phone</button>}>
                <GForm>
                    <GInput formKey={'phone'}
                            id="phone"
                            type="tel"
                            placeholder="Enter your phone number"
                            autoComplete="phone"
                            required
                            element={(input, props) => <div>
                                <input {...props} />
                                {input.error && <small>{input.errorText}</small>}
                            </div>}
                    />

                    <button type="submit">
                        Send Verification Code
                    </button>
                </GForm>
            </Tab>
        </Tabs>
    );
};

export default BaseExample;