# Runtime Performance Check

Status: `READY_FOR_CAPTURE`  
Date: 2026-02-17

## 1. Target scenario
- IMPACT with `10` conditions
- Runtime dataset `>=5000`
- Record:
  - `IMPACT took`
  - `FULL took`
  - timeout/error behavior

## 2. Existing guardrails (spec-level)
- Runtime execute endpoint advertises:
  - max condition count: `15`
  - impact timeout: `2000ms`

Reference:
- `admin.openapi.yaml:131`
- `admin.openapi.yaml:132`
- `admin.openapi.yaml:133`

## 3. Existing request-level optimization
- IMPACT requests disable result items/highlights:
  - `withItems=false`
  - `withHighlight=false`

Reference:
- `src/app/knowledge/topics/[id]/page.tsx:458`
- `src/hooks/useRuntimeExecution.ts:58`

## 4. Capture table (fill after runtime run)

| Mode | Conditions | Dataset size | took (ms) | Timeout | Pass |
|---|---:|---:|---:|---|---|
| FULL | 10 | 5000+ | _pending_ | no | _pending_ |
| IMPACT | 10 | 5000+ | _pending_ | no | _pending_ |

Pass criteria:
- FULL `< 500ms`
- IMPACT `< 2000ms`

## 5. Evidence files to attach
- `docs/verification/assets/perf-full-response.json`
- `docs/verification/assets/perf-impact-response.json`
- `docs/verification/assets/perf-summary.png`

