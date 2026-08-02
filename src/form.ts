import type { ChangeEvent, FormEvent, InvalidEvent, FocusEvent, EventHandler, FocusEventHandler, ChangeEventHandler, FormEventHandler, SyntheticEvent } from "react";
import type { GInputProps, GInputState, GInputStateMutable } from "./fields";

export type PartialPick<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;

declare const GFieldValueTag: unique symbol;

/**
 * opts an object-**valued** field out of section detection in a `GForm<T>` interface.
 *
 * a plain-object key in the form interface is treated as a *section* (a nested group of fields —
 * see `sectionKey`). when a key holds a single field whose **value** is an object (e.g. set via
 * `dispatchChanges`), wrap the value's shape in `GFieldValue<...>` so it types as one field
 * instead. `File`, `File[]`, `Blob`, `Date`, arrays, and functions are always treated as field
 * values — no wrapper needed.
 *
 * @example
 * interface CheckoutForm {
 *     couponCode: string;
 *     billing: { street: string; city: string };          // plain object = section
 *     location: GFieldValue<{ lat: number; lng: number }>; // one field with an object value
 * }
 */
export type GFieldValue<F extends object> = F & { readonly [GFieldValueTag]: true };

/** true for the unconstrained `any` (as opposed to a real, even if partially-unknown, shape). */
type _IsAny<T> = 0 extends (1 & T) ? true : false;

/**
 * structural section detection — the single source of truth for "is this form-interface key a
 * section or a field", used consistently by `IForm`, `PartialForm`, `RawData`, the serialization
 * `transform` typing, and `FlatFields`.
 *
 * a key is a section iff its (non-nullable, so `billing?: Address` works) value is a plain object.
 * always a *field*: primitives, functions, arrays, `File`/`Blob`/`Date`, and anything branded
 * `GFieldValue`. tuple-wrapping keeps the checks non-distributive so an optional section's
 * `| undefined` doesn't split the decision.
 */
export type _IsSectionValue<V> =
    [NonNullable<V>] extends [(...args: any[]) => any] ? false
        : [NonNullable<V>] extends [ReadonlyArray<any>] ? false
            : [NonNullable<V>] extends [File | Blob | Date] ? false
                : [NonNullable<V>] extends [{ readonly [GFieldValueTag]: true }] ? false
                    : [NonNullable<V>] extends [object] ? true
                        : false;

/** strips the `GFieldValue` brand off a field's value type (identity for unbranded values). */
export type _UnwrapFieldValue<V> = V extends { readonly [GFieldValueTag]: true } ? Omit<V, typeof GFieldValueTag> : V;

/**
 * the field-state shape of one section: the section's raw shape `F` with every value wrapped in
 * `GInputState` (the same shape a flat form's state has, one level deeper). this is what
 * `state[sectionKey]` exposes and what `useFormSectionSelector<F>(sectionKey)` returns.
 */
export type GSectionState<F = any> = _IsAny<F> extends true
    ? { [key: string]: GInputState<any> }
    : { [key in keyof F]: GInputState<_UnwrapFieldValue<F[key]>> };

/** one section's slice of `toRawData()` output: the section's shape with field values unwrapped. */
export type _SectionRawData<F> = { [key in keyof F]: _UnwrapFieldValue<F[key]> };

export type IForm<T=any> = _IsAny<T> extends true
    ? { [key: string]: GInputState<any> }
    : {
        [key in keyof T]: _IsSectionValue<T[key]> extends true
            ? GSectionState<NonNullable<T[key]>>
            : GInputState<_UnwrapFieldValue<T[key]>>;
    };

type _UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/**
 * for each section key of `T`, its fields remapped to qualified template-literal keys
 * (`"billing.street"`); `never` for non-section keys (which vanish from the union). `-?` strips
 * optional modifiers so an optional section doesn't leak `undefined` into the indexed access.
 */
type _FlatSectionFields<T> = {
    [K in keyof T]-?: _IsSectionValue<T[K]> extends true
        ? { [FK in keyof NonNullable<T[K]> as `${K & string}.${FK & string}`]: GInputState<_UnwrapFieldValue<NonNullable<T[K]>[FK]>> }
        : never;
}[keyof T];

/**
 * the internal, flat field-state dictionary — always keyed by field identity (`formKey`, or
 * `"sectionKey.formKey"` for a sectioned field), regardless of `T`'s (possibly nested, per
 * `IForm<T>`) public shape. This is what the store actually holds, and what's passed to custom
 * validator handlers and `fetch`; `IForm<T>` is the *public*, section-nested view built from it.
 *
 * for a concrete `T` the shape is precise — non-section keys as-is, section fields under their
 * qualified `"sectionKey.formKey"` — so a typo'd or unqualified key (`fields.billing`) is a
 * compile error. with the `any` default (all internal call sites, which index by runtime strings)
 * it stays a loose string-keyed dictionary.
 */
export type FlatFields<T = any> = _IsAny<T> extends true
    ? { [key: string]: GInputState<any> }
    : {
        [K in keyof T as _IsSectionValue<T[K]> extends true ? never : K]: GInputState<_UnwrapFieldValue<T[K]>>;
    } & ([_FlatSectionFields<T>] extends [never] ? unknown : _UnionToIntersection<_FlatSectionFields<T>>);

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
        [key in keyof T]: _IsSectionValue<T[key]> extends true
            ? Partial<{ [fieldKey in keyof NonNullable<T[key]>]: Partial<GInputStateMutable<_UnwrapFieldValue<NonNullable<T[key]>[fieldKey]>>> }>
            : Partial<GInputStateMutable<_UnwrapFieldValue<T[key]>>>;
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