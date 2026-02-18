# API Contract Check

Status: `SPEC_VERIFIED`  
Date: 2026-02-17

## 1. Verified files
- `admin.openapi.yaml`
- `rule-node-ast.openapi.yaml`

## 2. Runtime execute request contract

Path:
- `POST /api/rules/runtime/execute`

Request discriminator:
- `RuleRuntimeExecuteRequest` with `discriminator.propertyName=mode`
- Mapping:
  - `FULL`
  - `NODE`
  - `IMPACT`

Reference:
- `admin.openapi.yaml:127`
- `admin.openapi.yaml:400`

## 3. Runtime execute response contract

Response discriminator:
- `RuleRuntimeExecuteResponse` with `discriminator.propertyName=mode`
- Mapping:
  - `FULL`
  - `NODE`
  - `IMPACT`

Reference:
- `admin.openapi.yaml:735`

## 4. UI expression discriminator check

`UiExpressionNode` uses `oneOf + discriminator(propertyName=type)` with:
- `LOGIC`
- `PROXIMITY`
- `FIELD`
- `TERM_SET`
- `NOT`
- `SCORE`
- `TOPIC_REF`

Reference:
- `admin.openapi.yaml` (`UiExpressionNode` section)
- `rule-node-ast.openapi.yaml` (`UiExpressionNode` section)

## 5. Enum and AT_LEAST check

Current UI/runtime compatibility:
- UI keeps semantic `AT_LEAST`
- Runtime payload maps `AT_LEAST -> LOGSUM` before execute
  - `src/app/knowledge/topics/[id]/page.tsx:123`

Compiler behavior:
- `AT_LEAST` -> `logsum/n`
  - `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts:107`

Result:
- No runtime request sends `AT_LEAST` directly in execute payload.

## 6. Notes
- This file is contract-level verification against OpenAPI + code mapping.
- For server-side strict validation run (Swagger/Postman), attach exported request logs under:
  - `docs/verification/assets/api-contract-full.json`
  - `docs/verification/assets/api-contract-node.json`
  - `docs/verification/assets/api-contract-impact.json`

