# IMPACT Mode E2E Verification

Status: `READY_FOR_CAPTURE`  
Date: 2026-02-17

## 1. Test context
- Runtime endpoint: `POST /api/rules/runtime/execute`
- Mode: `IMPACT`
- Rule with `>=2` conditions
- Runtime env id: same as FULL/NODE

## 2. Request payload (captured shape)

Reference example:
- `admin.openapi.yaml:201`

```json
{
  "mode": "IMPACT",
  "runtimeEnvironmentId": 1,
  "rule": {
    "root": {
      "type": "LOGIC",
      "nodeId": "root-1",
      "operator": "AND",
      "children": []
    },
    "references": []
  },
  "options": {
    "withItems": false
  }
}
```

Also enforced in UI call:
- `withHighlight=false`
- `withItems=false`
- `src/app/knowledge/topics/[id]/page.tsx:458`

## 3. Response JSON (captured shape)

Reference example:
- `admin.openapi.yaml:286`

Must include:
- `mode=IMPACT`
- `fullTotal`
- `conditionCount`
- `analysis[]` (sorted by contribution in UI)
- `impactLevel` per condition

## 4. UI evidence to capture
- Screenshot A: IMPACT request/response
- Screenshot B: IMPACT ranking panel
- Screenshot C: purple highlight on HIGH/MEDIUM contribution nodes
- Screenshot D: tree fold state unchanged

Place screenshots under:
- `docs/verification/assets/impact-request-response.png`
- `docs/verification/assets/impact-panel.png`
- `docs/verification/assets/impact-highlight.png`
- `docs/verification/assets/impact-tree-state.png`

## 5. Code-path evidence (already implemented)
- IMPACT highlight state injection:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:1185`
- Purple highlight rendering:
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:98`

