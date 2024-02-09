import { GInput } from "@generic-form/fields";
import { GForm } from "@generic-form/GForm";
import { Button, Checkbox, FormControl, FormControlLabel, FormGroup, FormHelperText, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import React, { FC } from "react";
import { SignUpForm, validators } from "../validators";

const APIService = {
    fetchCities: () => new Promise((res, rej) => {
        setTimeout(() => {
            res([
                {name: 'New York'},
                {name: 'Rome'},
                {name: 'London'},
                {name: 'Istanbul'},
                {name: 'Paris'},
            ]);
        }, 1000);
    })
};


const MUIExample: FC = () => {
    return (
        <GForm<SignUpForm> className="app-box" onSubmit={(state) => console.log(state.toRawData({include: ['city'], transform: {city: Boolean}}))} validators={validators} onInit={() => ({})}>
            <h3>MUI</h3>

            <GInput type="email" formKey={'email'} minLength={7}
                element={(input, props) => <FormGroup>
                    <TextField inputProps={props} variant='filled' label='email' error={input.error} helperText={input.errorText || ' '} />
                </FormGroup>}
            />

            <GInput formKey={'name'} fetch={(input) => { console.log('fetching'); return {...input}; }} fetchDeps={['phoneNumber']}
                element={(input, props) => <FormGroup>
                    <TextField inputProps={props} variant='filled' label='first name' error={input.error} helperText={input.errorText || ' '} />
                </FormGroup>}
            />

            <GInput type="tel" formKey={'phoneNumber'}
                element={(input, props) => <FormGroup>
                    <TextField inputProps={props} variant='filled' label='phoneNumber' error={input.error} helperText={input.errorText || ' '} />
                </FormGroup>}
            />

            <GInput formKey={'password'} minLength={4}
                element={(input, props) => <FormGroup>
                    <TextField inputProps={props} variant='filled' label='password' error={input.error} helperText={input.errorText || ' '} />
                </FormGroup>}
            />

            <GInput formKey={'confirmPassword'} minLength={4}
                element={(input, props) => <FormGroup>
                    <TextField inputProps={props} variant='filled' label='confirm password' error={input.error} helperText={input.errorText || ' '} />
                </FormGroup>}
            />

            <GInput formKey='termsOfUse' type='checkbox'
                element={(input, props) => <FormGroup>
                    <FormControlLabel control={<Checkbox {...props} />} label="terms of use" />
                    <FormHelperText error={input.error}>{input.errorText || ' '}</FormHelperText>
                </FormGroup>}
            />

            <GInput formKey={'city'}
            
                fetch={async () => {
                    const cities = await APIService.fetchCities();
                    return {
                        cities
                    };
                }}
                element={(input, props) => <FormControl fullWidth >
                    <InputLabel id="demo-simple-select-label">Age</InputLabel>
                    <Select error={input.error}
                        // {...props}
                        inputProps={props}
                        value={input.value}
                        labelId="demo-simple-select-label"
                        label="City">
                        {input.cities?.map((c: any) => <MenuItem value={c.name.toLowerCase()} key={c.name}>{c.name}</MenuItem>)}
                    </Select>
                    <FormHelperText error={input.error}>{input.errorText || ' '}</FormHelperText>

                    <div>
                        {/* <button type='button' onClick={() => setOpen(prev => !prev)}>change</button> */}
                        <button type='button' onClick={() => input.dispatchChanges({test: !input.test })}>change</button>
                        {input.test && 'open'}
                    </div>


                </FormControl>}
            />

            <Button variant='contained' type='submit'>submit</Button>

        </GForm>
    );
};

export default MUIExample;