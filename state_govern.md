# Glossary Governance – Tabs & State Specification (v1)

> 目标：一次性**定死** Glossary 的 4 个 Tab（Candidates / Approvals / Published / Audit）的**语义、查询规则、状态机与 UI 行为**，避免后续反复返工。

---

## 0. 核心设计原则（先立法）

1. **抽取 ≠ 治理**

   * AI 抽取是 *Extraction Context*
   * 人工审核是 *Governance Context*

2. **Tab = 治理阶段（Governance Stage）**

   * Tab 不等于数据库表
   * Tab 是「当前用户应该关注什么」

3. **Lifecycle Status 决定一切 Tab 归属**

   * Extraction Status 永远不用于 Tab 判断

4. **任何时刻，一个 Term 只能属于一个 Tab**

---

## 1. 核心状态模型（必须稳定）

### 1.1 状态维度拆分（强制）

#### A. Extraction Status（抽取态，仅内部）

* `CANDIDATE`
* `FILTERED`
* `MERGED`
* `IGNORED`

> ⚠️ 不直接暴露给普通用户

#### B. Lifecycle Status（治理态，Tab 的唯一依据）

* `DRAFT`
* `IN_REVIEW`
* `APPROVED`
* `REJECTED`
* `PUBLISHED`

> ✅ **Tab 只看 Lifecycle Status**

---

## 2. 四个 Tab 的“法律定义”（最重要）

### 2.1 Candidates Tab

#### ✅ 语义定义

> **尚未完成治理的术语候选**

#### 包含哪些 Lifecycle Status

* `DRAFT`
* `IN_REVIEW`

#### 明确不包含

* `APPROVED`
* `PUBLISHED`
* `REJECTED`

#### UI 语义（必须遵守）

| Lifecycle | UI Label        | 可编辑 | 操作                      |
| --------- | --------------- | --- | ----------------------- |
| DRAFT     | Pending Review  | ✅   | Edit / Submit           |
| IN_REVIEW | Under Review 🔒 | ❌   | View / Approve / Reject |

#### 查询规则（示意）

```sql
WHERE lifecycle_status IN ('DRAFT', 'IN_REVIEW')
```

---

### 2.2 Approvals Tab

#### ✅ 语义定义

> **等待当前用户做“审批决策”的术语**

> ⚠️ 注意：这是 *User-centric* Tab

#### 包含条件（必须同时满足）

* `lifecycle_status = IN_REVIEW`
* `assigned_reviewer = current_user`

#### UI 行为

* 默认高亮
* 强化 Approve / Reject
* 不允许编辑 Term 内容

#### 查询规则（示意）

```sql
WHERE lifecycle_status = 'IN_REVIEW'
  AND reviewer_id = :currentUser
```

---

### 2.3 Published Tab

#### ✅ 语义定义

> **已生效、可被搜索 / RAG / 应用系统使用的术语**

#### 包含哪些 Lifecycle Status

* `PUBLISHED`

#### UI 行为

* 完全只读
* 显示：

  * Definition
  * Aliases
  * Topics
  * Version
* 提供：

  * View History

#### 查询规则

```sql
WHERE lifecycle_status = 'PUBLISHED'
```

---

### 2.4 Audit Tab

#### ✅ 语义定义

> **所有治理行为的历史记录（不可变）**

#### 包含哪些 Lifecycle Status

* `REJECTED`
* `ARCHIVED`
* 历史版本（version < current）

#### UI 行为

* 强时间线视图
* 必须展示：

  * 操作人
  * 操作时间
  * 决策理由

#### 查询规则（示意）

```sql
WHERE lifecycle_status IN ('REJECTED', 'ARCHIVED')
   OR is_historical = true
```

---

## 3. 状态机（State Machine）

```text
[DRAFT]
   │ submit
   ▼
[IN_REVIEW]
   │ approve        │ reject
   ▼                ▼
[PUBLISHED]      [REJECTED]
```

### 状态跳转规则（强制）

* DRAFT → IN_REVIEW：用户提交
* IN_REVIEW → PUBLISHED：Approve
* IN_REVIEW → REJECTED：Reject
* PUBLISHED → ARCHIVED：未来版本迭代

---

## 4. 列表页状态显示优先级（避免混乱）

```text
UI Status Label = Lifecycle Status
```

| Lifecycle | Label          | Icon |
| --------- | -------------- | ---- |
| DRAFT     | Pending Review | ⏳    |
| IN_REVIEW | Under Review   | 🔒   |
| PUBLISHED | Published      | ✅    |
| REJECTED  | Rejected       | ❌    |

Extraction Status **禁止作为主状态展示**。

---

## 5. 最小后端接口契约（建议）

```json
{
  "id": "term-123",
  "canonical": "工作日",
  "confidence": 0.65,
  "role": "concept",

  "lifecycleStatus": "IN_REVIEW",
  "extractionStatus": "CANDIDATE",

  "locked": true,
  "reviewer": "userA"
}
```

---

## 6. 明确不做的事（v1 冻结）

* ❌ 自动 Approve
* ❌ 多级审批流
* ❌ 批量 Review
* ❌ 生命周期自动回退

> 这些全部进入 v2 / v3 规划

---

## 7. 一句话总结（产品级）

> **Tab = 治理阶段**
> **Lifecycle = 真相来源**
> **Extraction = 内部事实**

这套规范一旦定死，你后续：

* UI
* API
* 审批逻辑
* Audit

都不会再打架。

---

📌 *This document is intended to be frozen as v1.*
