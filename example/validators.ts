import { GValidator, type GValidators } from "../src/validations";

export interface SignUpForm {
    email: string;
    fullName: string;
    lastName: string;
    phoneNumber: string;
    password: string;
    confirm: string;
    termsOfUse: boolean;
    city: string;
}

export interface TestForm {
    email: string;
    password: string;
    password2: boolean;
}

const test = (): Promise<[]> => new Promise((res) => {
    setTimeout(() => res([]), 500);
});

export const baseValidations = new GValidator()
    .withRequiredMessage('this field is required')

export const validators: GValidators<SignUpForm> = {
    '*': baseValidations,
    email: new GValidator(baseValidations)
        .withPatternMismatchMessage((input) => `${input.formKey} pattern`),
    firstName: new GValidator(baseValidations)
        .withMinLengthMessage((input) => `${input.formKey} must contain atleast ${input.minLength} chars`),
    password: new GValidator<SignUpForm>(baseValidations)
        .withCustomValidation((input) => {
            input.errorText = `${input.formKey} must contain special char`;
            return /[^a-zA-Z0-9]+/;
        }),
    // .withCustomValidationAsync(async input => {
    //     console.log('checking');
    //     const res = await test();
    //     console.log('done');

    //     input.errorText ='there was an error';
    //     return res.length === 0;
    // }),
    confirm: new GValidator(baseValidations)
        .withCustomValidation((input, fields) => {
            input.errorText = `the password and confirm password doesnt match`;
            return input.value !== fields.password.value;
        }),
    phoneNumber: new GValidator(baseValidations)
        .withCustomValidation((input) => {
            input.errorText = `enter valid phone number`;
            return /^(?:[+]972)*(?:0)*((?:52|50|53|54|57|58)+[0-9]{7})$/;
        })
};