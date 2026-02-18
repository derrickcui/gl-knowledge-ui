# Expression Parent-Child Matrix v1 (Frozen)

## Scope

This document freezes the parent-child legality matrix for the Rule Editor expression engine.
It is the single contract for:

- UI add-button visibility and wrapping actions
- Frontend validator (`validateTree`)
- Compiler prerequisites (`gql-compiler`)
- Runtime payload generation

Current implementation source of truth:

- `src/app/knowledge/topics/[id]/rule-editor/nesting-matrix.ts`
- `src/app/knowledge/topics/[id]/rule-editor/nesting-matrix.test.ts`

## Node Types

- `LOGIC`: logical composition (`AND`/`OR`/`AT_LEAST`/`LOGSUM`/`ACCRUE`)
- `FIELD`: scope wrapper (`title`/`content`/`column`)
- `POSITION_RELATION` / legacy `PROXIMITY`: span/near relation
- `TERM_SET`: term leaf
- `NOT`: exclusion wrapper
- `SCORE`: weight wrapper
- `TOPIC_REF`: topic leaf
- `STRUCTURE`: legacy compatibility structure wrapper

## Frozen Matrix

| Parent | Allowed Children |
|---|---|
| `LOGIC` | `LOGIC`, `FIELD`, `TERM_SET`, `POSITION_RELATION`, `NOT*`, `SCORE*`, `TOPIC_REF*` |
| `FIELD` | `LOGIC`, `TERM_SET`, `POSITION_RELATION`, `NOT*`, `STRUCTURE**` |
| `STRUCTURE` | `LOGIC` |
| `POSITION_RELATION` | `TERM_SET` |
| `PROXIMITY` (legacy) | `TERM_SET` |
| `NOT` | `LOGIC`, `FIELD`, `TERM_SET`, `POSITION_RELATION` |
| `SCORE` | `FIELD`, `TERM_SET` |
| `TERM_SET` | none |
| `TOPIC_REF` | none |

- `*` gated by capability flags (`allowNot`, `allowScore`, `allowTopicRef`)
- `**` kept only for backward compatibility of existing persisted trees

## Global Constraints

- Root must be `LOGIC`.
- `TERM_SET` and `TOPIC_REF` are leaf nodes.
- `FIELD`, `NOT`, `SCORE`, `STRUCTURE` have exactly one `child` slot.
- `POSITION_RELATION` / legacy `PROXIMITY` require at least two children in validation/compile phase.
- `POSITION_RELATION` / legacy `PROXIMITY` children must be `TERM_SET` after normalization.
- `FIELD -> FIELD` is illegal.
- `NOT -> NOT` is illegal by matrix.
- `SCORE -> LOGIC` is illegal by matrix.

## Compatibility Notes

- Old data with `root = FIELD` is auto-wrapped to `LOGIC(AND)` during hydration.
- `STRUCTURE` is still accepted under `FIELD` to keep old rules loadable/editable.
- New root creation uses `LOGIC` only.

## CI Guardrail

Frozen matrix invariants are covered by:

- `src/app/knowledge/topics/[id]/rule-editor/nesting-matrix.test.ts`

Any future matrix change must update both:

1. this document
2. matrix test cases

