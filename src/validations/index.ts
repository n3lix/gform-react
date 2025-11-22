import type { IForm } from "../form";
import type { GInputState } from "../fields";
import { GValidator } from "./GValidator";

export type GConstraintValidator = (input: GInputState<any>) => string;

export type GConstraintValidatorHandler = (input: GInputState<any>, validityKey: keyof ValidityState | undefined) => boolean;
export type GCustomValidatorHandler<T> = (input: GInputState<any>, fields: IForm<T>) => RegExp | boolean;
export type GCustomValidatorHandlerAsync<T> = (input: GInputState<any>, fields: IForm<T>) => Promise<ReturnType<GCustomValidatorHandler<T>>>;

export type GInputValidator<T> = GValidator<T> | { handlers: GCustomValidatorHandler<T>[]; constraintHandlers: GConstraintValidatorHandler[]; asyncHandlers: GCustomValidatorHandlerAsync<T>[]; hasConstraint(constraint: keyof ValidityState): boolean  };

export type GValidators<T=any> = {
    [key in keyof T]?: GInputValidator<T>;
} & {
    [key: string]: GInputValidator<T> | undefined; 
};

export {GValidator} from './GValidator';