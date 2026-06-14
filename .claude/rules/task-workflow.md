# Task Workflow

This file covers both **planning** a new task and **executing** that plan.

> `.temp/<task-name>/` — planning and execution logs (how you're building it). Described in full
> below. Never commit `.temp/`.

---

## 1. Where plans and progress live

For each multi-step task, create a dedicated folder under `.temp/`:

```
.temp/<task-name>/
  plan.md       ← planning document (created before any code changes)
  progress.md   ← execution log (maintained throughout the task)
```

> **Never commit `.temp/`** — it is local working state only.

---

## 2. Planning a new task

Create `plan.md` at the path above **before** making any code changes.  
The plan may be organized into **phases** for clarity. Each phase contains a **numbered list of concrete steps**. Steps must be small enough to be executed and marked independently.

Work through these phases in order:

1. **Discovery & Mapping**
   - Search for existing symbols/components similar to the requested task.
   - Map dependencies (e.g., "If I change this type/store behavior, which components/exports and the
     web vs. RN variants are affected?").
2. **Design**
   - Outline the file changes needed.
   - Define new types/interfaces first. Note any public-API impact (`src/index.ts`).
3. **Incremental Implementation**
   - Break the task into small, verifiable chunks (e.g., "1. Add helper", "2. Wire into GForm",
     "3. Mirror in RNGForm", "4. Add tests").
4. **Verification**
   - Identify how to test the change (add/adjust `*.test.tsx`; run `npm test` and `npm run tscheck`).
5. **Safety & Rollback**
   - Before applying changes, ensure you have a way to revert.
   - For public-API changes, confirm changelog + version bump + README/example updates are planned.

### Plan template

```md
## Analysis
Concise summary of what was found and decided.

## Plan
1. Step one
2. Step two
...
```

---

## 3. Executing the plan

- Maintain `progress.md` (inside `.temp/<task-name>/`) as the execution log.
- Organize `progress.md` into **phases** using section headers.
- Under each phase, maintain **globally numbered executable steps**, starting from 1.
- Step numbers must be sequential across phases.
- Steps must be written so work can resume from the last completed or in-progress step if execution stops (e.g., token limits).

### Step status

Prefix each step with a status icon:

| Icon | Meaning |
|------|---------|
| ✅ | done |
| 🔄 | in progress (only one at a time) |
| 🚫 | blocked |
| ⏳ | not started |

- Phases themselves do **not** carry status; only steps do.
- Keep `progress.md` concise — record key findings, decisions, and the next actionable step.

---

## 4. Cleanup

- When the task is fully completed and changes are submitted, **delete the relevant `.temp/<task-name>/` folder**.
- Never commit `.temp/` content; it represents local working state only.
