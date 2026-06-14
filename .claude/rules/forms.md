# Public Form API — gform-react

> **The public API contract for the library.** Extends [`coding-rules.md`](coding-rules.md).
> Exports: `GForm`, `GInput`, `GValidator`, `GValidators`, `GFormState`, `useFormSelector`
> (see [`src/index.ts`](../../src/index.ts)).

This file documents the usage patterns the library **guarantees for consumers**. Treat it as a
contract: changes to this behavior are public-API changes (changelog + version bump + README/example
updates). When adding or changing features, keep these guarantees working and the examples below
accurate. The same examples are what consumers copy, so they double as documentation.

---

## 1. Canonical usage

```tsx
import {type FC} from "react";
import {GForm, GInput, GValidator, type GValidators, type GFormState} from "gform-react";

// 1) Type the form: keys = formKeys, values = the field value types.
interface AddGoalForm {
    title: string;
    deadline: string;
    status: GoalStatus;
}

// 2) Validators live module-level (stable reference). '*' is the default for every field.
const validators: GValidators<AddGoalForm> = {
    '*': new GValidator().withRequiredMessage('required field'),
    // title: new GValidator(base).withMinLengthMessage('too short'),  // per-field override
};

const AddGoalForm: FC<{onAdded: (goal: Goal) => void}> = ({onAdded}) => {
    const submit = (state: GFormState<AddGoalForm>) => {
        // 3) Read the whole form with toRawData(); spread to add non-form fields. No cast.
        const goal: Goal = {...state.toRawData(), progress: 0};
        onAdded(goal);
    };

    return (
        <GForm<AddGoalForm>
            validators={validators}
            onSubmit={(state, e) => {
                e.preventDefault();   // gform does NOT preventDefault (server-action support)
                submit(state);        // onSubmit only fires when the form is valid
            }}
        >
            {(state) => (
                <>
                    <GInput
                        formKey="title"
                        required
                        placeholder="e.g. Land FAANG Position"
                        element={(input, props) => (
                            <label>
                                <span>Title</span>
                                <input {...props}/>
                                {input.error && <small>{input.errorText}</small>}
                            </label>
                        )}
                    />

                    <GInput
                        formKey="status"
                        value="on-track"   // initial value
                        element={(input, props) => (
                            <select {...props}>
                                <option value="on-track">On track</option>
                                <option value="ahead">Ahead</option>
                            </select>
                        )}
                    />

                    {/* disable from form state, not manual value checks */}
                    <button disabled={state.isInvalid}>Add Goal</button>
                </>
            )}
        </GForm>
    );
};
```

---

## 2. Guarantees & patterns

| Behavior | Contract |
|----|-----|
| `GForm<MyForm>` with a typed interface (`{ [formKey]: valueType }`) | Type-safe `state`, `toRawData()`, validators |
| `validators` passed by stable reference (module-level or `useMemo`) | Stable reference avoids re-registering fields |
| `state.<formKey>.value` | Typed single-field value |
| `state.toRawData()` | Returns `{ [formKey]: value }` for the whole form |
| `{...state.toRawData(), extra}` | Spread to add non-form fields — no `as` cast needed |
| `toRawData({ transform: { title: v => v.trim() } })` | Built-in per-field transforms |
| `state.isInvalid` / `state.isValid` | Single source of truth for form validity |
| `input.error && <small>{input.errorText}</small>` inside `element` | Error display contract |
| `onSubmit={(state, e) => { e.preventDefault(); ... }}` | gform does **not** auto-`preventDefault`; it only calls `onSubmit` when valid |
| `<select>` / `<textarea>` via `element` — spread `{...props}` directly | Native since `gform-react@2.10.0` (no cast) |
| `type="file"` | Stores the real `File` (or `File[]` with `multiple`), not the `C:\fakepath\...` string; `toFormData()` includes it |

### Submit button
- A native `<button>` inside `GForm` submits by default — `type="submit"` is **not** required.
- A **custom** `Button` component usually defaults to `type="button"` — there the consumer **must**
  pass `type="submit"`.

### Validation
- Native constraints (`required`, `minLength`, `pattern`, `type="email"`, …) on `GInput` + a matching
  `GValidator` message (`withRequiredMessage`, `withMinLengthMessage`, …).
- Custom rules: `new GValidator().withCustomValidation((input, fields) => ...)` /
  `.withCustomValidationAsync(...)`.
- Programmatic updates that should re-validate: `state.<key>.dispatchChanges({value}, {validate: true})`.

---

## 3. Server Actions (Next.js) — native `action` submission

The library supports native `<form>` submission, including Next.js Server Actions. Submit via the
`action` prop **instead of** `onSubmit`. gform still runs client validation first and blocks an
invalid submit; `GInput` sets each input's `name` to its `formKey`, so the action reads values from
`FormData` by `formKey`.

```tsx
// app/actions/sign-in.ts
'use server';
export const signIn = async (prevState: unknown, formData: FormData) => {
    const email = formData.get('email')?.toString();   // 'email' = the GInput formKey
    return {success: true};
};
```

```tsx
'use client';
import {GForm, GInput} from "gform-react";
import {useActionState, useEffect} from "react";
import {signIn} from "@/app/actions/sign-in";

const initial = {};

const EmailForm: FC<{onSuccess: () => void}> = ({onSuccess}) => {
    const [state, formAction, pending] = useActionState(signIn, initial);

    useEffect(() => {
        if (state.success) onSuccess();
    }, [state, onSuccess]);

    return (
        <GForm action={formAction} validators={validators}>   {/* action, NOT onSubmit */}
            <GInput
                formKey="email"
                required
                type="email"
                element={(input, props) => (
                    <div>
                        <input {...props}/>
                        {input.error && <small>{input.errorText}</small>}
                    </div>
                )}
            />
            <button disabled={pending}>{pending ? 'Sending…' : 'Send code'}</button>
        </GForm>
    );
};
```

Contract:
- Use **`action={formAction}`** — **not** `onSubmit`, and **do not** call `e.preventDefault()`
  (that would cancel the native submission the action relies on).
- gform validates on the client first; an invalid form never reaches the server action.
- Action signature is `(prevState, formData) => newState`; fields are read by `formKey`.

---

## 4. Anti-patterns the API is designed to prevent

When changing the library, don't make any of these the path of least resistance for consumers:

- ❌ Forcing a manual `<form>` + per-field `useState` + hand-wired `onChange`/`onSubmit`.
- ❌ Rebuilding the submit payload field-by-field instead of `toRawData()`.
- ❌ Requiring a cast on `toRawData()` output.
- ❌ `disabled={!state.x?.value || !state.y?.value}` instead of `state.isInvalid`.
- ❌ Auto-`preventDefault` (it would break native/server-action submission).
