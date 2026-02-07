import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import {
  createRuleTemplateType,
  fetchRuleTemplateTypes,
  RuleTemplateTypeListItem,
  updateRuleTemplateType,
} from "@/lib/api";

type TemplateType = string;

type AllowedModes = {
  all: boolean;
  accrue: boolean;
  partial: boolean;
  weighted: boolean;
};

type PositionRules = {
  any: boolean;
  paragraph: boolean;
  sentence: boolean;
  order: boolean;
  near: boolean;
};

type TemplateCreateStepsProps = {
  step: number;
  name: string;
  purpose: string;
  type: TemplateType;
  allowedModes: AllowedModes;
  importanceAllowed: boolean;
  positionRules: PositionRules;
  explainPositive: string;
  explainNegative: string;
  onNameChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onTypeChange: (value: TemplateType) => void;
  onAllowedModeChange: (key: keyof AllowedModes, value: boolean) => void;
  onImportanceAllowedChange: (value: boolean) => void;
  onPositionRuleChange: (key: keyof PositionRules, value: boolean) => void;
  onExplainPositiveChange: (value: string) => void;
  onExplainNegativeChange: (value: string) => void;
};

export function TemplateCreateSteps(props: TemplateCreateStepsProps) {
  const {
    step,
    name,
    purpose,
    type,
    allowedModes,
    importanceAllowed,
    positionRules,
    explainPositive,
    explainNegative,
    onNameChange,
    onPurposeChange,
    onTypeChange,
    onAllowedModeChange,
    onImportanceAllowedChange,
    onPositionRuleChange,
    onExplainPositiveChange,
    onExplainNegativeChange,
  } = props;
  const [typesAll, setTypesAll] = useState<RuleTemplateTypeListItem[]>([]);
  const [typesOptions, setTypesOptions] = useState<RuleTemplateTypeListItem[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState(type ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [manageError, setManageError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [localDisabledIds, setLocalDisabledIds] = useState<string[]>([]);
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const normalizedTypeValue = String(type ?? "").trim();

  useEffect(() => {
    if (!isEditingQuery) {
      setTypeQuery(normalizedTypeValue);
    }
  }, [isEditingQuery, normalizedTypeValue]);

  useEffect(() => {
    let mounted = true;
    async function loadTypes() {
      setTypesLoading(true);
      setTypesError(null);
      const res = await fetchRuleTemplateTypes();
      if (!mounted) return;
      if (res.data) {
        setTypesAll(res.data);
        setTypesOptions(res.data);
      } else {
        setTypesError(res.error ?? t("templates.typeManage.loadFailed"));
      }
      setTypesLoading(false);
    }
    loadTypes();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!normalizedTypeValue && typesAll.length > 0) {
      onTypeChange(typesAll[0].name);
    }
  }, [normalizedTypeValue, onTypeChange, typesAll]);

  useEffect(() => {
    const trimmed = typeQuery.trim();
    let active = true;
    const timer = setTimeout(async () => {
      setTypesLoading(true);
      setTypesError(null);
      const res = await fetchRuleTemplateTypes(
        trimmed ? { search: trimmed } : undefined
      );
      if (!active) return;
      if (res.data) {
        setTypesOptions(res.data);
        if (!trimmed) {
          setTypesAll(res.data);
        }
      } else {
        setTypesError(res.error ?? t("templates.typeManage.loadFailed"));
      }
      setTypesLoading(false);
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dropdownOpen, typeQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const normalizedTypeKey = (value: string) => value.trim().toLowerCase();
  const typeExists = (value: string) =>
    typesAll.some(
      (item) => normalizedTypeKey(item.name) === normalizedTypeKey(value)
    );
  const resolveTypeCount = (item: RuleTemplateTypeListItem) =>
    item.templateCount ?? item.templatesCount ?? item.usageCount ?? 0;
  const resolveTypeEnabled = (item: RuleTemplateTypeListItem) => {
    if (localDisabledIds.includes(item.id)) return false;
    if (typeof item.enabled === "boolean") return item.enabled;
    if (typeof item.disabled === "boolean") return !item.disabled;
    if (item.status) {
      const raw = String(item.status).toUpperCase();
      if (raw === "DISABLED" || raw === "INACTIVE") return false;
      if (raw === "ENABLED" || raw === "ACTIVE") return true;
    }
    return true;
  };
  const sortedTypes = useMemo(
    () => [...typesAll].sort((a, b) => a.name.localeCompare(b.name)),
    [typesAll]
  );
  const filteredTypes = useMemo(() => {
    const needle = typeQuery.trim().toLowerCase();
    const base = [...typesOptions].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    if (!needle) return base;
    return base.filter((item) =>
      item.name.toLowerCase().includes(needle)
    );
  }, [typesOptions, typeQuery]);

  async function refreshTypes() {
    const res = await fetchRuleTemplateTypes();
    if (res.data) {
      setTypesAll(res.data);
      if (!typeQuery.trim()) {
        setTypesOptions(res.data);
      }
      setTypesError(null);
    } else {
      setTypesError(res.error ?? t("templates.typeManage.loadFailed"));
    }
  }

  async function handleCreateType() {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    setManageError(null);
    if (typeExists(trimmed)) {
      setManageError(t("templates.typeManage.exists"));
      onTypeChange(trimmed);
      setTypeQuery(trimmed);
      return;
    }
    const res = await createRuleTemplateType({
      name: trimmed,
      createdBy: "ui-user",
    });
    if (!res.data) {
      setManageError(res.error ?? t("templates.typeManage.createFailed"));
      return;
    }
    const next: RuleTemplateTypeListItem = {
      id: res.data.id,
      name: trimmed,
      createdBy: "ui-user",
      createdAt: new Date().toISOString(),
    };
    setTypesAll((prev) => [next, ...prev]);
    if (!typeQuery.trim()) {
      setTypesOptions((prev) => [next, ...prev]);
    }
    setNewTypeName("");
    onTypeChange(trimmed);
    setTypeQuery(trimmed);
  }

  async function handleRenameType(item: RuleTemplateTypeListItem) {
    const nextName = editingName.trim();
    if (!nextName) return;
    if (typeExists(nextName) && normalizedTypeKey(nextName) !== normalizedTypeKey(item.name)) {
      setManageError(t("templates.typeManage.exists"));
      return;
    }
    const res = await updateRuleTemplateType(item.id, { name: nextName });
    if (!res.data) {
      setManageError(res.error ?? t("templates.typeManage.renameFailed"));
      return;
    }
    setTypesAll((prev) =>
      prev.map((entry) =>
        entry.id === item.id ? { ...entry, name: nextName } : entry
      )
    );
    setTypesOptions((prev) =>
      prev.map((entry) =>
        entry.id === item.id ? { ...entry, name: nextName } : entry
      )
    );
    if (normalizedTypeKey(type) === normalizedTypeKey(item.name)) {
      onTypeChange(nextName);
      setTypeQuery(nextName);
    }
    setEditingId(null);
    setEditingName("");
  }

  async function handleToggleType(item: RuleTemplateTypeListItem) {
    const nextEnabled = !resolveTypeEnabled(item);
    const payload: Record<string, unknown> = {};
    if (item.enabled !== undefined) payload.enabled = nextEnabled;
    else if (item.disabled !== undefined) payload.disabled = !nextEnabled;
    else if (item.status) {
      payload.status = nextEnabled ? "ENABLED" : "DISABLED";
    }
    if (Object.keys(payload).length > 0) {
      const res = await updateRuleTemplateType(item.id, payload);
      if (!res.data) {
        setManageError(res.error ?? t("templates.typeManage.toggleFailed"));
        return;
      }
      await refreshTypes();
    } else {
      setLocalDisabledIds((prev) => {
        const set = new Set(prev);
        if (nextEnabled) set.delete(item.id);
        else set.add(item.id);
        return Array.from(set);
      });
    }
  }

  if (step === 0) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <div className="text-base font-semibold">
              {t("templates.create.step1.title")}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("templates.create.step1.subtitle")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("templates.create.step1.nameLabel")}
            </label>
            <input
              type="text"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder={t("templates.create.step1.namePlaceholder")}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("templates.create.step1.purposeLabel")}
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={t("templates.create.step1.purposePlaceholder")}
              value={purpose}
              onChange={(event) => onPurposeChange(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("templates.create.step1.typeLabel")}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  ref={inputRef}
                  type="text"
                  className="h-9 w-full rounded-md border bg-background px-3 pr-8 text-sm"
                  placeholder={t("templates.create.step1.typePlaceholder")}
                  value={typeQuery}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setTypeQuery(nextValue);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsEditingQuery(true);
                    setDropdownOpen(true);
                  }}
                  onBlur={() => {
                    setIsEditingQuery(false);
                    if (!typeQuery.trim()) {
                      setTypeQuery(normalizedTypeValue);
                    }
                  }}
                />
                {typeQuery.trim().length > 0 && (
                  <button
                    type="button"
                    aria-label={t("templates.typeManage.clear")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setIsEditingQuery(true);
                      setTypeQuery("");
                      setDropdownOpen(true);
                    }}
                  >
                    ×
                  </button>
                )}
                {dropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white p-1 text-sm shadow-lg"
                  >
                    {typesLoading && (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        {t("templates.typeManage.loading")}
                      </div>
                    )}
                    {!typesLoading && typesError && (
                      <div className="px-2 py-2 text-xs text-red-600">
                        {typesError}
                      </div>
                    )}
                    {!typesLoading &&
                      !typesError &&
                      filteredTypes.length === 0 && (
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          {t("templates.typeManage.empty")}
                        </div>
                      )}
                    {!typesLoading &&
                      !typesError &&
                      filteredTypes.map((item) => {
                        const enabled = resolveTypeEnabled(item);
                        const isSelected =
                          normalizedTypeKey(item.name) ===
                          normalizedTypeKey(typeQuery);
                        return (
                        <button
                          key={item.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-muted ${
                            isSelected ? "bg-muted" : ""
                          } ${!enabled ? "cursor-not-allowed opacity-50" : ""}`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            if (!enabled) return;
                            setIsEditingQuery(false);
                            onTypeChange(item.name);
                            setTypeQuery(item.name);
                            setDropdownOpen(false);
                          }}
                          onClick={() => {
                            if (!enabled) return;
                            onTypeChange(item.name);
                            setTypeQuery(item.name);
                            setDropdownOpen(false);
                          }}
                          >
                            <span>{item.name}</span>
                            {!enabled && (
                              <span className="text-[11px] text-amber-600">
                                {t("templates.typeManage.disabled")}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="h-9 rounded-md border px-3 text-sm"
                onClick={() => setManageOpen(true)}
              >
                {t("templates.typeManage.newButton")}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              {t("templates.typeManage.helper")}
            </div>
          </div>
        </div>
        {manageOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-[720px] max-w-[92vw] rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">
                    {t("templates.typeManage.title")}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("templates.typeManage.subtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-sm"
                  onClick={() => setManageOpen(false)}
                >
                  {t("templates.typeManage.close")}
                </button>
              </div>

              <div className="mt-6 rounded-md border p-4">
                <div className="text-sm font-medium">
                  {t("templates.typeManage.addTitle")}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                    placeholder={t("templates.typeManage.addPlaceholder")}
                    value={newTypeName}
                    onChange={(event) => setNewTypeName(event.target.value)}
                  />
                  <button
                    type="button"
                    className="h-9 rounded-md bg-black px-4 text-sm text-white"
                    onClick={handleCreateType}
                  >
                    {t("templates.typeManage.addAction")}
                  </button>
                </div>
                {manageError && (
                  <div className="mt-2 text-xs text-red-600">
                    {manageError}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-md border p-4">
                <div className="text-sm font-medium">
                  {t("templates.typeManage.listTitle")}
                </div>
                <div className="mt-4 space-y-4">
                  {typesLoading && (
                    <div className="text-sm text-muted-foreground">
                      {t("templates.typeManage.loading")}
                    </div>
                  )}
                  {!typesLoading && typesError && (
                    <div className="text-sm text-red-600">
                      {typesError}
                    </div>
                  )}
                  {!typesLoading && !typesError && sortedTypes.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      {t("templates.typeManage.empty")}
                    </div>
                  )}
                  {!typesLoading &&
                    !typesError &&
                    sortedTypes.map((item, index) => {
                      const enabled = resolveTypeEnabled(item);
                      const isEditing = editingId === item.id;
                      return (
                        <div
                          key={`${item.id ?? item.name ?? "type"}-${index}`}
                          className="rounded-md border px-4 py-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">
                                {item.name}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {t("templates.typeManage.templateCount", {
                                    count: resolveTypeCount(item),
                                  })}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {t("templates.typeManage.createdBy", {
                                  name: item.createdBy ?? t("templates.typeManage.createdBySystem"),
                                })}
                                <span className="mx-2">·</span>
                                {enabled
                                  ? t("templates.typeManage.enabled")
                                  : t("templates.typeManage.disabled")}
                              </div>
                              {!enabled && (
                                <div className="mt-1 text-xs text-amber-600">
                                  {t("templates.typeManage.disabledHint")}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="rounded-md border px-3 py-1 text-xs"
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditingName(item.name);
                                  setManageError(null);
                                }}
                              >
                                {t("templates.typeManage.rename")}
                              </button>
                              <button
                                type="button"
                                className="rounded-md border px-3 py-1 text-xs"
                                onClick={() => handleToggleType(item)}
                              >
                                {enabled
                                  ? t("templates.typeManage.disable")
                                  : t("templates.typeManage.enable")}
                              </button>
                            </div>
                          </div>
                          {isEditing && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                                value={editingName}
                                onChange={(event) =>
                                  setEditingName(event.target.value)
                                }
                              />
                              <button
                                type="button"
                                className="h-9 rounded-md bg-black px-4 text-sm text-white"
                                onClick={() => handleRenameType(item)}
                              >
                                {t("templates.typeManage.save")}
                              </button>
                              <button
                                type="button"
                                className="h-9 rounded-md border px-4 text-sm"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                              >
                                {t("templates.typeManage.cancel")}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-base font-semibold">
            {t("templates.create.step2.title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("templates.create.step2.subtitle")}
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={allowedModes.all}
              onChange={(event) =>
                onAllowedModeChange("all", event.target.checked)
              }
            />
            <div>
              <div className="font-medium">
                {t("templates.create.step2.all.title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("templates.create.step2.all.desc")}
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={allowedModes.partial}
              onChange={(event) =>
                onAllowedModeChange("partial", event.target.checked)
              }
            />
            <div>
              <div className="font-medium">
                {t("templates.create.step2.partial.title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("templates.create.step2.partial.desc")}
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={allowedModes.weighted}
              onChange={(event) =>
                onAllowedModeChange("weighted", event.target.checked)
              }
            />
            <div>
              <div className="font-medium">
                {t("templates.create.step2.weighted.title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("templates.create.step2.weighted.desc")}
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={allowedModes.accrue}
              onChange={(event) =>
                onAllowedModeChange("accrue", event.target.checked)
              }
            />
            <div>
              <div className="font-medium">
                {t("templates.create.step2.accrue.title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("templates.create.step2.accrue.desc")}
              </div>
            </div>
          </label>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("templates.create.step2.hint")}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("templates.create.step2.weightedHint")}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-8">
        <div>
          <div className="text-base font-semibold">
            {t("templates.create.step3.title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("templates.create.step3.subtitle")}
          </p>
        </div>

        <div className="rounded-md border p-4">
          <div className="text-sm font-medium">
            {t("templates.create.step3.importance.title")}
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="importanceAllowed"
                checked={!importanceAllowed}
                onChange={() => onImportanceAllowedChange(false)}
                disabled={allowedModes.weighted}
              />
              <span>{t("templates.create.step3.importance.off")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="importanceAllowed"
                checked={importanceAllowed}
                onChange={() => onImportanceAllowedChange(true)}
              />
              <span>{t("templates.create.step3.importance.on")}</span>
            </label>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {t("templates.create.step3.importance.hint")}
          </div>
        </div>

        <div className="rounded-md border p-4">
          <div className="text-sm font-medium">
            {t("templates.create.step3.position.title")}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm">
            {(
              [
                ["any", t("templates.create.step3.position.any")],
                ["paragraph", t("templates.create.step3.position.paragraph")],
                ["sentence", t("templates.create.step3.position.sentence")],
                ["order", t("templates.create.step3.position.order")],
                ["near", t("templates.create.step3.position.near")],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={positionRules[key]}
                  onChange={(event) =>
                    onPositionRuleChange(key, event.target.checked)
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {t("templates.create.step3.position.hint")}
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-base font-semibold">
            {t("templates.create.step4.title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("templates.create.step4.subtitle")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("templates.create.step4.positiveLabel")}
          </label>
          <textarea
            className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={explainPositive}
            onChange={(event) => onExplainPositiveChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("templates.create.step4.negativeLabel")}
          </label>
          <textarea
            className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={explainNegative}
            onChange={(event) => onExplainNegativeChange(event.target.value)}
          />
        </div>

        <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          {t("templates.create.step4.hint")}
        </div>
      </div>
    );
  }

  return null;
}

export type {
  AllowedModes,
  PositionRules,
  TemplateCreateStepsProps,
  TemplateType,
};
