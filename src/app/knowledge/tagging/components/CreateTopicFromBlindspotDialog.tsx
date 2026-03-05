"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchTemplatesList, RuleTemplateItem } from "@/lib/api";
import { createTopic } from "@/lib/topic-api";

export type CreateTopicSeed = {
  docId: string;
  name: string;
  description: string;
};

type CreateTopicStep = "template" | "details";

type CreateTopicFromBlindspotDialogProps = {
  seed: CreateTopicSeed | null;
  onClose: () => void;
  onCreated: (topicId: string) => void;
};

export function CreateTopicFromBlindspotDialog(props: CreateTopicFromBlindspotDialogProps) {
  const { seed, onClose, onCreated } = props;
  const open = Boolean(seed);

  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templates, setTemplates] = useState<RuleTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [createTopicStep, setCreateTopicStep] = useState<CreateTopicStep>("template");
  const [topicNameInput, setTopicNameInput] = useState("");
  const [topicDescriptionInput, setTopicDescriptionInput] = useState("");
  const [createTopicBusy, setCreateTopicBusy] = useState(false);
  const [createTopicError, setCreateTopicError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !seed) return;
    setTemplateQuery("");
    setSelectedTemplateId("");
    setCreateTopicStep("template");
    setTopicNameInput(seed.name);
    setTopicDescriptionInput(seed.description);
    setCreateTopicError(null);
    setTemplateError(null);
  }, [open, seed]);

  useEffect(() => {
    if (!open) return;
    if (templates.length) return;

    let active = true;
    (async () => {
      setTemplateLoading(true);
      const res = await fetchTemplatesList({ status: "PUBLISHED" });
      if (!active) return;
      if (!res.data) {
        setTemplateError(res.error ?? "failed to load templates");
        setTemplateLoading(false);
        return;
      }
      setTemplates(res.data);
      setTemplateError(null);
      setTemplateLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [open, templates.length]);

  const filteredTemplates = useMemo(() => {
    const keyword = templateQuery.trim().toLowerCase();
    if (!keyword) return templates;
    return templates.filter((tpl) => {
      const text = `${tpl.name ?? ""} ${tpl.description ?? ""}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [templates, templateQuery]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((tpl) => String(tpl.id) === selectedTemplateId) ?? null;
  }, [templates, selectedTemplateId]);

  async function handleCreateTopicFromModal() {
    if (!seed || !selectedTemplateId) return;
    const name = topicNameInput.trim();
    const description = topicDescriptionInput.trim();
    if (!name) {
      setCreateTopicError("主题名称不能为空");
      return;
    }
    if (!description) {
      setCreateTopicError("业务说明不能为空");
      return;
    }

    setCreateTopicBusy(true);
    setCreateTopicError(null);
    const res = await createTopic({
      name,
      description,
      template: selectedTemplateId,
    });
    setCreateTopicBusy(false);
    if (!res.data) {
      setCreateTopicError(res.error ?? "创建主题失败");
      return;
    }
    onClose();
    onCreated(res.data.id);
  }

  if (!open || !seed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[640px] max-w-[calc(100vw-32px)] rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {createTopicStep === "template" ? "新建主题 · 选择模板" : "新建主题 · 基本信息"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              盲区文档：{seed.docId} · {createTopicStep === "template" ? "步骤 1/2" : "步骤 2/2"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-slate-300 px-3 text-xs text-slate-600 hover:bg-slate-100"
          >
            关闭
          </button>
        </div>

        {createTopicStep === "template" ? (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div>
              推荐主题名：<span className="text-slate-900">{seed.name}</span>
            </div>
            <div className="mt-1 text-slate-500">{seed.description}</div>
          </div>
        ) : null}

        {createTopicStep === "template" ? (
          <>
            <input
              value={templateQuery}
              onChange={(event) => setTemplateQuery(event.target.value)}
              placeholder="搜索模板"
              className="mt-4 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />

            {templateLoading ? (
              <div className="mt-3 text-sm text-slate-500">模板加载中...</div>
            ) : null}
            {templateError ? (
              <div className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {templateError}
              </div>
            ) : null}

            <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
              {!filteredTemplates.length && !templateLoading ? (
                <div className="text-sm text-slate-500">未找到模板</div>
              ) : null}
              {filteredTemplates.map((tpl) => {
                const id = String(tpl.id);
                const selected = selectedTemplateId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedTemplateId(id)}
                    className={`w-full rounded-md border p-3 text-left ${
                      selected
                        ? "ring-2 ring-black"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-900">{tpl.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{tpl.description}</div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="text-sm text-slate-500">
              已选模板：<span className="font-medium text-slate-700">{selectedTemplate?.name ?? selectedTemplateId}</span>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-800">主题名称*</div>
              <input
                value={topicNameInput}
                onChange={(event) => setTopicNameInput(event.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                placeholder="填写主题名称"
              />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-800">业务说明*</div>
              <textarea
                value={topicDescriptionInput}
                onChange={(event) => setTopicDescriptionInput(event.target.value)}
                className="min-h-[96px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                placeholder="说明这个主题用于什么"
              />
            </div>
            {createTopicError ? (
              <div className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {createTopicError}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {createTopicStep === "template" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-md border px-3 text-sm"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!selectedTemplateId}
                onClick={() => setCreateTopicStep("details")}
                className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
              >
                下一步
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCreateTopicStep("template")}
                className="h-9 rounded-md border px-3 text-sm"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-md border px-3 text-sm"
              >
                取消
              </button>
              <button
                type="button"
                disabled={
                  createTopicBusy ||
                  !selectedTemplateId ||
                  !topicNameInput.trim() ||
                  !topicDescriptionInput.trim()
                }
                onClick={handleCreateTopicFromModal}
                className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
              >
                {createTopicBusy ? "创建中..." : "创建并进入"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

