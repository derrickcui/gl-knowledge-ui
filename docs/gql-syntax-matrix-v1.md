# GQL Syntax Matrix v1

This document is the single reference for rule-editor nesting legality and local GQL compiler mapping.

Conceptual role model: `docs/expression-role-model-v1.md`.

## Parent -> Child matrix

| Parent | Allowed children |
|---|---|
| `FIELD` | any expression node except `FIELD` (single child only) |
| `STRUCTURE` | `LOGIC` |
| `LOGIC` | any expression node |
| `POSITION_RELATION` | `TERM_SET` only |
| `PROXIMITY` | any expression node (normalized before compile) |
| `NOT` | any expression node (single child only) |
| `SCORE` | any expression node (single child only) |
| `TERM_SET` | none |
| `TOPIC_REF` | none |

Some nodes are capability-gated at runtime (e.g. `NOT`, `SCORE`, `TOPIC_REF`).

Normalization constraints:
- `FIELD -> FIELD` is invalid.
- `PROXIMITY` with `FIELD` children requires same field value.
- Same-field `PROXIMITY(FIELD(x,a), FIELD(x,b))` is rewritten to `FIELD(x, PROXIMITY(a,b))`.

Source of truth in code:
- `src/app/knowledge/topics/[id]/rule-editor/nesting-matrix.ts`
- `src/app/knowledge/topics/[id]/rule-editor/validation.ts`

## Local compiler mapping

| UI node | GQL output |
|---|---|
| `FIELD(CONTENT/TITLE/COLUMN)` | `<in/content|title|column>(expr)` |
| `STRUCTURE(SENTENCE/PARAGRAPH)` | `<sentence>(expr)` / `<paragraph>(expr)` |
| `LOGIC(ANY/ALL/ACCRUE)` | `<any|all|accrue>(...)` |
| `LOGIC(AT_LEAST/LOGSUM/WEIGHTED, threshold=N)` | `<logsum/N>(...)` |
| `POSITION_RELATION(NEAR,distance,ordered)` | `<near/n>(...)` or `<order><near/n>(...)` |
| `POSITION_RELATION(SENTENCE/PARAGRAPH,ordered)` | `<sentence>(...)` / `<paragraph>(...)` with optional `<order>` prefix |
| `NOT` | `<not>expr` |
| `SCORE(weight)` | `[weight](expr)` |
| `TOPIC_REF(topicId)` | `{topicId}` |
| `TERM_SET` | single term or `<and|or>(...)` by `matchMode` |

Source of truth in code:
- `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.ts`

## Test coverage set

- `src/app/knowledge/topics/[id]/rule-editor/ppt-syntax-samples.test.ts`
- `src/app/knowledge/topics/[id]/rule-editor/gql-compiler.test.ts`
- `src/app/knowledge/topics/[id]/rule-editor/tree-utils.test.ts`
