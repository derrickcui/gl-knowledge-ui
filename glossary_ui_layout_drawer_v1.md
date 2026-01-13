# Glossary & Topic 管理模块 UI 布局设计（单一左侧 Drawer 方案）

> 本文档用于冻结 **Glossary & Topic 管理模块** 的整体 UI 布局方案。  
> 技术栈：**React + Next.js（App Router）**  
> 设计目标：**高密度工作台型产品，最小化空间浪费，最大化主内容区**。

---

## 1. 设计结论（先行）

**采用：单一左侧主导航 Drawer（可折叠 Icon-only）**  
**放弃：Top Nav + Side Bar 双导航结构**

原因：
- Glossary / Topic 属于重运营、重列表、重审批场景
- 用户是“长时间坐下来工作”的专业用户
- 垂直空间极其宝贵

---

## 2. 总体布局结构

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  ▌ G  Search                                           │
│  ▌ ▌ Chat                                             │
│  ▌ ▌ Knowledge Assets                                 │
│  ▌   ├ Glossary                                       │
│  ▌   └ Topics (Coming Soon)                            │
│  ▌ ▌ Rules (GQL, Future)                               │
│  ▌ ▌ Settings                                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Drawer 两种状态

#### 展开（Drawer Out）
```
▌ G   Glossary
▌ ▌   ├ Candidates
▌ ▌   ├ Published
▌ ▌   ├ Audit
```

#### 折叠（Drawer In, Icon-only）
```
▌ G
▌ 🔍
▌ 💬
▌ 📚
▌ ⚙️
```

- Hover 显示 Tooltip
- 点击展开子菜单

---

## 3. 主内容区结构（所有业务页面共用）

```
┌───────────────────────────────────────────────────────┐
│ Breadcrumb / Page Title                                │
│ Knowledge Assets / Glossary / Candidates               │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ Toolbar                                                │
│ Search | Filters | Bulk Actions                        │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ Main Content                                           │
│ Table / Detail / Diff / Approval                       │
└───────────────────────────────────────────────────────┘
```

- **无 Top Nav**
- 所有高度用于“干活”

---

## 4. Glossary 核心页面在该布局下的呈现

### 4.1 Candidates List
- Drawer 保持常驻
- 主区：候选表格 + 批量操作
- 右侧可选 Drawer：Evidence / Doc Preview

### 4.2 Candidate Detail / Review
- 左：Term 编辑卡
- 右：Evidence & Impact
- 保持主内容 100% 宽度

### 4.3 Change / Approval
- Diff 视图占满主区
- 决策 CTA 固定在 Header 区

---

## 5. Topic / TopicSet 的自然扩展位

在 Drawer 中天然存在位置：

```
Knowledge Assets
 ├ Glossary
 ├ Topics
 └ Rules (GQL)
```

V1：
- Topics 仅占位（只读 / Coming Soon）

V2+：
- Topics / TopicSet / GQL 无需改变布局结构
- 仅点亮功能

---

## 6. Next.js App Router 推荐目录结构

```
app/
 ├ layout.tsx            # 全局布局（左侧 Drawer）
 ├ search/
 ├ chat/
 ├ knowledge/
 │   ├ glossary/
 │   │   ├ candidates/
 │   │   ├ published/
 │   │   └ audit/
 │   ├ topics/
 │   └ layout.tsx        # Knowledge 二级布局（可选）
 └ settings/
```

---

## 7. 为什么该布局是“长期正确”的

- 符合 Jira / Linear / Datadog 等专业工具范式
- 对高密度表格、审批、Diff 视图友好
- 不会在 V2 / V3（Topic / GQL）阶段推翻重来
- 与你现有 Search / RAG / DocView Drawer 思路一致

---

## 8. 布局冻结声明（V1）

- 本布局在 V1 冻结
- 后续功能只能在此结构上扩展
- 禁止引入 Top Nav 占用垂直空间

> 本文档是 **Glossary & Topic 管理模块 UI 的布局基准文档**，  
> 用于指导前端实现与未来功能演进。
