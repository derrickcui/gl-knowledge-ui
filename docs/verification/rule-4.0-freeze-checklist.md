# Rule 4.0 Freeze Checklist

Status: `FROZEN`  
Scope: `UI project (Rule Editor 4.0)`  
Date: `2026-02-18`

## 1. Expression Engine

- [x] Arbitrary nested expression tree (within matrix constraints)  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`, `src/app/knowledge/topics/[id]/rule-editor/tree-utils.ts`
- [x] LOGIC (`AND / OR / ANY / ALL`)  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/types.ts`, `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts`
- [x] LOGSUM + threshold  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts`, `src/app/knowledge/topics/[id]/rule-editor/validation.ts`
- [x] PROXIMITY child-size constraints  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/validation.ts`
- [x] FIELD as child expression  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/validator/matrix.ts`
- [x] NOT  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/validation.ts`, `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts`
- [x] TOPIC_REF  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/validation.ts`, `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts`
- [x] Auto format expression tree  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/format-expression-tree.ts`
- [x] Parent-child matrix driven add buttons  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/AddNodeButtons.tsx`, `src/app/knowledge/topics/[id]/rule-editor/validator/matrix.ts`
- [x] Drag-reorder + legal drop checks  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/operations/moveNode.ts`, `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`
- [x] Illegal drop red feedback  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`
- [x] Auto-wrap (selected nodes -> FIELD / STRUCTURE / PROXIMITY / LOGIC)  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`, `src/app/knowledge/topics/[id]/rule-editor/operations/wrapNodes.ts`, `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`
- [x] Auto-update LOGSUM threshold  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`
- [x] Semi-folded summary  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`
- [x] Auto-expand path  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`
- [x] Node-level conflict red highlight  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`, `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`

## 2. Execution Modes UI

- [x] FULL panel  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/FullResultPanel.tsx`
- [x] NODE panel  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/NodeDetailPanel.tsx`
- [x] IMPACT panel  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/ImpactPanel.tsx`
- [x] Tab switching (Chrome-style tab strip behavior)  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/EffectValidationPanel.tsx`
- [x] Cross-mode highlight linkage  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`, `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`
- [x] NODE blue highlight  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`
- [x] IMPACT purple highlight  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`

## 3. Intelligence Visualization Layer

- [x] Complexity score UI  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/RuleIntelligencePanel.tsx`, `src/app/knowledge/topics/[id]/rule-editor/rule-intelligence.ts`
- [x] Heatmap visualization UI (dot + background + legend)  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/ExpressionNodeRenderer.tsx`, `src/app/knowledge/topics/[id]/rule-editor/ExpressionTreePanel.tsx`
- [x] Hit distribution visualization  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/EffectValidationPanel.tsx`, `src/app/knowledge/topics/[id]/rule-editor/rule-intelligence.ts`
- [x] Rule diff visualization  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/DiffPreviewPanel.tsx`, `src/app/knowledge/topics/[id]/rule-editor/diff.ts`
- [x] Auto optimization suggestions panel  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/RuleIntelligencePanel.tsx`, `src/app/knowledge/topics/[id]/rule-editor/rule-intelligence.ts`
- [x] Smart suggestion hints  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/suggestion-engine.ts`, `src/app/knowledge/topics/[id]/rule-editor.tsx`
- [x] Risk panel UI  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/RuleIntelligencePanel.tsx`
- [x] Version timeline UI  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/RuleVersionTimelinePanel.tsx`
- [x] A/B test UI  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/EffectValidationPanel.tsx`, `src/app/knowledge/topics/[id]/rule-editor/ab-test.ts`

## 4. UI Runtime Chain

- [x] `normalize`  
  Evidence: `src/app/knowledge/topics/[id]/page.tsx`, `src/app/knowledge/topics/[id]/rule-editor/expression-normalizer.ts`
- [x] `validate` (matrix-backed)  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor/validation.ts`, `src/app/knowledge/topics/[id]/rule-editor/validator/`
- [x] `compileToGql`  
  Evidence: `src/app/knowledge/topics/[id]/page.tsx`, `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts`
- [x] `execute` (API runtime)  
  Evidence: `src/app/knowledge/topics/[id]/page.tsx`
- [x] `debugStateByNodeId`  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`
- [x] `impactRanking` UI fallback mapping/sorting path  
  Evidence: `src/app/knowledge/topics/[id]/rule-editor.tsx`, `src/app/knowledge/topics/[id]/rule-editor/EffectValidationPanel.tsx`

## 5. Quick Verification

- [x] Unit tests passed (sample set):  
  `src/app/knowledge/topics/[id]/rule-editor/format-expression-tree.test.ts`  
  `src/app/knowledge/topics/[id]/rule-editor/suggestion-engine.test.ts`
- [x] E2E evidence docs already present:  
  `docs/verification/full-mode-e2e.md`  
  `docs/verification/node-mode-e2e.md`  
  `docs/verification/impact-mode-e2e.md`  
  `docs/verification/api-contract-check.md`  
  `docs/verification/performance-check.md`

---

Freeze decision: `Rule Editor 4.0 UI` is ready to freeze for this iteration.
