# TopicSet Taxonomy Editor Drag & Drop Engineering Spec v1

## 0. 目标与范围

本规范定义 TopicSet Taxonomy Editor 的拖拽交互标准，目标为：

- 可直接开发（前端、后端、测试均可按文档落地）
- 企业级 UX（误触低、反馈清晰、失败可恢复）
- 支持大规模 taxonomy（1万+ 节点）

适用页面与代码入口：

- `src/app/knowledge/topicsets/[id]/components/taxonomy-tree.tsx`
- `src/app/knowledge/topicsets/[id]/workspace-client.tsx`
- `src/store/topicsetStore.ts`
- `src/lib/topicset-api.ts`

---

## 1. Node 结构规范

### 1.1 行结构（Row Anatomy）

每个 Tree Row 必须包含以下区域（从左到右）：

`[drag-handle] [expand] [icon] [label] [actions]`

示例：

`⋮⋮  ▸  Talent Policy                     [+] [⋮]`

约束：

- 仅 `drag-handle` 可触发拖拽。
- `label` 点击仅做选中（不触发拖拽）。
- `actions` 区域必须 `stopPropagation`，避免影响选中/拖拽。

### 1.2 数据结构（前端）

```ts
type TopicSetNode = {
  id: string;
  name: string;
  path: string; // e.g. /policy/talent/postdoc
  children: TopicSetNode[];
};
```

Store 缓存结构（必须）：

```ts
nodeMap: Record<string, TopicSetNode>;
childrenByParent: Record<string, string[]>; // key: parentId | "__root__"
rootNodeIds: string[];
```

---

## 2. Drag 启动规范

### 2.1 触发条件

- `pointerdown` 发生在 `drag-handle` 后才允许 dragStart。
- 其他区域（label、input、menu、button）不允许启动拖拽。

### 2.2 状态机（前端）

```ts
type DragState =
  | { phase: "idle" }
  | {
      phase: "dragging";
      sourceNodeId: string;
      sourceParentId: string | null;
      sourceIndex: number;
      startedAt: number;
    }
  | {
      phase: "dropping";
      sourceNodeId: string;
      targetParentId: string;
      targetIndex: number;
    };
```

状态流转：

`idle -> dragging -> dropping -> idle`

---

## 3. Drag 视觉规范

### 3.1 Ghost（拖动浮层）

要求：

- opacity: `0.92`
- shadow: `0 8px 24px rgba(0,0,0,0.14)`
- border radius: `8px`
- pointer-events: `none`

### 3.2 Source Node（源节点）

拖动中源节点样式：

- opacity: `0.4`
- 保持高度不变（防止列表抖动）

---

## 4. Drop Indicator（核心）

Tree 必须同时提供两类提示：

- 线性 cursor（before/after）
- 容器高亮 + “Drop here” 标签（inside）

当前工程建议继续使用 `react-arborist` 的：

- `renderCursor`（自定义 drop 线）
- `node.willReceiveDrop`（目标高亮）

---

## 5. Drop 类型与判定

### 5.1 类型定义

```ts
type DropPosition = "BEFORE" | "INSIDE" | "AFTER";
```

### 5.2 区域阈值（必须）

单节点高度按百分比分区：

- `0% - 25%`: BEFORE
- `25% - 75%`: INSIDE
- `75% - 100%`: AFTER

判定伪代码：

```ts
const zone = pointerY / nodeHeight;
if (zone < 0.25) return "BEFORE";
if (zone > 0.75) return "AFTER";
return "INSIDE";
```

### 5.3 与当前后端契约映射

当前 API 契约是 `newParentId + index`，非 `targetNodeId + position`。

前端必须保留统一语义层：

```ts
moveNodeByPosition({
  sourceNodeId,
  targetNodeId,
  position, // BEFORE | INSIDE | AFTER
});
```

再映射到 API：

- `INSIDE` -> `newParentId = targetNodeId`, `index = children.length`
- `BEFORE` -> `newParentId = target.parentId`, `index = target.index`
- `AFTER` -> `newParentId = target.parentId`, `index = target.index + 1`

---

## 6. 自动展开节点

### 6.1 规则

- 拖拽中 hover 到可展开节点 `>= 800ms` 自动展开。
- 离开目标节点立即取消计时器。
- 已展开节点不重复触发。

### 6.2 性能要求

- 自动展开只能触发一次 `loadChildren(parentId)`。
- 必须使用 `loadedChildrenParents` 去重，禁止重复请求。

---

## 7. 禁止操作检测

拖拽提交前必须通过以下校验：

### 7.1 Self Move

- `sourceNodeId === targetNodeId` -> 禁止

### 7.2 Descendant Move

- 移动到自身后代 -> 禁止

建议算法：

```ts
function isDescendant(childrenByParent, sourceNodeId, targetNodeId): boolean;
```

### 7.3 Depth Limit

- 默认 `MAX_TAXONOMY_DEPTH = 6`
- 计算移动后子树最大深度，超限禁止

### 7.4 读写状态限制

- 非 Draft 版本（只读）禁止任何 DnD 写操作

错误反馈统一使用：

- 标题：`topicSet.feedback.invalidMoveTitle`
- 文案：`invalidMoveMessage` 或 `depthLimit`

---

## 8. 移动动画规范

### 8.1 动画目标

Drop 成功后：

1. ghost 立即消失
2. 目标树做重排动画
3. 最终稳定在新结构

### 8.2 推荐实现（FLIP）

- duration: `180-220ms`（建议 `200ms`）
- easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- 属性：`transform` + `opacity`（避免 layout 抖动）

---

## 9. 前端状态更新与回滚

### 9.1 标准流程

```text
1) optimistic patch (本地先移动)
2) POST /nodes/{id}/move
3) success -> keep + 局部刷新
4) failure -> rollback + 错误提示
```

### 9.2 Store 契约建议

```ts
moveNodeOptimistic(payload): rollbackToken
commitMove(rollbackToken): void
rollbackMove(rollbackToken): void
```

### 9.3 一致性策略

- 成功后至少刷新受影响父节点 children（源父、目标父）
- 后端返回 path/depth 更新结果时，以后端为准覆盖本地缓存

---

## 10. API 规范（开发对齐）

### 10.1 当前已实现契约（项目现状）

`POST /api/topicsets/nodes/{nodeId}/move`

请求：

```json
{
  "newParentId": "node-223",
  "index": 2
}
```

响应（建议最小）：

```json
{
  "id": "node-101",
  "parentId": "node-223",
  "index": 2,
  "path": "/policy/industry/postdoc",
  "depth": 3,
  "updatedDescendants": 12
}
```

### 10.2 可兼容扩展契约（可选）

如后端后续支持 position 语义，可加：

```json
{
  "targetNodeId": "node-223",
  "position": "INSIDE"
}
```

前端仍建议内部统一到 `newParentId/index` 执行层。

---

## 11. 后端事务要求（必须）

移动操作必须事务化：

1. validate（self/descendant/depth/permission）
2. update `parent_id` + sibling order
3. update moved node `path` + `depth`
4. 批量更新 descendants `path/depth`
5. commit

失败必须整体回滚。

---

## 12. 大规模 taxonomy（1万+）性能规范

必须：

- Virtual Tree（`react-arborist`）
- Lazy Load（按 parentId 加载）
- Node Cache（`nodeMap + childrenByParent`）
- 请求去重（同 parentId 并发只发一次）

推荐指标：

- 首屏渲染 < 200ms（不含网络）
- 拖拽 hover 到反馈 < 16ms/frame
- 10000 节点下滚动保持 55+ FPS

---

## 13. 可测试验收标准（QA Checklist）

1. 只能在 drag handle 启动拖拽。
2. BEFORE/INSIDE/AFTER 三类 drop 可稳定触发。
3. hover 800ms 自动展开并加载子节点。
4. move 到自身/后代/超深度会被阻止且有反馈。
5. drop 成功后结构正确、path 正确、无闪烁。
6. API 失败时 UI 自动回滚，无脏状态。
7. 只读版本拖拽不可用并给出只读提示。
8. 5000+ 节点场景无明显卡顿；1万节点可用。

---

## 14. 与当前代码差异（实施建议）

当前代码已具备：

- 虚拟树与 DnD 基础能力
- drop cursor 与 inside 高亮
- self/descendant/depth 校验
- 只读模式禁拖

建议下一步补齐：

1. `drag-handle` 专属拖拽入口（当前整行可拖，误触风险仍在）。
2. 800ms hover 自动展开的显式计时逻辑。
3. optimistic move + rollback（当前为 API 成功后 reload）。
4. BEFORE/AFTER/INSIDE 语义层接口（便于后续 API 升级与日志分析）。

