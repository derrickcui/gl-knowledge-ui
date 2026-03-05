import { RadarDimension, TrendRange } from "@/store/useSemanticGovernanceStore";

export const radarDimensions: RadarDimension[] = [
  {
    key: "talent",
    label: "人才类别",
    value: 92,
    detail: [
      { name: "博士学历", count: 1200 },
      { name: "海外人才", count: 800 },
      { name: "未分类", count: 200 },
    ],
  },
  {
    key: "policy",
    label: "政策类型",
    value: 85,
    detail: [
      { name: "补贴", count: 610 },
      { name: "引进", count: 310 },
      { name: "未分类", count: 95 },
    ],
  },
  {
    key: "time",
    label: "时间维度",
    value: 76,
    detail: [
      { name: "发布时间", count: 3510 },
      { name: "执行期", count: 1810 },
      { name: "缺失时间", count: 420 },
    ],
  },
  {
    key: "region",
    label: "区域维度",
    value: 68,
    detail: [
      { name: "省级", count: 1300 },
      { name: "市级", count: 950 },
      { name: "未知区域", count: 520 },
    ],
  },
];

export const trendSeries: Record<TrendRange, Record<string, number[]>> = {
  "7d": {
    博士学历: [640, 680, 710, 760, 740, 790, 820],
    海外人才: [280, 300, 315, 330, 350, 370, 384],
    补贴政策: [430, 470, 490, 520, 560, 590, 610],
  },
  "14d": {
    博士学历: [550, 560, 580, 600, 620, 640, 660, 680, 700, 730, 750, 770, 800, 820],
    海外人才: [210, 220, 230, 245, 260, 270, 280, 290, 305, 320, 335, 350, 365, 384],
    补贴政策: [320, 335, 350, 370, 390, 410, 430, 450, 470, 500, 530, 560, 590, 610],
  },
  "30d": {
    博士学历: [390, 405, 415, 430, 442, 450, 465, 480, 495, 510, 525, 540, 560, 575, 590, 610, 625, 638, 650, 665, 682, 700, 718, 732, 744, 760, 776, 790, 805, 820],
    海外人才: [145, 150, 158, 165, 170, 176, 180, 188, 194, 200, 208, 214, 220, 228, 235, 242, 250, 260, 270, 278, 286, 294, 305, 318, 330, 341, 352, 362, 373, 384],
    补贴政策: [230, 240, 248, 260, 270, 280, 292, 305, 318, 330, 344, 356, 369, 382, 396, 410, 424, 438, 452, 466, 480, 494, 508, 523, 538, 552, 566, 581, 596, 610],
  },
};

export const topicColumns = ["博士", "海外", "青年", "补贴", "引进"];
export const heatRows = ["doc001", "doc002", "doc003", "doc004", "doc005"];
export const heatMatrix = [
  [0.92, 0.1, 0.06, 0.84, 0.09],
  [0.12, 0.88, 0.82, 0.15, 0.05],
  [0.89, 0.83, 0.21, 0.18, 0.74],
  [0.35, 0.1, 0.9, 0.51, 0.64],
  [0.22, 0.68, 0.48, 0.92, 0.31],
];

export const eventTemplates = [
  "新文档 doc123 标注完成",
  "Topic 青年人才 覆盖率下降 2.1%",
  "Topic 博士学历 漂移预警触发",
  "增量标注恢复，队列清空",
];

export const kpiCards = [
  { label: "Docs", value: "128,420", note: "文档总规模" },
  { label: "Topics", value: "42", note: "已部署主题" },
  { label: "Coverage", value: "98.2%", note: "标注覆盖率" },
  { label: "Drift Alerts", value: "3", note: "待治理波动" },
];
