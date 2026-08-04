import type { ChangeEvent, FormEvent, InvalidEvent, FocusEvent, EventHandler, FocusEventHandler, ChangeEventHandler, FormEventHandler, SyntheticEvent } from "react";
import type { GInputProps, GInputState, GInputStateMutable } from "./fields";

export type PartialPick<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>;

declare const GValueTag: unique symbol;

/**
 * opts an object-**valued** field out of section detection in a `GForm<T>` interface.
 *
 * a plain-object key in the form interface defaults to *section* detection (a nested group of
 * fields — see `sectionKey`) with no ceremony, since that's the common case. in the rare case a
 * key holds a single field whose **value** is itself an object (e.g. set via `dispatchChanges`),
 * wrap the value's shape in `GValue<...>` so it types as one field instead. `File`, `File[]`,
 * `Blob`, `Date`, arrays, and functions are always treated as field values — no wrapper needed.
 *
 * this is a type-only brand (a `unique symbol` that's declared, never assigned) — it has no
 * runtime representation and adds nothing to the bundle.
 *
 * @example
 * interface CheckoutForm {
 *     couponCode: string;
 *     billing: { street: string; city: string };     // plain object = section (default)
 *     location: GValue<{ lat: number; lng: number }>; // one field with an object value
 * }
 */
export type GValue<F extends object> = F & { readonly [GValueTag]: true };

/** true for the unconstrained `any` (as opposed to a real, even if partially-unknown, shape). */
type _IsAny<T> = 0 extends (1 & T) ? true : false;

/**
 * structural section detection — the single source of truth for "is this form-interface key a
 * section or a field", used consistently by `IForm`, `PartialForm`, `RawData`, and the
 * serialization `transform` typing.
 *
 * a key is a section iff its (non-nullable, so `billing?: Address` works) value is a plain object.
 * always a *field*: primitives, functions, arrays, `File`/`Blob`/`Date`, and anything branded
 * `GValue`. tuple-wrapping keeps the checks non-distributive so an optional section's
 * `| undefined` doesn't split the decision.
 */
export type _IsSectionValue<V> =
    [NonNullable<V>] extends [(...args: any[]) => any] ? false
        : [NonNullable<V>] extends [ReadonlyArray<any>] ? false
            : [NonNullable<V>] extends [File | Blob | Date] ? false
                : [NonNullable<V>] extends [{ readonly [GValueTag]: true }] ? false
                    : [NonNullable<V>] extends [object] ? true
                        : false;

/** strips the `GValue` brand off a field's value type (identity for unbranded values). */
export type _UnwrapFieldValue<V> = V extends { readonly [GValueTag]: true } ? Omit<V, typeof GValueTag> : V;

/**
 * the field-state shape of one section: the section's raw shape `F` with every value wrapped in
 * `GInputState` (the same shape a flat form's state has, one level deeper), plus the section
 * container's own internal `sid` — generated the same way as a field's `gid`, present for the same
 * reason `gid` is on `GInputState` (internal bookkeeping, not something a consumer reads or sets).
 * Declaring it here means a section-shaped interface that itself declares a `sid` key collides at
 * the type level: that field's type becomes the intersection of its own type and `string`
 * (`GInputState<...> & string`) — unsatisfiable by any real value, so constructing or assigning it
 * is a compile error, catching the collision at the type level rather than silently at runtime.
 *
 * this is what `state[sectionKey]` exposes. To subscribe to just one section, cast a
 * `useFormSelector` read: `useFormSelector(state => state.fields.billing) as GSectionState<Address>`.
 */
export type GSectionState<F = any> = _IsAny<F> extends true
    ? { sid: string; [key: string]: GInputState<any> | string }
    : { sid: string } & { [key in keyof F]: GInputState<_UnwrapFieldValue<F[key]>> };

/** one section's slice of `toRawData()` output: the section's shape with field values unwrapped. */
export type _SectionRawData<F> = { [key in keyof F]: _UnwrapFieldValue<F[key]> };

export type IForm<T=any> = _IsAny<T> extends true
    ? { [key: string]: GInputState<any> }
    : {
        [key in keyof T]: _IsSectionValue<T[key]> extends true
            ? GSectionState<NonNullable<T[key]>>
            : GInputState<_UnwrapFieldValue<T[key]>>;
    };

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