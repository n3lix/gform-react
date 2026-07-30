import type { ChangeEvent, FormEvent, InvalidEvent, FocusEvent, EventHandler, FocusEventHandler, ChangeEventHandler, FormEventHandler, SyntheticEvent } from "react";
import type { GInputProps, GInputState, GInputStateMutable } from "./fields";

export type PartialPick<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;

declare const GSectionTag: unique symbol;

/**
 * marks a nested group of fields as a "section" in a `GForm<T>` interface, so the group can be
 * targeted by `GInput`'s `sectionKey` prop and appears nested (`state[sectionKey][formKey]`) in
 * the form's exposed state, `toRawData()`, and `dispatchChanges()` payloads.
 *
 * @example
 * interface CheckoutForm {
 *     couponCode: string;
 *     billing: GSection<{ email: string; zip: string }>;
 *     shipping: GSection<{ email: string; zip: string }>;
 * }
 */
export type GSection<F extends Record<string, any>> = F & { readonly [GSectionTag]: true };

/** true for the unconstrained `any` (as opposed to a real, even if partially-unknown, shape). */
type _IsAny<T> = 0 extends (1 & T) ? true : false;

export type IForm<T=any> = _IsAny<T> extends true
    ? { [key: string]: GInputState<any> }
    : {
        [key in keyof T]: T[key] extends GSection<infer F>
            ? { [fieldKey in keyof F]: GInputState<F[fieldKey]> }
            : GInputState<T[key]>;
    };

/**
 * the internal, flat field-state dictionary — always keyed by field identity (`formKey`, or
 * `"sectionKey.formKey"` for a sectioned field), regardless of `T`'s (possibly nested, per
 * `IForm<T>`) public shape. This is what the store actually holds, and what's passed to custom
 * validator handlers and `fetch`; `IForm<T>` is the *public*, section-nested view built from it.
 *
 * `T` isn't referenced in the body (the flat shape never varies) but is kept so it propagates
 * through `InitialState<T>`/`GCustomValidatorHandler<T>`, letting `T` be inferred at call sites
 * that only have a `FlatFields<T>`-typed value to infer it from (e.g. `_buildFormState<T>`).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type FlatFields<T = any> = { [key: string]: GInputState<any> };

export type FormNode = {
    type: "input" | "group";
    formKey?: string;
    props?: GInputProps & GInputStateMutable;
    children?: FormNode[];
};

export type FormTreeResult = {
    tree: FormNode[];
    flat: (GInputProps & GInputStateMutable)[];
    signature: string;
};

export type PartialForm<T> = _IsAny<T> extends true
    ? { [key: string]: Partial<GInputStateMutable<any>> }
    : Partial<{
        [key in keyof T]: T[key] extends GSection<infer F>
            ? Partial<{ [fieldKey in keyof F]: Partial<GInputStateMutable<F[fieldKey]>> }>
            : Partial<GInputStateMutable<T[key]>>;
    }>;

export type GDOMElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type GFormEvent<T = GDOMElement> = FormEvent<T>;
export type GChangeEvent<T = GDOMElement> = ChangeEvent<T> & {value?: unknown};
export type GFocusEvent<T = GDOMElement> = FocusEvent<T>;
export type GInvalidEvent <T = GDOMElement> = InvalidEvent<T>;

export type GFormEventHandler<T = GDOMElement> = FormEventHandler<GFormEvent<T>>;
export type GChangeEventHandler<T = GDOMElement> = ChangeEventHandler<GChangeEvent<T>>;
export type GFocusEventHandler<T = GDOMElement> = FocusEventHandler<GFocusEvent<T>>;
export type GInvalidEventHandler<T = GDOMElement> = EventHandler<SyntheticEvent<T>>;