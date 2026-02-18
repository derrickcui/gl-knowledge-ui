"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRuleTemplateType,
  createTemplateInitial,
  createTemplateVersion,
  fetchRuleTemplateTypes,
  publishTemplateVersion,
  RuleTemplateTypeListItem,
} from "@/lib/api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import type {
  GroupOperator,
  RuleField,
  StructureRelation,
  TemplateCapabilityState,
} from "@/components/templates/capability-types";
import { useDraggableDialog } from "@/lib/useDraggableDialog";

const STEPS = [
  "基本信息",
  "语义能力",
  "结构能力",
  "作用范围",
  "高级能力",
  "说明模板",
  "预览发布",
] as const;

type ExplainState = {
  success: string;
  fail: string;
};

const DEFAULT_CAPABILITY: TemplateCapabilityState = {
  semantic: {
    allowModes: ["AND"],
    allowThreshold: false,
    allowWeighted: false,
  },
  structure: {
    allowRelation: ["NONE"],
    allowOrder: false,
    allowDistance: false,
  },
  where: {
    allowFields: ["CONTENT"],
  },
  advanced: {
    allowNot: false,
    allowExcludeGroup: false,
    allowTopicRef: false,
  },
};

function toggleItem<T extends string>(list: T[], item: T, checked: boolean): T[] {
  if (checked) return list.includes(item) ? list : [...list, item];
  return list.filter((it) => it !== item);
}

export default function TemplateCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isEnterprise, setIsEnterprise] = useState(true);
  const [capability, setCapability] = useState<TemplateCapabilityState>(DEFAULT_CAPABILITY);
  const [explain, setExplain] = useState<ExplainState>({
    success: "当文档满足以下条件时，将被视为【____】",
    fail: "未满足必要条件",
  });
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);

  const canNext = useMemo(() => {
    if (step === 0) return !!name.trim() && !!description.trim() && !!category.trim();
    return true;
  }, [step, name, description, category]);

  async function ensureTemplateCreated(): Promise<number | null> {
    if (templateId) return templateId;
    const result = await createTemplateInitial({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
    });
    if (!result.data) {
      setFeedback({
        type: "error",
        title: "创建模板失败",
        message: result.error ?? "Request failed",
      });
      return null;
    }
    setTemplateId(result.data.id);
    return result.data.id;
  }

  async function handleSaveDraftVersion() {
    setBusy(true);
    setFeedback({ type: "info", title: "正在保存草稿版本..." });
    const id = await ensureTemplateCreated();
    if (!id) {
      setBusy(false);
      return;
    }
    const versionRes = await createTemplateVersion(id, {
      capability: capability as unknown as Record<string, unknown>,
      explain,
    });
    if (!versionRes.data) {
      setFeedback({
        type: "error",
        title: "保存失败",
        message: versionRes.error ?? "Request failed",
      });
      setBusy(false);
      return;
    }
    setFeedback({ type: "success", title: "草稿版本已保存" });
    setBusy(false);
  }

  async function handlePublish() {
    setBusy(true);
    setFeedback({ type: "info", title: "正在发布版本..." });
    const id = await ensureTemplateCreated();
    if (!id) {
      setBusy(false);
      return;
    }
    const versionRes = await createTemplateVersion(id, {
      capability: capability as unknown as Record<string, unknown>,
      explain,
    });
    if (!versionRes.data) {
      setFeedback({
        type: "error",
        title: "发布失败",
        message: versionRes.error ?? "Request failed",
      });
      setBusy(false);
      return;
    }
    const version = versionRes.data.version;
    if (version != null) {
      await publishTemplateVersion(id, String(version));
    }
    setFeedback({ type: "success", title: "模板版本已发布" });
    router.push(`/knowledge/templates/${encodeURIComponent(String(id))}`);
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">创建规则模板</h1>
      </div>

      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div className="rounded-md border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((item, idx) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1 ${
                idx === step
                  ? "bg-black text-white"
                  : idx < step
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-md border bg-white p-4">
        {step === 0 && (
          <BasicInfoSection
            name={name}
            description={description}
            category={category}
            isEnterprise={isEnterprise}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onCategoryChange={setCategory}
            onEnterpriseChange={setIsEnterprise}
            disabled={busy}
          />
        )}
        {step === 1 && <SemanticSection capability={capability} onChange={setCapability} />}
        {step === 2 && <StructureSection capability={capability} onChange={setCapability} />}
        {step === 3 && <WhereSection capability={capability} onChange={setCapability} />}
        {step === 4 && <AdvancedSection capability={capability} onChange={setCapability} />}
        {step === 5 && <ExplainSection explain={explain} onChange={setExplain} />}
        {step === 6 && <PreviewSection capability={capability} explain={explain} />}
      </div>

      <div className="flex items-center justify-between rounded-md border bg-white p-4">
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          disabled={step === 0 || busy}
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
        >
          上一步
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
            disabled={!canNext || busy}
            onClick={() => setStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
          >
            下一步
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 rounded-md border px-3 text-sm"
              disabled={busy}
              onClick={handleSaveDraftVersion}
            >
              保存草稿
            </button>
            <button
              type="button"
              className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
              disabled={busy}
              onClick={handlePublish}
            >
              发布版本
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BasicInfoSection(props: {
  name: string;
  description: string;
  category: string;
  isEnterprise: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onEnterpriseChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">基本信息</h2>
      <div className="space-y-2">
        <label className="text-sm font-medium">模板名称</label>
        <input
          className="h-9 w-full rounded-md border px-3 text-sm"
          value={props.name}
          disabled={props.disabled}
          onChange={(e) => props.onNameChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">模板说明</label>
        <textarea
          className="min-h-[96px] w-full rounded-md border px-3 py-2 text-sm"
          value={props.description}
          disabled={props.disabled}
          onChange={(e) => props.onDescriptionChange(e.target.value)}
        />
      </div>
      <CategoryPicker
        value={props.category}
        onChange={props.onCategoryChange}
        disabled={props.disabled}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={props.isEnterprise}
          disabled={props.disabled}
          onChange={(e) => props.onEnterpriseChange(e.target.checked)}
        />
        是否企业通用
      </label>
    </section>
  );
}

function CategoryPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<RuleTemplateTypeListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createDialogDrag = useDraggableDialog(createOpen);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const res = await fetchRuleTemplateTypes(query.trim() ? { search: query.trim() } : undefined);
      if (!active) return;
      if (res.data) {
        setOptions(res.data);
      } else {
        setOptions([]);
        setError(res.error ?? "分类加载失败");
      }
      setLoading(false);
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  async function handleCreateType() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    setCreateError(null);
    const result = await createRuleTemplateType({
      name: trimmed,
      description: newDescription.trim() || undefined,
      createdBy: "ui-user",
    });
    if (!result.data) {
      setCreateError(result.error ?? "创建分类失败");
      setCreating(false);
      return;
    }
    onChange(trimmed);
    setQuery(trimmed);
    setCreateOpen(false);
    setNewName("");
    setNewDescription("");
    setCreating(false);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">分类</label>
      <div className="relative flex items-center gap-2">
        <input
          className="h-9 flex-1 rounded-md border px-3 text-sm"
          value={query}
          disabled={disabled}
          placeholder="输入分类后搜索并选择"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            setOpen(true);
          }}
        />
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            setCreateError(null);
            setNewName(query.trim());
            setNewDescription("");
            setCreateOpen(true);
          }}
        >
          新增
        </button>

        {open && (
          <div className="absolute left-0 top-10 z-20 max-h-64 w-[calc(100%-84px)] overflow-auto rounded-md border bg-white p-1 shadow-lg">
            {loading && <div className="px-2 py-2 text-xs text-slate-500">搜索中...</div>}
            {!loading && error && <div className="px-2 py-2 text-xs text-red-600">{error}</div>}
            {!loading && !error && options.length === 0 && (
              <div className="px-2 py-2 text-xs text-slate-500">未找到分类</div>
            )}
            {!loading &&
              !error &&
              options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    onChange(item.name);
                    setQuery(item.name);
                    setOpen(false);
                  }}
                >
                  {item.name}
                </button>
              ))}
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="w-[420px] rounded-md bg-white p-4 shadow-xl"
            style={createDialogDrag.style}
          >
            <div
              className={`select-none text-sm font-semibold ${
                createDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              {...createDialogDrag.handleProps}
            >
              新增分类
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs text-slate-500">分类名称</label>
              <input
                className="h-9 w-full rounded-md border px-3 text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <label className="text-xs text-slate-500">描述</label>
              <textarea
                className="min-h-[84px] w-full rounded-md border px-3 py-2 text-sm"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="请输入分类描述（可选）"
              />
              {createError && <div className="text-xs text-red-600">{createError}</div>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-8 rounded-md border px-3 text-xs"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                取消
              </button>
              <button
                type="button"
                className="h-8 rounded-md bg-black px-3 text-xs text-white disabled:opacity-60"
                onClick={handleCreateType}
                disabled={creating || !newName.trim()}
              >
                {creating ? "创建中..." : "确认新增"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SemanticSection({
  capability,
  onChange,
}: {
  capability: TemplateCapabilityState;
  onChange: (next: TemplateCapabilityState) => void;
}) {
  const modes: { value: GroupOperator; label: string }[] = [
    { value: "AND", label: "必须满足全部条件" },
    { value: "OR", label: "满足任意条件" },
    { value: "ACCRUE", label: "满足越多越容易成立" },
    { value: "LOGSUM", label: "至少满足 N 个" },
    { value: "WEIGHTED", label: "综合权重判断" },
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">语义能力</h2>
      <div className="space-y-2 text-sm">
        {modes.map((mode) => (
          <label key={mode.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.semantic.allowModes.includes(mode.value)}
              onChange={(e) =>
                onChange({
                  ...capability,
                  semantic: {
                    ...capability.semantic,
                    allowModes: toggleItem(capability.semantic.allowModes, mode.value, e.target.checked),
                  },
                })
              }
            />
            {mode.label}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={capability.semantic.allowThreshold}
          onChange={(e) =>
            onChange({
              ...capability,
              semantic: { ...capability.semantic, allowThreshold: e.target.checked },
            })
          }
        />
        允许设置至少满足数量
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={capability.semantic.allowWeighted}
          onChange={(e) =>
            onChange({
              ...capability,
              semantic: { ...capability.semantic, allowWeighted: e.target.checked },
            })
          }
        />
        允许设置权重
      </label>
    </section>
  );
}

function StructureSection({
  capability,
  onChange,
}: {
  capability: TemplateCapabilityState;
  onChange: (next: TemplateCapabilityState) => void;
}) {
  const relations: { value: StructureRelation; label: string }[] = [
    { value: "NONE", label: "无特殊结构" },
    { value: "NEAR", label: "彼此靠近" },
    { value: "SENTENCE", label: "同一句中" },
    { value: "PARAGRAPH", label: "同一段中" },
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">结构能力</h2>
      <div className="space-y-2 text-sm">
        {relations.map((relation) => (
          <label key={relation.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.structure.allowRelation.includes(relation.value)}
              onChange={(e) =>
                onChange({
                  ...capability,
                  structure: {
                    ...capability.structure,
                    allowRelation: toggleItem(capability.structure.allowRelation, relation.value, e.target.checked),
                  },
                })
              }
            />
            {relation.label}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={capability.structure.allowOrder}
          onChange={(e) =>
            onChange({
              ...capability,
              structure: { ...capability.structure, allowOrder: e.target.checked },
            })
          }
        />
        允许顺序判断
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={capability.structure.allowDistance}
          onChange={(e) =>
            onChange({
              ...capability,
              structure: { ...capability.structure, allowDistance: e.target.checked },
            })
          }
        />
        允许距离设置
      </label>
    </section>
  );
}

function WhereSection({
  capability,
  onChange,
}: {
  capability: TemplateCapabilityState;
  onChange: (next: TemplateCapabilityState) => void;
}) {
  const fields: { value: RuleField; label: string }[] = [
    { value: "CONTENT", label: "文档正文" },
    { value: "TITLE", label: "标题" },
    { value: "COLUMN", label: "栏目字段" },
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">作用范围</h2>
      <div className="space-y-2 text-sm">
        {fields.map((field) => (
          <label key={field.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={capability.where.allowFields.includes(field.value)}
              onChange={(e) =>
                onChange({
                  ...capability,
                  where: {
                    allowFields: toggleItem(capability.where.allowFields, field.value, e.target.checked),
                  },
                })
              }
            />
            {field.label}
          </label>
        ))}
      </div>
    </section>
  );
}

function AdvancedSection({
  capability,
  onChange,
}: {
  capability: TemplateCapabilityState;
  onChange: (next: TemplateCapabilityState) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">高级能力</h2>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={capability.advanced.allowNot}
          onChange={(e) =>
            onChange({
              ...capability,
              advanced: { ...capability.advanced, allowNot: e.target.checked },
            })
          }
        />
        允许单条件排除
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={capability.advanced.allowExcludeGroup}
          onChange={(e) =>
            onChange({
              ...capability,
              advanced: { ...capability.advanced, allowExcludeGroup: e.target.checked },
            })
          }
        />
        允许整组排除
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={capability.advanced.allowTopicRef}
          onChange={(e) =>
            onChange({
              ...capability,
              advanced: { ...capability.advanced, allowTopicRef: e.target.checked },
            })
          }
        />
        允许引用主题
      </label>
    </section>
  );
}

function ExplainSection({
  explain,
  onChange,
}: {
  explain: ExplainState;
  onChange: (next: ExplainState) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">说明模板</h2>
      <div className="space-y-2">
        <label className="text-sm font-medium">成功说明模板</label>
        <textarea
          className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
          value={explain.success}
          onChange={(e) => onChange({ ...explain, success: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">失败说明模板</label>
        <textarea
          className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
          value={explain.fail}
          onChange={(e) => onChange({ ...explain, fail: e.target.value })}
        />
      </div>
    </section>
  );
}

function PreviewSection({
  capability,
  explain,
}: {
  capability: TemplateCapabilityState;
  explain: ExplainState;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">预览发布</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="text-sm font-semibold">能力 JSON 预览</div>
          <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs">
            {JSON.stringify(capability, null, 2)}
          </pre>
        </div>
        <div className="rounded-md border p-3 text-sm">
          <div className="font-semibold">规则页效果预览</div>
          <div className="mt-2 text-xs text-slate-600">
            语义模式数量: {capability.semantic.allowModes.length}
          </div>
          <div className="text-xs text-slate-600">
            结构关系数量: {capability.structure.allowRelation.length}
          </div>
          <div className="text-xs text-slate-600">
            作用范围数量: {capability.where.allowFields.length}
          </div>
          <div className="mt-3 rounded-md border bg-slate-50 p-2">
            <div className="text-xs font-semibold text-slate-500">成功说明模板</div>
            <div className="mt-1 text-xs">{explain.success || "-"}</div>
          </div>
          <div className="mt-2 rounded-md border bg-slate-50 p-2">
            <div className="text-xs font-semibold text-slate-500">失败说明模板</div>
            <div className="mt-1 text-xs">{explain.fail || "-"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
