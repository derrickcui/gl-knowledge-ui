# 前端组件清单与页面状态机（Rule / Topic 编辑器）

> 本文档用于前端实现与联调。
> 目标：任何状态下，页面只呈现**业务可理解**的操作，且状态转换稳定、可测试。

---

## 一、组件总览（Component Inventory）

### 1. 页面级（Pages）
- **RuleEditorPage**
- **TopicEditorPage**

### 2. 布局级（Layouts）
- **ThreeColumnLayout**
  - LeftPanel（判断路径）
  - MainPanel（规则编辑）
  - RightPanel（文字化预览）

### 3. 导航与头部（Headers）
- **RuleHeader**
  - RuleNameInput
  - RuleDescriptionTextarea

### 4. 判断路径（Paths）
- **PathList**
- **PathItem**
- **AddPathButton**

### 5. 判断描述（Descriptors）
- **DescriptorList**
- **DescriptorCard**
- **AddDescriptorButton**

### 6. 判断描述编辑器（Descriptor Editor）
- **DescriptorEditorModal**
  - DescriptorNameInput（选填）
  - ExpressionsList
  - AddExpressionButton
  - MatchModeRadio（任一 / 同时）
  - PreviewText
  - FooterActions（Cancel / Save）

### 7. 表达来源选择（Modals）
- **ExpressionSourceModal**
  - ConceptPicker
  - TermPicker / SynonymPicker
  - ManualInput

### 8. 路径成立方式（Path Decision）
- **PathDecisionPanel**
- **PriorityInput**

### 9. 预览（Preview）
- **NaturalLanguagePreview**

---

## 二、全链路模型与映射（UI Payload → UiRuleViewModel → BusinessRule）

### 2.1 三层职责边界（必须遵守）

| 层级 | 名称 | 责任 |
|---|---|---|
| UI Payload | UiRulePayload | 前端编辑行为的最小单元（可变、可脏） |
| UI ViewModel | UiRuleViewModel | 前端渲染与再编辑的唯一事实模型 |
| Domain | BusinessRule | 语义正确、可编译、可校验的规则模型 |

- UI 绝不直接使用 BusinessRule。
- ViewModel 不等于 Payload，不等于 BusinessRule。

### 2.2 UiRuleViewModel（前端唯一事实模型）

```ts
UiRuleViewModel {
  paths: UiRulePath[]
  references: UiRuleReference[]
}

UiRulePath {
  id: string
  priority: number
  where: UiWhere
  semantic: UiSemantic
  structure: UiStructure
}

UiWhere {
  field: 'CONTENT' | 'TITLE' | 'COLUMN'
}

UiSemantic {
  mode: 'AND' | 'OR' | 'AT_LEAST' | 'ACCRUE' | 'WEIGHTED'
  threshold: number | null
  conditions: UiCondition[]
}

UiCondition {
  kind: 'TERM_SET'
  label: string
  expressions: UiExpression[]
  importance?: 'HIGH' | 'NORMAL' | 'LOW'
}

UiExpression {
  source: 'CONCEPT'
  conceptId: string
  conceptName: string
  includeDescendants: boolean
}

UiStructure {
  relation: 'NONE' | 'NEAR'
  ordered: boolean
  distance: number | null
}
```

### 2.3 UI Payload → BusinessRule（Normalize）

| UiRulePayload | BusinessRule | 说明 |
|---|---|---|
| rule.groups[] | rule.paths[] | 一组 = 一条成立路径 |
| rule.logic | ❌ | UI legacy，不进入 domain |
| templateId / version | ❌ | 与规则语义无关 |

**Path 级映射**

| UiRulePayload.group | BusinessRule.path | 说明 |
|---|---|---|
| group.id | path.id | 透传 |
| group.priority | path.priority | 透传 |
| group.where.field | path.scope.field | 仅此处提供 |

**关键规则**
- `scope.field` 只能来自 `where.field`。
- 绝不从 `proximity` 推断字段。

**结构（Structure）**

| UiRulePayload.proximity | BusinessRule.structure | 说明 |
|---|---|---|
| mode = NEAR | relation = NEAR | 结构关系 |
| mode = DOCUMENT | relation = NONE | 无结构 |
| ordered | ordered | 透传 |
| distance | distance | 仅 NEAR |

**语义（Semantic）**

| UiRulePayload.operator | BusinessRule.semantic | GQL |
|---|---|---|
| OR | OR | `<or>` |
| AND | AND | `<and>` |
| ANY | ANY | `<any>` |
| AT_LEAST | AT_LEAST | `<logsum/n>` |
| ACCRUE | ACCRUE | `<accrue>` |
| WEIGHTED | WEIGHTED | `<logsum/n>` |

**TERM_SET 条件**

| UiRulePayload.condition | BusinessRule.expr | 说明 |
|---|---|---|
| kind = TERM_SET | TermSetExpr | 一一对应 |
| payload.matchMode | TermSetExpr.matchMode | ANY / ALL |
| payload.expressions[] | TermSetExpr.terms[] | 逐条映射 |

### 2.4 BusinessRule → UiRuleViewModel（Hydrate）

> **放在后端。前端不做 fallback。**  
> 若 `uiRule` 缺失，前端仅提示“规则数据不可用/需升级接口”。

**Path 映射**

| BusinessRule.path | UiRulePath | 说明 |
|---|---|---|
| id | id | 透传 |
| priority | priority | 透传 |
| scope.field | where.field | UI 出现位置 |
| structure | structure | 原样返回 |

**Semantic 映射**

| BusinessRule.semantic | UiSemantic | 说明 |
|---|---|---|
| operator | mode | AND / OR / … |
| threshold | threshold | AT_LEAST / WEIGHTED |
| expr.children[] | conditions[] | 结构变化 |

**Condition label 生成（必须在后端完成）**
- 1 个 term → `conceptName`
- N 个 term → `第一个 + “等 N 个概念”`  
  英文：`{first} and {n} more concepts`

> 前端不允许“猜 label”。label 只能来自 UiRuleViewModel。

---

## 三、页面状态机（Page State Machine）

### 1. RuleEditorPage 状态

| 状态 | 描述 | 允许操作 |
|---|---|---|
| EMPTY | 尚无判断路径 | 新增路径 |
| WITH_PATH | 有路径无描述 | 新增判断描述 |
| WITH_DESC | 有≥1判断描述 | 编辑/删除描述 |
| MULTI_DESC | ≥2判断描述 | 选择成立方式 / 位置关系 |
| MULTI_PATH | ≥2路径 | 编辑路径 | 

**状态流转**
```
EMPTY -> WITH_PATH -> WITH_DESC -> MULTI_DESC
                   -> MULTI_PATH（并行）
```

---

### 2. DescriptorEditor 状态

| 状态 | 描述 | 说明 |
|---|---|---|
| INIT | 新建描述 | Save 禁用 |
| HAS_EXPR | ≥1表达 | Save 启用 |
| MULTI_EXPR | ≥2表达 | 可选择「任一/同时」 |

---

## 四、关键交互规则（必须实现）

1. **禁用优先于报错**
   - 不满足条件时按钮禁用，而非弹错误

2. **能力随状态出现**
   - 成立方式与位置关系仅在 ≥2 描述时出现

3. **所见即所得**
   - 右侧预览随任何修改实时更新

4. **单一职责**
   - 左栏只管路径
   - 中栏只管编辑
   - 右栏只管说明

---

## 五、GQL 操作符顺序约束（内 → 外）

严格按顺序构建 UI，避免非法结构（例如：`<near><in/field><or>(a,b)`）。

### 顺序关系（内 → 外）

1. **词项修饰符**（仅能贴在词项前）
`<many> <case> <fuzz/n> <typo/n> <thesaurus> <stem> <soundex> <wildcard> <word>`

2. **词项本体**
`TERM / QUOTED`

3. **字段操作（字段级表达式）**
`FIELD (=|!=|>|>=|<|<=) VALUE`
`FIELD <contains|starts|ends|matches|substring> VALUE`

4. **近邻结构（Proxi 体系）**
`<phrase> <near[/n]> <sentence> <paragraph>`
可加 `<order>` 前缀：`<order><near/3>(a,b)`

5. **逻辑组合（Logic 体系）**
`<and> <or> <any> <all> <accrue>`（前缀或中缀）
`<not>`（仅前缀）

6. **字段限定（最外层包装）**
`<in/field> expr`
可接 `<when>(...)`（仅字段比较/文本匹配/逻辑）

### 顶层特例
- `<like>(TERM)` 只能单独顶层出现
- `<lang/xx>` 只能在最开头

---

## 六、约束矩阵（Outer ⟶ Inner 是否允许）

| Outer \ Inner | 词项修饰符 | 词项本体 | 字段操作 | 结构操作(Proxi) | 逻辑操作 | 字段限定(<in>) | 条件(<when>) |
|---|---|---|---|---|---|---|---|
| 词项修饰符 | 否 | 是 | 否 | 否 | 否 | 否 | 否 |
| 词项本体 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| 字段操作 | 否 | 是 | 否 | 否 | 否 | 否 | 否 |
| 结构操作(Proxi) | 否 | 是 | 是 | 是 | 否 | 否 | 否 |
| 逻辑操作 | 否 | 是 | 是 | 是 | 是 | 是 | 是 |
| 字段限定(<in>) | 否 | 是 | 是 | 是 | 是 | 否 | 是 |
| 条件(<when>) | 否 | 否 | 是 | 否 | 是 | 否 | 否 |

### 说明补充（必须遵守）
- `<in/field>` 只能包在逻辑层之外，不能被 `<near>` 或其它结构操作包。
- `<when>` 只能跟在 `<in/field> expr` 之后，且 `<when>` 内仅允许字段操作和逻辑组合。
- 逻辑操作符 `<and>/<or>/<any>/<all>/<accrue>` 不能作为词项修饰符使用。
- `<like>` 只能顶层单独出现；`<lang/xx>` 只能最开头。

---

> 本文档作为前端实现与测试基线，
> 后续新增能力只允许**增加状态，不允许破坏既有状态**。
