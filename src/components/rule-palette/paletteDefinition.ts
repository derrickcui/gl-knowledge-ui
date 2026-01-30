export type BusinessOperatorId =
  | "what.concept"
  | "what.topicRef"
  | "where.body"
  | "where.title"
  | "where.paragraph"
  | "where.sentence"
  | "how.all"
  | "how.any"
  | "how.exclude";

export interface PaletteItem {
  id: BusinessOperatorId;
  title: string;
  description?: string;
  requires?: "concept" | "topic";
}

export interface PaletteGroup {
  title: string;
  items: PaletteItem[];
  defaultOpen?: boolean;
}

export const OPERATOR_PALETTE: PaletteGroup[] = [
  {
    title: "涉及什么内容",
    defaultOpen: true,
    items: [
      {
        id: "what.concept",
        title: "涉及某个业务概念",
        description: "文档内容围绕该概念展开",
        requires: "concept",
      },
      {
        id: "what.topicRef",
        title: "符合已有主题（高级）",
        description: "复用已定义好的主题规则",
        requires: "topic",
      },
    ],
  },
  {
    title: "内容出现的位置",
    defaultOpen: true,
    items: [
      {
        id: "where.body",
        title: "出现在文档正文中（默认）",
      },
      {
        id: "where.title",
        title: "出现在标题中（高级）",
      },
      {
        id: "where.paragraph",
        title: "出现在同一段落中（高级）",
      },
      {
        id: "where.sentence",
        title: "出现在同一句话中（高级）",
      },
    ],
  },
  {
    title: "条件如何组合",
    defaultOpen: true,
    items: [
      {
        id: "how.all",
        title: "同时满足以下所有条件",
      },
      {
        id: "how.any",
        title: "满足以下任意一个条件即可",
      },
      {
        id: "how.exclude",
        title: "排除以下情况",
      },
    ],
  },
];

