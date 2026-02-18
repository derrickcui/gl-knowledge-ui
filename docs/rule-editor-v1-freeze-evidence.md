# Rule Editor v1 Freeze Evidence

Date: 2026-02-17  
Scope: close-out evidence for v1.0 freeze candidate.

## A. FULL / NODE / IMPACT end-to-end evidence

### A1. Execute chain is enforced before runtime
- `normalize -> validate -> compile -> execute` is enforced in run handlers:
  - `src/app/knowledge/topics/[id]/page.tsx:431`
  - `src/app/knowledge/topics/[id]/page.tsx:438`
  - `src/app/knowledge/topics/[id]/page.tsx:443`
  - `src/app/knowledge/topics/[id]/page.tsx:454`
  - `src/app/knowledge/topics/[id]/page.tsx:494`

### A2. FULL mode behavior
- Payload includes `mode: "FULL"` + paging + items/highlight:
  - `src/hooks/useRuntimeExecution.ts:42`
- UI tab summary and list rendering:
  - `src/app/knowledge/topics/[id]/rule-editor/EffectValidationPanel.tsx:154`
  - `src/app/knowledge/topics/[id]/rule-editor/EffectValidationPanel.tsx:213`

### A3. NODE mode behavior
- Payload includes full rule + required `nodeId`:
  - `src/hooks/useRuntimeExecution.ts:61`
  - `src/app/knowledge/topics/[id]/page.tsx:495`
  - `src/app/knowledge/topics/[id]/page.tsx:496`
- Node path auto-expand + NODE active highlight state:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:256`
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:1174`
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:96`

### A4. IMPACT mode behavior
- Payload disables items/highlight and only asks analysis:
  - `src/hooks/useRuntimeExecution.ts:54`
  - `src/app/knowledge/topics/[id]/page.tsx:455`
  - `src/app/knowledge/topics/[id]/page.tsx:458`
- UI consumes `conditionCount` + contribution analysis:
  - `src/lib/api/ruleRuntime.ts:71`
  - `src/app/knowledge/topics/[id]/rule-editor/EffectValidationPanel.tsx:81`
  - `src/app/knowledge/topics/[id]/rule-editor/ImpactPanel.tsx:8`
- IMPACT highlight (purple) without forced expand:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:1185`
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:98`

## B. OpenAPI contract evidence

### B1. Discriminator and UI expression union are present
- `UiExpressionNode` `oneOf` + `discriminator`:
  - `admin.openapi.yaml` (search: `UiExpressionNode`, `discriminator`)
  - `rule-node-ast.openapi.yaml` (search: `UiExpressionNode`, `discriminator`)

### B2. Runtime modes are explicitly typed
- Runtime response union includes FULL/NODE/IMPACT:
  - `admin.openapi.yaml` (search: `RuntimeExecuteResponse`, `mode`)
  - Frontend mirror:
  - `src/lib/api/ruleRuntime.ts:1`

### B3. AT_LEAST compatibility is handled by mapping
- UI semantic `AT_LEAST` is mapped to runtime `LOGSUM` before execute:
  - `src/app/knowledge/topics/[id]/page.tsx:122`
  - `src/app/knowledge/topics/[id]/page.tsx:123`
- Compiler output uses `logsum/n` for AT_LEAST:
  - `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts:107`

## C. Performance and timeout evidence

### C1. Impact workload reduction in request shape
- IMPACT mode forces `withItems: false` and `withHighlight: false`:
  - `src/hooks/useRuntimeExecution.ts:58`
  - `src/app/knowledge/topics/[id]/page.tsx:458`

### C2. Pagination is enforced for FULL/NODE
- Default page/size are set and passed through:
  - `src/hooks/useRuntimeExecution.ts:48`
  - `src/hooks/useRuntimeExecution.ts:67`
  - `src/app/knowledge/topics/[id]/page.tsx:447`
  - `src/app/knowledge/topics/[id]/page.tsx:500`

### C3. Timeout/abort
- No frontend `AbortController` exists in runtime execute path in current v1.
- Current behavior: async with loading/error state; no explicit cancel token.
- Recommendation for v1.1: add abortable execute calls for long IMPACT runs.

## D. 5-layer nested readability evidence

### D1. Folded summaries are node-type specific
- Per-node summary builder:
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:516`

### D2. Deep auto-fold with manual override and path expand
- Auto fold strategy:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:1064`
- Manual priority:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:1068`
- Auto expand to selected/error path:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:256`
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:235`

### D3. Conflict is node-level (not only global)
- Conflict node detection + node-bound errors:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:1123`
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:1149`
- Visual red conflict marker in tree:
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:79`
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:116`
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:171`

## E. Test evidence

Command:

```bash
npx vitest run "src/app/knowledge/topics/[id]/rule-editor/runtime/normalizeExpression.spec.ts" \
  "src/app/knowledge/topics/[id]/rule-editor/expression-normalizer.test.ts" \
  "src/app/knowledge/topics/[id]/rule-editor/gql-compiler.test.ts" \
  "src/app/knowledge/topics/[id]/rule-editor/ppt-syntax-samples.test.ts" \
  "src/app/knowledge/topics/[id]/rule-editor/tree-utils.test.ts"
```

Result:
- 5 files passed
- 56 tests passed

## Freeze decision

- Meets v1 freeze bar for structure/validation/compiler/debug UI loop.
- Remaining non-blocking gap for strict freeze proof:
  - explicit runtime abort/timeout control is not yet implemented in frontend execute path.
- Decision: **Freeze v1.0 candidate accepted**, with timeout/abort listed for v1.1.

