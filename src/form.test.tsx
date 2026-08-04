  /**
 * compile-time contract tests for the section typing in `form.ts`/`state.ts` (structural
 * `_IsSectionValue` detection + `GValue` opt-out). The assertions in this file are enforced by
 * `npm run tscheck` — a wrong conditional-type branch or a compiling `@ts-expect-error` line fails
 * the type check, which gates the build. Everything value-level lives inside a function that is
 * never called (babel strips only the types), so jest just runs the anchor test below.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type {GSectionState, GValue, IForm, _IsSectionValue} from './form';
import type {InitialState, RawData} from './state';

type Address = { street: string; city: string };
type CheckoutForm = {
    couponCode: string;
    avatar: File;
    attachments: File[];
    when: Date;
    tags: string[];
    location: GValue<{ lat: number; lng: number }>;
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
type BrandedObjectIsAField = Expect<_IsSectionValue<GValue<{ lat: number }>> extends false ? true : false>;
type PrimitiveIsAField = Expect<_IsSectionValue<string> extends false ? true : false>;
type AnyIsAField = Expect<_IsSectionValue<any> extends false ? true : false>;

// never called — exists only so tscheck verifies the value-level typing below
const _compileTimeAssertions = (
    state: InitialState<CheckoutForm>,
    form: IForm<CheckoutForm>,
    raw: RawData<CheckoutForm>,
    loose: IForm<any>,
): void => {
    // ---- typed `useFormSelector` annotation (`InitialState<T>`) reaches through the tree ----
    const nestedFieldViaState: string = state.fields.billing.street.value;
    const optionalSectionFieldViaState = state.fields.shipping?.city;
    const flatFieldViaState: string = state.fields.couponCode.value;
    // @ts-expect-error - a typo'd section key fails to compile
    const typoSectionViaState = state.fields.biling;
    // @ts-expect-error - a typo'd field-within-section key fails to compile
    const typoFieldViaState = state.fields.billing.stret;

    // ---- `IForm<T>` nested public view ----
    const nestedFieldValue: string = form.billing.street.value;
    const sectionSlice: GSectionState<Address> = form.billing;
    const sectionId: string = form.billing.sid;
    const brandUnwrapped: { lat: number; lng: number } = form.location.value;
    // @ts-expect-error - a section is a field group, not a field: it has no `.value`
    const sectionHasNoValue = form.billing.value;

    // ---- `RawData<T>` nests sections and unwraps `GValue` ----
    const rawSection: Address = raw.billing;
    const rawBranded: { lat: number; lng: number } = raw.location;
    const rawFlat: string = raw.couponCode;
    // @ts-expect-error - a section's raw data has no `sid` — that's internal bookkeeping only
    const rawSectionHasNoSid = raw.billing.sid;

    // ---- the `any` default stays a loose string-keyed dictionary ----
    const looseAccess = loose.anything;
};

// a section-shaped interface that itself declares a `sid` key collides at the type level — its
// `sid` field's type becomes an unsatisfiable intersection with the container's own `sid: string`,
// so no real value can be assigned to it (a reserved name within a section, per `form.ts`).
type SectionWithReservedSidKey = { sid: string; email: string };
const _reservedSidKeyIsUnassignable = (section: GSectionState<SectionWithReservedSidKey>): void => {
    // @ts-expect-error - `sid` collides with the section container's own reserved `sid` property
    section.sid = 'anything';
};

describe('form typing (compile-time)', () => {
    it('is enforced by `npm run tscheck` (see the type assertions above)', () => {
        expect(typeof _compileTimeAssertions).toBe('function');
    });
});
