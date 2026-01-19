# Rule Builder Guidelines

This document freezes the rules for implementing the Topic rule builder.
These are product and architecture constraints. Follow them strictly.

## Final Operator Palette (Business-Facing, v1 Frozen)

### One-line positioning

Operator Palette = "What business conditions should this rule satisfy?"

### 1) Involves what content (WHAT)

What the document is about.

#### 1-1 Involves a business concept

Display label:
Involves a business concept

Configuration options (business-friendly):
- Exactly involves this concept
- Involves this concept and its sub-concepts (recommended)
- Involves this concept and its parent concepts (advanced)

Business explanation (UI helper text):
The document content centers on this concept.

#### 1-2 Matches an existing topic (advanced)

Display label:
Matches a pre-defined topic rule

Business explanation:
Reuse an already defined rule combination.

UI rule:
Collapsed by default, visible only to advanced users.

### 2) Where the content appears (WHERE)

Where the condition appears.

#### 2-1 Appears in the document (default)

Display label:
Appears in the document body

Note:
Defaults to matching full content.

#### 2-2 Appears in the title (advanced)

Display label:
Appears in the title

#### 2-3 Appears in the same context (advanced)

Display labels:
Appears in the same paragraph
Appears in the same sentence

Business explanation:
Multiple conditions are closely related in context.

### 3) How conditions are combined (HOW)

The relationship between multiple conditions.

#### 3-1 All conditions must be met

Display label:
All of the following conditions must be satisfied

Business meaning:
All must be true.

#### 3-2 Any condition can be met

Display label:
Any of the following conditions is sufficient

#### 3-3 Exclude the following

Display label:
Exclude cases where the following conditions are satisfied

UI rules (mandatory):
- Users never see NOT
- Negation is only expressed via "Exclude"

### 4) Hit and scoring (advanced)

When something is considered a match.

#### 4-1 Partial conditions can trigger a hit

Display label:
A match occurs when some of the following conditions are met

Example hint:
At least 2 conditions are met

#### 4-2 Weighted importance (advanced)

Display label:
Determine a match based on condition importance

Business explanation:
More important conditions carry greater influence.

### Prohibited in business UI (frozen)

The following must never appear in the Operator Palette:
- AND / OR / NOT
- AST / RuleNode
- Field names (title / body / content)
- GQL / Lucene / Solr
- "set / clause / expression / term" or other technical terms
- All technical capabilities must be triggered only via business language

## Operator to AST Mapping Table (System of Record)

This table must not be shown to business users.
It is the single source for: frontend AST generation, backend validation,
Explain, and Review alignment.

### 1) Involves what content

Business Operator | AST Type | AST Params
---|---|---
Involves a business concept | CONCEPT_MATCH | conceptId
Exactly involves | CONCEPT_MATCH | relation = SELF
Involves sub-concepts | CONCEPT_MATCH | relation = DESCENDANT
Involves parent concepts | CONCEPT_MATCH | relation = ANCESTOR
Matches an existing topic | TOPIC_REF | topicId

### 2) Where the content appears

Business Operator | AST Type | AST Params
---|---|---
Appears in document body | implicit | default field
Appears in title | FIELD_CONDITION | field = TITLE
Same paragraph | PROXIMITY | mode = PARAGRAPH
Same sentence | PROXIMITY | mode = SENTENCE

UI constraint:
FIELD_CONDITION must never be created directly in UI. It is only triggered by
"Where" semantics.

### 3) How conditions are combined

Business Operator | AST Type | AST Params
---|---|---
All conditions must be met | GROUP | operator = ALL
Any condition can be met | GROUP | operator = ANY
Exclude the following | LOGIC | operator = NOT

Validator constraint:
NOT may only wrap a single layer. NOT(NOT(x)) must be rejected.

### 4) Hit and scoring

Business Operator | AST Type | AST Params
---|---|---
Some conditions trigger a hit | ACCUMULATE | threshold = N
Weighted importance | ACCUMULATE | threshold + weight

## System-level constraints (must be enforced)

1) Palette is the only AST creation entrypoint
- UI can only generate AST via the Palette.
- No handwritten or pasted AST is allowed.

2) Explain and Review must use the same business vocabulary
- Explain text can only use terms from the Palette.
- Review diffs must be reversible to Palette operations.

3) AST extension rule (future)
- New business semantics -> new Palette Operator -> AST mapping
- The reverse is forbidden.

## UI Red Lines (must not be violated)

These are non-negotiable UI rules.

1) Operator Palette is the only entrypoint
- Direct AST editing is forbidden.
- JSON or advanced modes are forbidden.
- All rule changes must originate from Palette actions.

2) UI never shows technical terms
- AND / OR / NOT
- AST / RuleNode
- GQL / Lucene / Solr
- field / title / content
- threshold / weight unless wrapped in business language

3) Rule Builder main area can be structured but not technical
- Allowed: "Concept: Postdoctoral support policy"
- Allowed: "Concept: Talent subsidy policy (descendants)"
- Forbidden: "relation=DESCENDANT"
- Forbidden: "weight=0.6"
- Use business language such as "includes sub-concepts" or "higher importance".

4) Explain Preview is a fact display, not a suggestion
- Explain Preview is read-only.
- Do not add reasoning or rewrite text.
- It must match backend Explain output exactly.

5) Review page only shows three things
- Rule meaning (Explain)
- What changed (Diff)
- Obvious issues (Anti-pattern)
- Reviewer never sees AST or config workflow.

6) Publish is an action, not a save
- Save = write draft
- Submit Review = review request
- Publish Topic = publish API
- UI must keep these three actions distinct.

## Minimum UI Surface

No extra pages are required beyond this list.

1) Topic List
- Name
- Status (Draft / In Review / Published)
- Open editor

2) Topic Editor
- Operator Palette (left)
- Rule Builder (center)
- Explain Preview (right)
- Footer actions: Save Draft / Submit Review / Publish Topic

3) Review List
- Revision
- Status
- Submitter / time

4) Review Detail
- Explain (before / after)
- Diff
- Anti-pattern
- Approve / Reject
