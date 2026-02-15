# Rule Editor Structure Constitution v1.0

## Purpose

This document freezes the structure invariants of the rule editor (L1-L5), prevents future regressions, and serves as the v1.0 structural reference set.

## Legal / Illegal Examples

| ID | Example | Structure | Result | Violated Layer | Why |
|---|---|---|---|---|---|
| 1 | Minimum legal tree | `FIELD -> STRUCTURE -> LOGIC -> TERM` | PASS | - | All minimum invariants are satisfied. |
| 2 | Missing L1 | `LOGIC -> TERM` | FAIL | L1 | Root must be `FIELD`. |
| 3 | Legal L3 recursion | `LOGIC -> TERM + LOGIC(TERM, TERM)` | PASS | - | `LOGIC` recursion is allowed and each group is non-empty. |
| 4 | STRUCTURE inside LOGIC | `LOGIC -> STRUCTURE` | FAIL | L2 | `STRUCTURE` is only allowed under `FIELD`. |
| 5 | Legal L4 relation | `LOGIC -> POSITION_RELATION(TERM, TERM)` | PASS | - | Position node is under `LOGIC`, children are terms only. |
| 6 | POSITION contains LOGIC | `POSITION_RELATION(TERM, LOGIC)` | FAIL | L4 | Position node must contain only terms. |
| 7 | Nested POSITION | `POSITION_RELATION(..., POSITION_RELATION(...))` | FAIL | L4 | Nested position relation is forbidden. |
| 8 | Legal L5 leaf | `TERM_SET{terms:[A]}` | PASS | - | Atomic leaf with `terms >= 1`. |
| 9 | Empty TERM_SET | `TERM_SET{terms:[]}` | FAIL | L5 | Empty term leaf is forbidden. |
| 10 | Recursive TERM | `TERM_SET -> TERM_SET` | FAIL | L5 | TERM cannot be recursive and has no child nodes. |
| 11 | AT_LEAST with one child | `LOGIC(AT_LEAST) -> TERM` | FAIL | L3 | This semantic mode requires `children >= 2`. |
| 12 | WEIGHTED with one child | `LOGIC(LOGSUM/WEIGHTED) -> TERM` | FAIL | L3 | Weighted mode requires `children >= 2`. |
| 13 | Double STRUCTURE layer | `FIELD -> STRUCTURE -> STRUCTURE -> LOGIC` | FAIL | L2 | Only one structure layer is allowed. |
| 14 | STRUCTURE under TITLE | `FIELD(TITLE) -> STRUCTURE(SENTENCE/PARAGRAPH)` | FAIL | L1/L2 | Title scope does not allow structure layer. |
| 15 | Fully legal complex tree | `FIELD -> STRUCTURE -> LOGIC(AT_LEAST){POSITION(TERM,TERM), TERM, LOGIC(TERM,TERM)}` | PASS | - | Satisfies all layer invariants and semantic constraints. |

## Structural Constitution (Frozen Rules)

1. There must be exactly one `FIELD`.
2. `STRUCTURE` can appear at most once and only under `FIELD`.
3. `LOGIC` is recursive, but each logic group must be non-empty.
4. `POSITION_RELATION` can only be under `LOGIC`, must have at least 2 children, and all children must be `TERM_SET`.
5. `TERM_SET` is a pure leaf node: no recursion, no child node, and no empty terms.
6. Semantic mode must match child count (`AT_LEAST/ACCRUE/LOGSUM/WEIGHTED` require `>= 2` children).
7. No empty nodes and no implicit structure pollution are allowed.

## Layer Mapping

- L1: Scope root (`FIELD`)
- L2: Structure scope (`STRUCTURE`)
- L3: Logic composition (`LOGIC`)
- L4: Position relation wrapper (`POSITION_RELATION`)
- L5: Term leaf (`TERM_SET`)

