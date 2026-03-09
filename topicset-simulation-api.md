# Topic / TopicSet Simulation API

## Purpose

These APIs provide draft-only simulation for Topic and TopicSet rules.

They are intended for:

- draft rule preview
- impact review before publish
- coverage / overlap / unmapped preview in TopicSet workspace

They do not depend on published TopicSet runtime.
They execute the provided draft `compiledGql` directly against Solr.

## API List

### 1. Simulate One Topic

`POST /api/topics/simulate`

Use this to preview how many documents a draft topic rule matches and fetch a small sample.

Example request:

```json
{
  "dataset": "gl_demo",
  "sampleSize": 10,
  "rule": {
    "topicId": "topic-1",
    "topicName": "Talent Policy",
    "compiledGql": "talent"
  }
}
```

Main response fields:

- `docCount`
- `sampleDocs`

### 2. Simulate Topic Impact

`POST /api/topics/simulate-impact`

Use this to inspect the actual matched document list for one draft topic rule.

Example request:

```json
{
  "dataset": "gl_demo",
  "page": 0,
  "size": 20,
  "sort": "score",
  "rule": {
    "topicId": "topic-1",
    "topicName": "Talent Policy",
    "compiledGql": "talent"
  }
}
```

Main response fields:

- `total`
- `documents`
- `page`
- `size`

### 3. Simulate TopicSet Coverage

`POST /api/topicsets/simulate-coverage`

Use this to preview node coverage for a draft TopicSet.

Example request:

```json
{
  "dedup": true,
  "topicSetDraft": {
    "dataset": "gl_demo",
    "nodes": [
      {
        "nodeId": "node-a",
        "name": "Talent",
        "topics": [
          {
            "topicId": "topic-1",
            "topicName": "Talent Policy",
            "compiledGql": "talent"
          }
        ]
      },
      {
        "nodeId": "node-b",
        "name": "Company",
        "topics": [
          {
            "topicId": "topic-2",
            "topicName": "Company Policy",
            "compiledGql": "company"
          }
        ]
      }
    ]
  }
}
```

Main response fields:

- `totalDocs`
- `classifiedDocs`
- `unmappedDocs`
- `nodes[].docCount`

### 4. Simulate TopicSet Overlap

`POST /api/topicsets/simulate-overlap`

Use this to preview overlap pairs in a draft TopicSet.

Example request:

```json
{
  "minOverlap": 1,
  "limit": 20,
  "topicSetDraft": {
    "dataset": "gl_demo",
    "nodes": [
      {
        "nodeId": "node-a",
        "topics": [
          {
            "topicId": "topic-1",
            "topicName": "Talent Policy",
            "compiledGql": "talent"
          }
        ]
      },
      {
        "nodeId": "node-b",
        "topics": [
          {
            "topicId": "topic-2",
            "topicName": "Company Policy",
            "compiledGql": "company"
          }
        ]
      }
    ]
  }
}
```

Main response fields:

- `totalPairs`
- `overlaps[].topicAId`
- `overlaps[].topicBId`
- `overlaps[].overlapDocs`

### 5. Simulate TopicSet Overlap Documents

`POST /api/topicsets/simulate-overlap-docs`

Use this to page through the intersection document set for two draft topics.

Example request:

```json
{
  "topicAId": "topic-1",
  "topicBId": "topic-2",
  "page": 0,
  "size": 20,
  "sort": "score",
  "topicSetDraft": {
    "dataset": "gl_demo",
    "nodes": [
      {
        "nodeId": "node-a",
        "topics": [
          {
            "topicId": "topic-1",
            "topicName": "Talent Policy",
            "compiledGql": "talent"
          }
        ]
      },
      {
        "nodeId": "node-b",
        "topics": [
          {
            "topicId": "topic-2",
            "topicName": "Company Policy",
            "compiledGql": "company"
          }
        ]
      }
    ]
  }
}
```

Main response fields:

- `topicAId`
- `topicBId`
- `total`
- `documents`
- `page`
- `size`

### 6. Simulate TopicSet Overlap Explain

`POST /api/topicsets/simulate-overlap-docs/{docId}/explain`

Use this to explain why one document matches both draft topics.

Example request:

```json
{
  "topicAId": "topic-1",
  "topicBId": "topic-2",
  "topicSetDraft": {
    "dataset": "gl_demo",
    "nodes": [
      {
        "nodeId": "node-a",
        "topics": [
          {
            "topicId": "topic-1",
            "topicName": "Talent Policy",
            "compiledGql": "talent"
          }
        ]
      },
      {
        "nodeId": "node-b",
        "topics": [
          {
            "topicId": "topic-2",
            "topicName": "Company Policy",
            "compiledGql": "company"
          }
        ]
      }
    ]
  }
}
```

Main response fields:

- `docId`
- `topicA.matched`
- `topicA.matchedNodeIds`
- `topicA.explain`
- `topicB.matched`
- `topicB.matchedNodeIds`
- `topicB.explain`

### 7. Simulate TopicSet Node Impact

`POST /api/topicsets/simulate-impact`

Use this to inspect the full matched document list for one draft TopicSet node.

Example request:

```json
{
  "nodeId": "node-a",
  "page": 0,
  "size": 20,
  "sort": "score",
  "topicSetDraft": {
    "dataset": "gl_demo",
    "nodes": [
      {
        "nodeId": "node-a",
        "name": "Talent",
        "topics": [
          {
            "topicId": "topic-1",
            "topicName": "Talent Policy",
            "compiledGql": "talent"
          }
        ]
      }
    ]
  }
}
```

Main response fields:

- `nodeId`
- `nodeName`
- `total`
- `documents`
- `page`
- `size`

### 8. Simulate TopicSet Unmapped

`POST /api/topicsets/simulate-unmapped`

Use this to page through the full draft unmapped document set.

Example request:

```json
{
  "page": 0,
  "size": 20,
  "sort": "score",
  "topicSetDraft": {
    "dataset": "gl_demo",
    "nodes": [
      {
        "nodeId": "node-a",
        "name": "Talent",
        "topics": [
          {
            "topicId": "topic-1",
            "topicName": "Talent Policy",
            "compiledGql": "talent"
          }
        ]
      },
      {
        "nodeId": "node-b",
        "name": "Company",
        "topics": [
          {
            "topicId": "topic-2",
            "topicName": "Company Policy",
            "compiledGql": "company"
          }
        ]
      }
    ]
  }
}
```

Main response fields:

- `total`
- `documents`
- `page`
- `size`

### 9. Simulate TopicSet Dashboard

`POST /api/topicsets/simulate-dashboard`

Use this as the main draft preview entry for TopicSet workspace.

It aggregates:

- coverage
- overlap
- unmapped sample

Example request:

```json
{
  "dedup": true,
  "overlapMinOverlap": 1,
  "overlapLimit": 20,
  "unmappedSampleSize": 10,
  "unmappedSort": "score",
  "topicSetDraft": {
    "dataset": "gl_demo",
    "nodes": [
      {
        "nodeId": "node-a",
        "name": "Talent",
        "topics": [
          {
            "topicId": "topic-1",
            "topicName": "Talent Policy",
            "compiledGql": "talent"
          }
        ]
      },
      {
        "nodeId": "node-b",
        "name": "Company",
        "topics": [
          {
            "topicId": "topic-2",
            "topicName": "Company Policy",
            "compiledGql": "company"
          }
        ]
      }
    ]
  }
}
```

Main response fields:

- `coverage`
- `overlap`
- `unmappedDocs`
- `unmappedSampleDocs`

## UI Mapping

### Topic Editor

- simulate button: `POST /api/topics/simulate`
- view impact: `POST /api/topics/simulate-impact`

### TopicSet Workspace

- preview coverage: `POST /api/topicsets/simulate-coverage`
- preview overlap docs tab: `POST /api/topicsets/simulate-overlap-docs`
- preview overlap explain drawer: `POST /api/topicsets/simulate-overlap-docs/{docId}/explain`
- preview node impact tab: `POST /api/topicsets/simulate-impact`
- preview overlap: `POST /api/topicsets/simulate-overlap`
- preview unmapped tab: `POST /api/topicsets/simulate-unmapped`
- preview dashboard: `POST /api/topicsets/simulate-dashboard`

## Notes

- `dataset` must match the current Solr collection when provided
- all simulation queries still apply ACL filters
- simulation does not write runtime state
- simulation does not affect published search behavior

## Relationship To Published Governance APIs

Draft simulation APIs:

- `/api/topics/simulate`
- `/api/topics/simulate-impact`
- `/api/topicsets/simulate-coverage`
- `/api/topicsets/simulate-overlap-docs`
- `/api/topicsets/simulate-overlap-docs/{docId}/explain`
- `/api/topicsets/simulate-impact`
- `/api/topicsets/simulate-overlap`
- `/api/topicsets/simulate-unmapped`
- `/api/topicsets/simulate-dashboard`

Published governance APIs:

- `/api/topicsets/{id}/coverage`
- `/api/topicsets/{id}/unmapped`
- `/api/topicsets/{id}/overlap`
- `/api/topicsets/{id}/governance-dashboard`

Use simulation APIs before publish.
Use published governance APIs after publish.
