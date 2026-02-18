# Rule Editor Visual Structure v1

This document defines the final visual structure for Rule Editor workspace.

Goals:
- Do not expose GQL syntax.
- Do not expose AST terms.
- Keep nested expression behavior understandable for operations users.
- Keep normalization effects visible and non-surprising.

## Workspace layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Rule Workspace                                                               │
├───────────────────────────────────────────────┬──────────────────────────────┤
│ 左侧：规则编辑区（Expression Tree）           │ 右侧：实时预览区              │
│                                               │ FULL / NODE / IMPACT         │
│ - 作用范围可视化                              │ - 结果列表                    │
│ - 结构关系可视化                              │ - 命中原因                    │
│ - 自动结构提示                                │ - 节点影响分析                │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

## Rule editor panel structure

```text
┌────────────────────────────────────────────────────┐
│ ⚙ 已统一作用范围：标题（2秒后消失）               │
├────────────────────────────────────────────────────┤
│ 📍 作用范围：正文                                  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ 至少满足 2 项                               │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ 条件：其中海外博士后                   │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ 条件：区级人力社保部门                 │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ 同时满足                               │  │  │
│  │  │   └ 条件：各地人力社保部门组织         │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

## Visual layers

Layer 1: Base condition card
- UI name: 条件
- Typical content: concept/term list

Layer 2: Scope container
- UI name: 作用范围
- Visual: `📍 作用范围：标题/正文/栏目`
- No AST term shown.

Layer 3: Structure relation container
- UI name: 结构关系
- Visual labels:
  - 同时满足
  - 满足任意一项
  - 至少满足 N 项
  - 出现在相近位置（N 词内）
  - 按顺序出现（N 词内）

Layer 4: Logic combination
- UI is still relation text, not internal operator naming.

Layer 5: Statistical control
- UI shows business wording only, for example `至少满足 N 项` / `综合评分判断`.

## Indentation and depth

- Each nesting level adds 12px left indent.
- Border/accent weakens by depth to keep scanning clarity.
- Keep max readable depth cues visible.

## Complex nesting example

```text
┌────────────────────────────────────────────────────┐
│ 同时满足                                           │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📍 作用范围：标题                             │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ 出现在相近位置（5词内）                │  │  │
│  │  │  • 条件 A                              │  │  │
│  │  │  • 条件 B                              │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  • 条件 C                                          │
└────────────────────────────────────────────────────┘
```

## Auto-normalization awareness

When same-field children are auto-hoisted by normalizer, show a light hint:
- `⚙ 已统一作用范围：标题`

Requirements:
- Hint should be non-blocking.
- Default dismiss behavior: fade after 2 seconds.
- Do not show technical words like FIELD/PROXIMITY/AST/GQL.

## Field conflict feedback

When scope conflict is detected:
- Message: `这些条件的作用范围不同，无法组合。请统一为相同的作用范围。`
- Add red border + warning marker on conflicting nodes.
- Keep guidance actionable, no compiler terms.

## Hover actions

Node hover menu (business wording):
- 添加子条件
- 改为“同时满足”
- 改为“满足任意一项”
- 设置作用范围
- 删除

Never expose internal node type names.

## Live preview integration

Flow:

```text
编辑区修改
  -> normalize
  -> validate
  -> compile
  -> 右侧实时刷新（FULL / NODE / IMPACT）
```

Interaction:
- Click node on left panel.
- Highlight node.
- Trigger NODE mode preview on right panel.

