# NODE Mode E2E Verification

Status: `READY_FOR_CAPTURE`  
Date: 2026-02-17

## 1. Test context
- Runtime endpoint: `POST /api/rules/runtime/execute`
- Mode: `NODE`
- Selected node: capture from UI click (`nodeId`)
- Runtime env id: same as FULL

## 2. Request payload (captured shape)

Reference example:
- `admin.openapi.yaml:171`

```json
{
  "mode": "NODE",
  "runtimeEnvironmentId": 1,
  "nodeId": "term-1",
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
    "page": 1,
    "size": 20,
    "withHighlight": true,
    "withItems": true
  }
}
```

## 3. Response JSON (captured shape)

Reference example:
- `admin.openapi.yaml:261`

Must include:
- `mode=NODE`
- `nodeId`
- `fullTotal`
- `nodeTotal`
- `delta`
- `items[]`

## 4. UI evidence to capture
- Screenshot A: clicked tree node + nodeId
- Screenshot B: network request/response
- Screenshot C: NODE tab with `nodeTotal/fullTotal/delta`
- Screenshot D: blue highlight on selected node

Place screenshots under:
- `docs/verification/assets/node-select.png`
- `docs/verification/assets/node-request-response.png`
- `docs/verification/assets/node-ui.png`
- `docs/verification/assets/node-highlight.png`

## 5. Code-path evidence (already implemented)
- Node execute sends full rule + nodeId:
  - `src/app/knowledge/topics/[id]/page.tsx:494`
  - `src/app/knowledge/topics/[id]/page.tsx:496`
- Path auto-expand:
  - `src/app/knowledge/topics/[id]/rule-editor.tsx:256`
- Blue NODE highlight:
  - `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx:96`

