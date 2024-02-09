import { GValidator, GValidators } from "@generic-form/validations";

export interface SignUpForm {
    email: string;
    fullName: string;
    lastName: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
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
    .withMinLengthMessage((input) => `${input.formKey} must contain atleast ${input.minLength} chars`)
    .withTypeMismatchMessage('mismatch');

export const validators: GValidators<SignUpForm> = {
    '*': baseValidations,
    email: new GValidator<SignUpForm>(baseValidations)
        .withCustomValidation(input => {
            input.errorText='test2';
            return false;
        })
        .withCustomValidationAsync(async input => {
            input.errorText='test';
            return true;
        }),
    password: new GValidator<SignUpForm>(baseValidations)
        .withCustomValidation((input) => {
            input.errorText = `${input.formKey} must contain special char`;
            return /[^a-zA-Z0-9]+/;
        })
        .withCustomValidation((input, fields) => {
            fields.confirmPassword.checkValidity?.(); //update the validation state on both inputs
            input.errorText = `the password and confirm password doesnt match`;
            return fields.confirmPassword.value !== fields.password.value;
        }),
    // .withCustomValidationAsync(async input => {
    //     console.log('checking');
    //     const res = await test();
    //     console.log('done');

    //     input.errorText ='there was an error';
    //     return res.length === 0;
    // }),
    confirmPassword: new GValidator(baseValidations)
        .withCustomValidation((input, fields) => {
            fields.password.checkValidity?.();
            input.errorText = `the password and confirm password doesnt match`;
            return fields.confirmPassword.value !== fields.password.value;
        }),
    phoneNumber: new GValidator(baseValidations)
        .withCustomValidation((input) => {
            input.errorText = `enter valid phone number`;
            return /^(?:[+]972)*(?:0)*((?:52|50|53|54|57|58)+[0-9]{7})$/;
        })
};