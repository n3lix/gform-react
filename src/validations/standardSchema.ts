/**
 * The **Standard Schema v1** interface (the `['~standard']` contract).
 * Implemented by Zod (>= 3.24), Valibot, ArkType and Yup (>= 1.7), Joi (18.0.0+),
 * so accepting a `StandardSchemaV1` lets `GValidator.withSchema` validate against any of them without a
 * runtime dependency on a schema library.
 * We only read a well-known shape.
 *
 * Declared as flat interfaces rather than the spec's `namespace` form to stay clean under
 * `@typescript-eslint`'s `no-namespace` rule.
 *
 * @see https://standardschema.dev
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
    /** The Standard Schema properties. */
    readonly '~standard': StandardSchemaV1Props<Input, Output>;
}

/** The Standard Schema properties exposed under the `['~standard']` key. */
export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Validates an unknown input value. May be synchronous or asynchronous. */
    readonly validate: (value: unknown) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
    /** Inferred input/output types associated with the schema. */
    readonly types?: StandardSchemaV1Types<Input, Output> | undefined;
}

/** The result of `validate`: success carries the parsed value, failure carries the issues. */
export type StandardSchemaV1Result<Output> = StandardSchemaV1SuccessResult<Output> | StandardSchemaV1FailureResult;

/** The result shape when validation succeeds. */
export interface StandardSchemaV1SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** Always absent on success (lets `result.issues` narrow the union). */
    readonly issues?: undefined;
}

/** The result shape when validation fails. */
export interface StandardSchemaV1FailureResult {
    /** The issues of the failed validation. */
    readonly issues: ReadonlyArray<StandardSchemaV1Issue>;
}

/** A single validation issue. */
export interface StandardSchemaV1Issue {
    /** The human-readable error message. */
    readonly message: string;
    /** The path to the offending value, if any. Segments may be primitives or `{ key }` objects. */
    readonly path?: ReadonlyArray<PropertyKey | StandardSchemaV1PathSegment> | undefined;
}

/** An object-form path segment (`{ key }`). */
export interface StandardSchemaV1PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
}

/** The inferred input/output types of a schema. */
export interface StandardSchemaV1Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input;
    /** The output type of the schema. */
    readonly output: Output;
}

/** Infers the input type of a Standard Schema. */
export type StandardSchemaV1InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input'];

/** Infers the output type of a Standard Schema. */
export type StandardSchemaV1InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output'];
