/**
 * compile-time contract tests for the section typing in `form.ts`/`state.ts` (Variant B:
 * structural detection + `GFieldValue` opt-out). The assertions in this file are enforced by
 * `npm run tscheck` — a wrong conditional-type branch or a compiling `@ts-expect-error` line
 * fails the type check, which gates the build. Everything value-level lives inside a function
 * that is never called (babel strips only the types), so jest just runs the anchor test below.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type {FlatFields, GFieldValue, GSectionState, IForm, _IsSectionValue} from './form';
import type {InitialState, RawData} from './state';

type Address = { street: string; city: string };
type CheckoutForm = {
    couponCode: string;
    avatar: File;
    attachments: File[];
    when: Date;
    tags: string[];
    location: GFieldValue<{ lat: number; lng: number }>;
    billing: Address;
    shipping?: Address;
};

type Expect<T extends true> = T;

// ---- section detection (`_IsSectionValue`) ----
type SectionIsDetected = Expect<_IsSectionValue<Address> extends true ? true : false>;
type OptionalSectionIsDetected = Expect<_IsSectionValue<Address | undefined> extends true ? true : false>;
type FileIsAField = Expect<_IsSectionValue<File> extends false ? true : false>;
type FileArrayIsAField = Expect<_IsSectionValue<File[]> extends false ? true : false>;
type DateIsAField = Expect<_IsSectionValue<Date> extends false ? true : false>;
type ArrayIsAField = Expect<_IsSectionValue<string[]> extends false ? true : false>;
type BrandedObjectIsAField = Expect<_IsSectionValue<GFieldValue<{ lat: number }>> extends false ? true : false>;
type PrimitiveIsAField = Expect<_IsSectionValue<string> extends false ? true : false>;
type AnyIsAField = Expect<_IsSectionValue<any> extends false ? true : false>;

// never called — exists only so tscheck verifies the value-level typing below
const _compileTimeAssertions = (
    fields: FlatFields<CheckoutForm>,
    state: InitialState<CheckoutForm>,
    form: IForm<CheckoutForm>,
    raw: RawData<CheckoutForm>,
    loose: FlatFields,
): void => {
    // ---- precise `FlatFields<T>` (qualified template-literal keys) ----
    const qualifiedKey: string = fields['billing.street'].value;
    const optionalSectionKey = fields['shipping.city'];
    const flatKey: string = fields.couponCode.value;
    const brandUnwrapped: { lat: number; lng: number } = fields.location.value;
    // @ts-expect-error - a section name is not a flat field key
    const sectionNameIsNotAFlatKey = fields.billing;
    // @ts-expect-error - a typo'd qualified key fails to compile
    const typoQualifiedKey = fields['billing.stret'];

    // ---- typed `useFormSelector` annotation (`InitialState<T>`) closes the typo hole ----
    const selectedSectionField = state.fields['billing.street'];
    // @ts-expect-error - `state.fields.billing` (the bug that motivated the section hook) no longer compiles
    const selectedSectionName = state.fields.biling;

    // ---- `IForm<T>` nested public view ----
    const nestedFieldValue: string = form.billing.street.value;
    const sectionSlice: GSectionState<Address> = form.billing;
    // @ts-expect-error - a section is a field group, not a field: it has no `.value`
    const sectionHasNoValue = form.billing.value;

    // ---- `RawData<T>` nests sections and unwraps `GFieldValue` ----
    const rawSection: Address = raw.billing;
    const rawBranded: { lat: number; lng: number } = raw.location;
    const rawFlat: string = raw.couponCode;

    // ---- the `any` default stays a loose string-keyed dictionary ----
    const looseAccess = loose['anything.goes'];
};

describe('form typing (compile-time)', () => {
    it('is enforced by `npm run tscheck` (see the type assertions above)', () => {
        expect(typeof _compileTimeAssertions).toBe('function');
    });
});
