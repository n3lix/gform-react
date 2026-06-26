import { z } from 'zod';
import * as yup from 'yup';
import { GValidator, type GValidators } from '../../src/validations';

export interface ZodSignUpForm {
    email: string;
    password: string;
    confirm: string;
}

export const zodSchema = z
    .object({
        email: z.string().email('enter a valid email'),
        password: z.string().min(8, 'at least 8 characters'),
        confirm: z.string(),
    })
    .refine((data) => data.password === data.confirm, {
        message: 'passwords must match',
        path: ['confirm'], // route the cross-field error onto the confirm field
    });

export const zodValidators: GValidators<ZodSignUpForm> = {
    '*': new GValidator().withSchema(zodSchema),
};

export interface YupSignUpForm {
    email: string;
    password: string;
    confirm: string;
}

export const yupSchema = yup.object({
    email: yup.string().email('enter a valid email').required('this field is required'),
    password: yup.string().min(8, 'at least 8 characters').required('this field is required'),
    confirm: yup
        .string()
        .oneOf([yup.ref('password')], 'passwords must match')
        .required('this field is required'),
});

export const yupValidators: GValidators<YupSignUpForm> = {
    '*': new GValidator().withSchemaAsync(yupSchema),
};
