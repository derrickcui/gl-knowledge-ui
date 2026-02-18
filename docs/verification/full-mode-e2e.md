# FULL Mode E2E Verification

Status: `READY_FOR_CAPTURE`  
Date: 2026-02-17

## 1. Test context
- Runtime endpoint: `POST /api/rules/runtime/execute`
- Mode: `FULL`
- Rule source: Rule Editor current workspace
- Runtime env id: `1` (example from OpenAPI)

## 2. Request payload (captured shape)

Reference example:
- `admin.openapi.yaml:142`

```json
{
  "mode": "FULL",
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
    "page": 1,
    "size": 20,
    "withHighlight": true,
    "withItems": true
  }
}
```

## 3. Response JSON (captured shape)

Reference example:
- `admin.openapi.yaml:239`

Key fields to verify:
- `mode=FULL`
- `total/page/size/took`
- `items[].matchedReasons`
- `items[].highlightFragments`
- `metadata.executionId`

## 4. UI evidence to capture
- Screenshot A: request payload in network panel
- Screenshot B: response body in network panel
- Screenshot C: FULL tab list + highlights in UI

Place screenshots under:
- `docs/verification/assets/full-request.png`
- `docs/verification/assets/full-response.png`
- `docs/verification/assets/full-ui.png`

## 5. Pass criteria
- FULL request accepted with `200`
- UI list rendered with pagination
- Highlight fragments visible
- Tree state unchanged after FULL run

