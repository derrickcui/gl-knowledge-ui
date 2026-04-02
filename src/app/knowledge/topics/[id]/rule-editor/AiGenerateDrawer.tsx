type AiGenerateDrawerProps = {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  warnings?: string[];
  onClose: () => void;
  onSubmit: (payload: { description: string; provider?: string | null; model?: string | null }) => void;
};

export function AiGenerateDrawer({
  open,
  busy = false,
  error = null,
  warnings = [],
  onClose,
  onSubmit,
}: AiGenerateDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">AI 生成主题</div>
            <div className="mt-1 text-sm text-slate-500">输入自然语言描述，结果直接回写当前规则树。</div>
          </div>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={onClose}
            disabled={busy}
          >
            关闭
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const description = String(form.get("description") ?? "").trim();
            if (!description) return;
            onSubmit({
              description,
              provider: String(form.get("provider") ?? "").trim() || null,
              model: String(form.get("model") ?? "").trim() || null,
            });
          }}
        >
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-700">描述</div>
            <textarea
              name="description"
              rows={7}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none ring-0"
              placeholder="例如：识别博士人才引进补贴政策，重点关注标题与正文中的申报、认定、资助、津贴等条件。"
              disabled={busy}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Provider</span>
              <input
                name="provider"
                className="h-10 w-full rounded-md border px-3 text-sm"
                placeholder="可选"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Model</span>
              <input
                name="model"
                className="h-10 w-full rounded-md border px-3 text-sm"
                placeholder="可选"
                disabled={busy}
              />
            </label>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            数据集上下文沿用当前 topic 编辑页已有能力与运行环境，不新增页面状态。
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {warnings.map((item) => (
                <div key={item}>- {item}</div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
              onClick={onClose}
              disabled={busy}
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded border border-sky-300 bg-sky-50 px-4 py-2 text-sm text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
            >
              {busy ? "生成中..." : "生成规则"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
