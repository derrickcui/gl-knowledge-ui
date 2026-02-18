# Expression Role Model v1

## Goal

Raise the architecture from "rule editor implementation" to "controllable expression language platform" without rewriting current node types.

This stage is **definition only**: no runtime behavior changes.

## Pipeline

`UI semantic layer -> Expression tree (generic AST) -> Semantic validator (nesting matrix) -> GQL compiler -> Runtime`

## Semantic Roles (non-breaking overlay)

| Semantic role | Current node types | Responsibility |
|---|---|---|
| Logical container | `LOGIC`, `SCORE` | Combine/weight sub-expressions and carry decision semantics. |
| Scope container | `FIELD`, `POSITION_RELATION` | Restrict where/how matching is evaluated (field scope, span scope). |
| Match node | `TERM_SET` | Atomic match unit from business terms/concepts. |
| Reference node | `TOPIC_REF` | Reuse published topic semantics as an atomic operand. |
| Structural compatibility | `PROXIMITY` (legacy) | Legacy compatibility only; should be migrated to `POSITION_RELATION`. |

Notes:
- This is a **role layer**, not a type-system rewrite.
- One node type can hold both structural and semantic parameters; role is about orchestration semantics.

## Role-Level Invariants

1. Root remains `FIELD` (platform entry scope).
2. Role legality is decided by the nesting matrix (single source of truth).
3. Compiler traverses by role semantics, not UI widget shape.
4. Legacy `PROXIMITY` is compatibility input, not target model.

## Mapping to Existing Architecture

- AST: keep `UiExpressionNode` union unchanged.
- Validator: enforces matrix legality using role-aware parent/child rules.
- Compiler: recursive traversal with role dispatch.
- UI: remains business-facing; does not expose GQL syntax directly.

## Why this unlocks future extension

- Add new capability by introducing either:
  - new node type mapped into an existing role, or
  - a new role with matrix + compiler dispatch updates.
- L1-L5 can evolve into capability progression without coupling to concrete node depth.

## Stage-1 Exit Criteria

1. Role vocabulary is stable and documented.
2. Current node set has complete role mapping.
3. Matrix and compiler specs reference this role model as their conceptual base.

