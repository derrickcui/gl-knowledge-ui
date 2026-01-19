const SECTIONS = [
  {
    title: "概念条件",
    items: ["添加概念"],
  },
  {
    title: "匹配范围",
    items: [
      "仅该概念",
      "包含下位概念（推荐）",
      "包含上位概念（高级）",
    ],
  },
  {
    title: "条件关系",
    items: [
      "同时满足以下条件",
      "满足任意一个条件",
      "排除以下条件",
    ],
  },
  {
    title: "集合判断",
    items: ["命中任意一个", "命中所有"],
  },
  {
    title: "文本条件",
    items: [
      "包含关键词",
      "完整短语",
      "关键词接近出现",
      "同一句话中出现",
      "同一段落中出现",
    ],
  },
  {
    title: "文本条件（高级）",
    items: [
      "以关键词开头",
      "以关键词结尾",
      "正则匹配",
      "子串匹配",
      "自由文本",
    ],
  },
  {
    title: "内容范围",
    items: ["文档正文", "标题", "标签"],
  },
  {
    title: "评分方式（高级）",
    items: [
      "条件累积评分（推荐）",
      "加权求和",
      "乘积",
      "对数累积",
      "倍增",
      "互补",
      "是/否",
    ],
  },
  {
    title: "词项匹配（系统）",
    items: [
      "词项",
      "通配符",
      "词干",
      "读音",
      "拼写容错",
      "模糊匹配",
      "同义词",
      "大小写敏感",
    ],
  },
];

export function OperatorPalette() {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">
        Operator Palette
      </div>
      <div className="mt-3 space-y-4 text-sm">
        {SECTIONS.map((section) => (
          <details
            key={section.title}
            className="group rounded-md border border-dashed px-2 py-2"
          >
            <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
              {section.title}
            </summary>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
