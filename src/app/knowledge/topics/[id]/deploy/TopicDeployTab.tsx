"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { TOPIC_RUNTIME_DEPLOY_EVENT } from "./TopicRuntimeStatusBar";
import type { RuntimeEnvironment } from "@/lib/runtime-api";
import { fetchRuntimeEnvironmentById, fetchRuntimeEnvironments } from "@/lib/runtime-api";
import {
  activateRuntimeDeployment,
  createRuntimeDeploy,
  deleteRuntimeDeployment,
  fetchRuntimeDeploymentDetail,
  fetchRuntimeDeployMetrics,
  fetchRuntimeDeployments,
  validateRuntimeDeploy,
  type RuntimeDeployMode,
  type RuntimeDeploymentDetail,
  type RuntimeDeploymentItem,
  type RuntimeDeployMetrics,
  type RuntimeDeployValidation,
} from "@/lib/runtime-deploy-api";

type WizardStep = 1 | 2 | 3;

type Feedback = {
  type: "success" | "error" | "info";
  title: string;
  message?: string;
};

const DEPLOY_MODE_OPTIONS: RuntimeDeployMode[] = ["FILTER", "BOOST", "LABEL", "MAP", "SIGNAL"];

type ConfirmAction =
  | { type: "ACTIVATE"; item: RuntimeDeploymentItem }
  | { type: "DELETE"; item: RuntimeDeploymentItem };

export function TopicDeployTab({
  topicId,
  topicName,
  currentPublishedRevision,
  onRequestOpenPublish,
}: {
  topicId: string;
  topicName: string;
  currentPublishedRevision: number | null;
  onRequestOpenPublish?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState<RuntimeDeploymentItem[]>([]);
  const [environments, setEnvironments] = useState<RuntimeEnvironment[]>([]);
  const [metrics, setMetrics] = useState<RuntimeDeployMetrics | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [workingDeploymentId, setWorkingDeploymentId] = useState<number | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null);
  const [selectedEnvironmentDetail, setSelectedEnvironmentDetail] = useState<RuntimeEnvironment | null>(null);
  const [activateNow, setActivateNow] = useState(true);
  const [verifyExecution, setVerifyExecution] = useState(true);
  const [deployModes, setDeployModes] = useState<RuntimeDeployMode[]>(["FILTER"]);
  const [deployWeight, setDeployWeight] = useState<string>("1");
  const [deployNamespace, setDeployNamespace] = useState("");
  const [validationBusy, setValidationBusy] = useState(false);
  const [validationResult, setValidationResult] = useState<RuntimeDeployValidation | null>(null);
  const [deployBusy, setDeployBusy] = useState(false);

  const [rollbackTarget, setRollbackTarget] = useState<RuntimeDeploymentItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<RuntimeDeploymentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<RuntimeDeploymentDetail | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [expandedMetricRowId, setExpandedMetricRowId] = useState<number | null>(null);
  const [rowMetricsByDeploymentId, setRowMetricsByDeploymentId] = useState<Record<number, RuntimeDeployMetrics | null>>({});
  const [rowMetricLoadingId, setRowMetricLoadingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const selectedEnvironment = useMemo(
    () => environments.find((item) => item.id === selectedEnvId) ?? null,
    [environments, selectedEnvId]
  );

  const activeDeploymentOnEnv = useMemo(
    () =>
      selectedEnvId == null
        ? null
        : deployments.find(
            (item) =>
              item.runtimeEnvironmentId === selectedEnvId &&
              item.status.toUpperCase() === "ACTIVE"
          ) ?? null,
    [deployments, selectedEnvId]
  );

  const deploymentGroups = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; environmentName: string; environmentId: number | null; items: RuntimeDeploymentItem[] }
    >();
    for (const item of deployments) {
      const key = item.runtimeEnvironmentId == null ? `name:${item.runtimeEnvironmentName}` : `id:${item.runtimeEnvironmentId}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          environmentName: item.runtimeEnvironmentName || "-",
          environmentId: item.runtimeEnvironmentId ?? null,
          items: [item],
        });
      } else {
        existing.items.push(item);
      }
    }
    const sortedGroups = Array.from(groups.values());
    sortedGroups.sort((a, b) => {
      const aHead = a.items[0];
      const bHead = b.items[0];
      const ta = aHead?.deployedAt ? new Date(aHead.deployedAt).getTime() : 0;
      const tb = bHead?.deployedAt ? new Date(bHead.deployedAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      const aid = aHead?.deploymentId ?? 0;
      const bid = bHead?.deploymentId ?? 0;
      return bid - aid;
    });
    return sortedGroups;
  }, [deployments]);

  useEffect(() => {
    void refreshAll();
  }, [topicId]);

  useEffect(() => {
    let active = true;
    if (selectedEnvId == null) {
      setSelectedEnvironmentDetail(null);
      return;
    }
    fetchRuntimeEnvironmentById(selectedEnvId).then((result) => {
      if (!active) return;
      setSelectedEnvironmentDetail(result.data ?? null);
    });
    return () => {
      active = false;
    };
  }, [selectedEnvId]);

  async function refreshAll() {
    setLoading(true);
    const [deploymentResult, envResult, metricResult] = await Promise.all([
      fetchRuntimeDeployments(topicId),
      fetchRuntimeEnvironments({ status: "ACTIVE" }),
      fetchRuntimeDeployMetrics(topicId),
    ]);

    if (deploymentResult.data) {
      setDeployments(deploymentResult.data);
    } else {
      setFeedback({
        type: "error",
        title: t("topicDeploy.loadFailed"),
        message: deploymentResult.error ?? undefined,
      });
    }

    setEnvironments(envResult.data ?? []);
    setMetrics(metricResult.data ?? null);
    setLoading(false);
    window.dispatchEvent(
      new CustomEvent(TOPIC_RUNTIME_DEPLOY_EVENT, {
        detail: { topicId },
      })
    );
  }

  function resetWizard() {
    setWizardStep(1);
    setSelectedEnvId(null);
    setSelectedEnvironmentDetail(null);
    setActivateNow(true);
    setVerifyExecution(true);
    setDeployModes(["FILTER"]);
    setDeployWeight("1");
    setDeployNamespace("");
    setValidationResult(null);
    setValidationBusy(false);
    setDeployBusy(false);
  }

  function openWizard() {
    resetWizard();
    setWizardOpen(true);
  }

  async function handleValidate() {
    if (selectedEnvId == null) return;
    setValidationBusy(true);
    setValidationResult(null);
    const result = await validateRuntimeDeploy({
      topicId,
      environmentId: selectedEnvId,
    });
    setValidationBusy(false);
    if (!result.data) {
      setFeedback({
        type: "error",
        title: t("topicDeploy.validationFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    setValidationResult(result.data);
    setWizardStep(2);
  }

  async function handleConfirmDeploy() {
    if (selectedEnvId == null) return;
    const normalizedDeployModes = Array.from(
      new Set(deployModes.map((item) => String(item).trim().toUpperCase()).filter(Boolean))
    ) as RuntimeDeployMode[];
    const hasBoostMode = normalizedDeployModes.includes("BOOST");
    const normalizedWeight = Number(deployWeight);
    setDeployBusy(true);
    const result = await createRuntimeDeploy({
      topicId,
      environmentId: selectedEnvId,
      activate: activateNow,
      verifyExecution,
      operator: "systemUser",
      deployMode:
        normalizedDeployModes.length <= 1 ? normalizedDeployModes[0] : normalizedDeployModes,
      namespace: deployNamespace.trim() || undefined,
      weight:
        hasBoostMode && Number.isFinite(normalizedWeight) && normalizedWeight > 0
          ? normalizedWeight
          : undefined,
    });
    setDeployBusy(false);
    if (!result.data) {
      setFeedback({
        type: "error",
        title: t("topicDeploy.deployFailed"),
        message: result.error ?? undefined,
      });
      return;
    }

    setWizardOpen(false);
    setFeedback({
      type: "success",
      title: t("topicDeploy.deploySuccess"),
      message: t("topicDeploy.deploySuccessDetail", {
        snapshotId: result.data.snapshotId ?? "-",
        deploymentId: result.data.deploymentId,
        status: runtimeStatusLabel(result.data.status),
      }),
    });
    await refreshAll();
  }

  async function handleActivate(item: RuntimeDeploymentItem) {
    setWorkingDeploymentId(item.deploymentId);
    const result = await activateRuntimeDeployment(item.deploymentId, {
      verifyExecution,
      operator: "systemUser",
    });
    setWorkingDeploymentId(null);
    if (result.error) {
      setFeedback({
        type: "error",
        title: t("topicDeploy.activateFailed"),
        message: result.error,
      });
      return;
    }
    setFeedback({ type: "success", title: t("topicDeploy.activateSuccess") });
    await refreshAll();
  }

  async function handleDelete(item: RuntimeDeploymentItem) {
    setWorkingDeploymentId(item.deploymentId);
    const result = await deleteRuntimeDeployment(item.deploymentId);
    setWorkingDeploymentId(null);
    if (result.error) {
      setFeedback({
        type: "error",
        title: t("topicDeploy.deleteFailed"),
        message: result.error,
      });
      return;
    }
    setFeedback({ type: "success", title: t("topicDeploy.deleteSuccess") });
    await refreshAll();
  }

  async function handleOpenDetail(item: RuntimeDeploymentItem) {
    setDetailTarget(item);
    setDetailLoading(true);
    setDetailData(null);
    setVerifyResult(null);
    const result = await fetchRuntimeDeploymentDetail(item.deploymentId);
    setDetailLoading(false);
    if (!result.data) {
      setFeedback({
        type: "error",
        title: t("topicDeploy.detailLoadFailed"),
        message: result.error ?? undefined,
      });
      return;
    }
    setDetailData(result.data);
  }

  async function handleVerifyActivation() {
    if (!detailTarget?.runtimeEnvironmentId || !detailData?.snapshotId) return;
    setVerifyBusy(true);
    setVerifyResult(null);
    const result = await validateRuntimeDeploy({
      topicId,
      environmentId: detailTarget.runtimeEnvironmentId,
    });
    setVerifyBusy(false);
    if (!result.data) {
      setVerifyResult(result.error ?? t("topicDeploy.verifyFailed"));
      return;
    }
    const matched = result.data.currentActiveSnapshotId === detailData.snapshotId;
    setVerifyResult(
      matched
        ? t("topicDeploy.verifyMatched", { snapshotId: detailData.snapshotId })
        : t("topicDeploy.verifyNotMatched", {
            current: result.data.currentActiveSnapshotId ?? "-",
            target: detailData.snapshotId,
          })
    );
  }

  async function handleToggleRowMetrics(item: RuntimeDeploymentItem) {
    if (expandedMetricRowId === item.deploymentId) {
      setExpandedMetricRowId(null);
      return;
    }
    setExpandedMetricRowId(item.deploymentId);
    if (rowMetricsByDeploymentId[item.deploymentId] !== undefined) return;
    setRowMetricLoadingId(item.deploymentId);
    const result = await fetchRuntimeDeployMetrics(topicId);
    setRowMetricLoadingId(null);
    setRowMetricsByDeploymentId((prev) => ({
      ...prev,
      [item.deploymentId]: result.data ?? null,
    }));
  }

  const publishedVersionLabel =
    currentPublishedRevision == null ? "-" : `v${currentPublishedRevision}`;
  const canStartDeploy = currentPublishedRevision != null;
  const noPublishedRevisionIssue = useMemo(() => {
    if (!validationResult || validationResult.passed) return false;
    const entries = [...(validationResult.missingFields ?? []), validationResult.message ?? ""];
    return entries.some((item) => /no published revision/i.test(String(item)));
  }, [validationResult]);

  return (
    <div className="space-y-4">
      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold">
          {t("topicDeploy.topicLine", { topicName })}
        </div>
        <div className="mt-1 text-sm text-slate-600">
          {t("topicDeploy.publishedVersion", { version: publishedVersionLabel })}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">{t("topicDeploy.deploySectionTitle")}</div>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            onClick={openWizard}
            disabled={!canStartDeploy}
          >
            {t("topicDeploy.deployButton")}
          </button>
        </div>
        {!canStartDeploy && (
          <div className="mt-2 text-xs text-amber-700">
            {t("topicDeploy.deployNeedPublish")}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold">{t("topicDeploy.listTitle")}</div>
        {loading ? (
          <div className="mt-3 text-sm text-slate-500">{t("common.loading")}</div>
        ) : deployments.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">{t("topicDeploy.listEmpty")}</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="px-2 py-2">{t("topicDeploy.table.deploymentId")}</th>
                  <th className="px-2 py-2">{t("topicDeploy.table.environment")}</th>
                  <th className="px-2 py-2">{t("topicDeploy.table.status")}</th>
                  <th className="px-2 py-2">{t("topicDeploy.table.snapshotVersion")}</th>
                  <th className="px-2 py-2">{t("topicDeploy.table.publishedRevision")}</th>
                  <th className="px-2 py-2">{t("topicDeploy.table.time")}</th>
                  <th className="px-2 py-2">{t("topicDeploy.table.deployedBy")}</th>
                  <th className="px-2 py-2">{t("topicDeploy.table.action")}</th>
                </tr>
              </thead>
              <tbody>
                {deploymentGroups.map((group) => (
                  <Fragment key={group.key}>
                    <tr className="border-b bg-slate-50/80">
                      <td colSpan={8} className="px-2 py-2 text-xs font-semibold text-slate-700">
                        {t("topicDeploy.group.environment", {
                          name: group.environmentName,
                          count: group.items.length,
                        })}
                      </td>
                    </tr>
                    {group.items.map((item) => {
                      const busy = workingDeploymentId === item.deploymentId;
                      const rowMetricOpen = expandedMetricRowId === item.deploymentId;
                      const rowMetrics = rowMetricsByDeploymentId[item.deploymentId];
                      const rowMetricLoading = rowMetricLoadingId === item.deploymentId;
                      return (
                        <Fragment key={item.deploymentId}>
                          <tr className="border-b last:border-b-0">
                            <td className="px-2 py-3">{item.deploymentId}</td>
                            <td className="px-2 py-3">{item.runtimeEnvironmentName}</td>
                            <td className="px-2 py-3">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="px-2 py-3">{item.snapshotVersion == null ? "-" : `v${item.snapshotVersion}`}</td>
                            <td className="px-2 py-3">{item.publishedRevision == null ? "-" : `v${item.publishedRevision}`}</td>
                            <td className="px-2 py-3 text-slate-600">{formatDate(item.deployedAt)}</td>
                            <td className="px-2 py-3">{item.deployedBy || "-"}</td>
                            <td className="px-2 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {item.status.toUpperCase() === "ACTIVE" && (
                                  <button
                                    type="button"
                                    className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                    onClick={() => setRollbackTarget(item)}
                                    disabled={busy || !item.canRollback}
                                  >
                                    {t("topicDeploy.action.rollback")}
                                  </button>
                                )}
                                {item.status.toUpperCase() === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                      onClick={() => setConfirmAction({ type: "ACTIVATE", item })}
                                      disabled={busy || !item.canActivate}
                                    >
                                      {t("topicDeploy.action.activate")}
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                      onClick={() => setConfirmAction({ type: "DELETE", item })}
                                      disabled={busy || !item.canDelete}
                                    >
                                      {t("topicDeploy.action.delete")}
                                    </button>
                                  </>
                                )}
                                {item.status.toUpperCase() === "INACTIVE" && (
                                  <button
                                    type="button"
                                    className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                    onClick={() => setConfirmAction({ type: "ACTIVATE", item })}
                                    disabled={busy || !item.canActivate}
                                  >
                                    {t("topicDeploy.action.activate")}
                                  </button>
                                )}
                                {item.status.toUpperCase() === "FAILED" && (
                                  <button
                                    type="button"
                                    className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                    onClick={() => void handleOpenDetail(item)}
                                    disabled={!item.canViewLog}
                                  >
                                    {t("topicDeploy.action.viewLogs")}
                                  </button>
                                )}
                                {item.status.toUpperCase() !== "FAILED" && (
                                  <button
                                    type="button"
                                    className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                    onClick={() => void handleOpenDetail(item)}
                                  >
                                    {t("topicDeploy.action.detail")}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                                  onClick={() => void handleToggleRowMetrics(item)}
                                >
                                  {rowMetricOpen
                                    ? t("topicDeploy.action.hideMetrics")
                                    : t("topicDeploy.action.viewMetrics")}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {rowMetricOpen && (
                            <tr className="border-b bg-slate-50">
                              <td colSpan={8} className="px-3 py-3">
                                {rowMetricLoading ? (
                                  <div className="text-sm text-slate-500">{t("common.loading")}</div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                                    <MetricItem
                                      label={t("topicDeploy.metrics.executeCount")}
                                      value={rowMetrics?.executeCount == null ? "-" : String(rowMetrics.executeCount)}
                                    />
                                    <MetricItem
                                      label={t("topicDeploy.metrics.avgLatency")}
                                      value={rowMetrics?.avgLatencyMs == null ? "-" : `${rowMetrics.avgLatencyMs}ms`}
                                    />
                                    <MetricItem
                                      label={t("topicDeploy.metrics.cacheHit")}
                                      value={
                                        rowMetrics?.cacheHitRate == null
                                          ? "-"
                                          : `${Number(rowMetrics.cacheHitRate).toFixed(1)}%`
                                      }
                                    />
                                    <MetricItem
                                      label={t("topicDeploy.metrics.failureCount")}
                                      value={rowMetrics?.failureCount == null ? "-" : String(rowMetrics.failureCount)}
                                    />
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold">{t("topicDeploy.metrics.title")}</div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <MetricItem
            label={t("topicDeploy.metrics.executeCount")}
            value={metrics?.executeCount == null ? "-" : String(metrics.executeCount)}
          />
          <MetricItem
            label={t("topicDeploy.metrics.avgLatency")}
            value={metrics?.avgLatencyMs == null ? "-" : `${metrics.avgLatencyMs}ms`}
          />
          <MetricItem
            label={t("topicDeploy.metrics.cacheHit")}
            value={
              metrics?.cacheHitRate == null
                ? "-"
                : `${Number(metrics.cacheHitRate).toFixed(1)}%`
            }
          />
          <MetricItem
            label={t("topicDeploy.metrics.failureCount")}
            value={metrics?.failureCount == null ? "-" : String(metrics.failureCount)}
          />
        </div>
      </div>

      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="text-base font-semibold">
              {t("topicDeploy.wizard.title", { step: wizardStep })}
            </div>

            {wizardStep === 1 && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-medium">{t("topicDeploy.wizard.step1.title")}</div>
                <div className="space-y-2">
                  {environments.map((env) => (
                    <label key={env.id} className="flex items-center gap-2 rounded border px-3 py-2">
                      <input
                        type="radio"
                        name="runtime-environment"
                        checked={selectedEnvId === env.id}
                        onChange={() => setSelectedEnvId(env.id)}
                      />
                      <span className="text-sm">
                        {env.name || env.code || `#${env.id}`} ({engineTypeLabel(inferEngineType(env))})
                      </span>
                    </label>
                  ))}
                </div>
                {selectedEnvironment && (
                  <div className="rounded border bg-slate-50 p-3 text-sm">
                    <div>
                      {t("topicDeploy.wizard.step1.dataset", {
                        dataset: selectedEnvironmentDetail?.datasetName ?? selectedEnvironment.datasetName ?? "-",
                      })}
                    </div>
                    <div>
                      {t("topicDeploy.wizard.step1.engine", {
                        engine: engineTypeLabel(inferEngineType(selectedEnvironmentDetail ?? selectedEnvironment)),
                      })}
                    </div>
                    <div>
                      {t("topicDeploy.wizard.step1.status", {
                        status: runtimeStatusLabel(selectedEnvironmentDetail?.status ?? selectedEnvironment.status),
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                    onClick={() => setWizardOpen(false)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={() => void handleValidate()}
                    disabled={selectedEnvId == null || validationBusy}
                  >
                    {validationBusy ? t("topicDeploy.wizard.validating") : t("topicDeploy.wizard.next")}
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-medium">{t("topicDeploy.wizard.step2.title")}</div>
                {validationResult?.passed ? (
                  <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <div className="font-medium">{t("topicDeploy.wizard.step2.pass")}</div>
                    {validationResult.mappedFields.map((item) => (
                      <div key={`${item.source}-${item.target}`} className="mt-1 text-xs">
                        {item.source} -&gt; {item.target}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div className="font-medium">{t("topicDeploy.wizard.step2.fail")}</div>
                    {noPublishedRevisionIssue && (
                      <div className="mt-2 text-xs">{t("topicDeploy.wizard.step2.noPublishedRevision")}</div>
                    )}
                    {(validationResult?.missingFields ?? []).length > 0 ? (
                      <ul className="mt-2 list-disc pl-5 text-xs">
                        {(validationResult?.missingFields ?? []).map((field) => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-xs">
                        {validationResult?.message ?? t("topicDeploy.wizard.step2.failEmpty")}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                    onClick={() => setWizardStep(1)}
                  >
                    {t("topicDeploy.wizard.back")}
                  </button>
                  <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                    onClick={() => setWizardOpen(false)}
                  >
                    {t("common.cancel")}
                  </button>
                  {validationResult?.passed ? (
                    <button
                      type="button"
                      className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
                      onClick={() => setWizardStep(3)}
                    >
                      {t("topicDeploy.wizard.next")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                      onClick={() => {
                        if (noPublishedRevisionIssue) {
                          setWizardOpen(false);
                          onRequestOpenPublish?.();
                        } else if (selectedEnvId != null) {
                          router.push(`/runtime/${selectedEnvId}`);
                        }
                      }}
                    >
                      {noPublishedRevisionIssue
                        ? t("topicDeploy.wizard.fixPublish")
                        : t("topicDeploy.wizard.fixMapping")}
                    </button>
                  )}
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-medium">{t("topicDeploy.wizard.step3.title")}</div>
                <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={activateNow}
                    onChange={(event) => setActivateNow(event.target.checked)}
                  />
                  <span>{t("topicDeploy.wizard.activateNow")}</span>
                </label>
                <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!activateNow}
                    onChange={(event) => setActivateNow(!event.target.checked)}
                  />
                  <span>{t("topicDeploy.wizard.createPending")}</span>
                </label>
                <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={verifyExecution}
                    onChange={(event) => setVerifyExecution(event.target.checked)}
                  />
                  <span>{t("topicDeploy.wizard.verifyExecution")}</span>
                </label>

                <div className="rounded border px-3 py-2 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500">{t("topicDeploy.wizard.deployMode")}</div>
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setDeployModes([...DEPLOY_MODE_OPTIONS])}
                      disabled={DEPLOY_MODE_OPTIONS.every((mode) => deployModes.includes(mode))}
                    >
                      {t("topicDeploy.wizard.deployMode.selectAll")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {DEPLOY_MODE_OPTIONS.map((mode) => {
                      const checked = deployModes.includes(mode);
                      return (
                        <label key={mode} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const nextChecked = event.target.checked;
                              setDeployModes((prev) => {
                                if (nextChecked) {
                                  if (prev.includes(mode)) return prev;
                                  return [...prev, mode];
                                }
                                const next = prev.filter((item) => item !== mode);
                                return next.length > 0 ? next : ["FILTER"];
                              });
                            }}
                          />
                          <span>{t(`topicDeploy.wizard.deployMode.${mode.toLowerCase()}`)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {deployModes.includes("BOOST") && (
                  <label className="block rounded border px-3 py-2 text-sm">
                    <div className="mb-1 text-xs text-slate-500">{t("topicDeploy.wizard.weight")}</div>
                    <input
                      type="number"
                      min={0.0001}
                      step="0.1"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      value={deployWeight}
                      onChange={(event) => setDeployWeight(event.target.value)}
                      placeholder="1.0"
                    />
                    <div className="mt-1 text-xs text-slate-500">{t("topicDeploy.wizard.weightHint")}</div>
                  </label>
                )}

                <label className="block rounded border px-3 py-2 text-sm">
                  <div className="mb-1 text-xs text-slate-500">{t("topicDeploy.wizard.namespace")}</div>
                  <input
                    type="text"
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    value={deployNamespace}
                    onChange={(event) => setDeployNamespace(event.target.value)}
                    placeholder={t("topicDeploy.wizard.namespacePlaceholder")}
                  />
                  <div className="mt-1 text-xs text-slate-500">{t("topicDeploy.wizard.namespaceHint")}</div>
                </label>

                {activeDeploymentOnEnv && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {t("topicDeploy.wizard.riskHint")}
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                    onClick={() => setWizardStep(2)}
                  >
                    {t("topicDeploy.wizard.back")}
                  </button>
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={() => void handleConfirmDeploy()}
                    disabled={
                      deployBusy ||
                      (deployModes.includes("BOOST") &&
                        (!Number.isFinite(Number(deployWeight)) || Number(deployWeight) <= 0))
                    }
                  >
                    {deployBusy ? t("topicDeploy.wizard.deploying") : t("topicDeploy.wizard.confirmDeploy")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="text-base font-semibold">{t("topicDeploy.rollback.title")}</div>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <div>
                {t("topicDeploy.rollback.current", {
                  version:
                    deployments.find(
                      (item) =>
                        item.runtimeEnvironmentId === rollbackTarget.runtimeEnvironmentId &&
                        item.status.toUpperCase() === "ACTIVE"
                    )?.versionLabel ?? "-",
                })}
              </div>
              <div>{t("topicDeploy.rollback.target", { version: rollbackTarget.versionLabel })}</div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={() => setRollbackTarget(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
                onClick={async () => {
                  const target = rollbackTarget;
                  setRollbackTarget(null);
                  if (!target) return;
                  await handleActivate(target);
                }}
              >
                {t("topicDeploy.rollback.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="text-base font-semibold">
              {confirmAction.type === "ACTIVATE" ? t("topicDeploy.confirmActivate") : t("topicDeploy.confirmDelete")}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              {t("topicDeploy.detail.environment", { value: confirmAction.item.runtimeEnvironmentName })}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {t("topicDeploy.detail.snapshotVersion", {
                value: confirmAction.item.snapshotVersion == null ? "-" : `v${confirmAction.item.snapshotVersion}`,
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={() => setConfirmAction(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
                onClick={async () => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (!action) return;
                  if (action.type === "ACTIVATE") {
                    await handleActivate(action.item);
                    return;
                  }
                  await handleDelete(action.item);
                }}
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">
                {t("topicDeploy.detailTitle", { id: detailTarget.deploymentId })}
              </div>
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={() => setDetailTarget(null)}
              >
                {t("common.close")}
              </button>
            </div>
            {detailLoading || !detailData ? (
              <div className="mt-3 text-sm text-slate-500">{t("common.loading")}</div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-1 gap-2 rounded border bg-slate-50 p-3 text-sm lg:grid-cols-2">
                  <div>{t("topicDeploy.detail.deploymentId", { value: detailData.deploymentId })}</div>
                  <div>{t("topicDeploy.detail.status", { value: detailData.status })}</div>
                  <div>{t("topicDeploy.detail.environment", { value: detailData.environmentName })}</div>
                  <div>{t("topicDeploy.detail.snapshotId", { value: detailData.snapshotId ?? "-" })}</div>
                  <div>{t("topicDeploy.detail.snapshotVersion", { value: detailData.snapshotVersion ?? "-" })}</div>
                  <div>{t("topicDeploy.detail.publishedRevision", { value: detailData.publishedRevision ?? "-" })}</div>
                  <div>{t("topicDeploy.detail.deployedAt", { value: formatDate(detailData.deployedAt) })}</div>
                  <div>{t("topicDeploy.detail.deployedBy", { value: detailData.deployedBy })}</div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    onClick={() => void handleVerifyActivation()}
                    disabled={verifyBusy || detailTarget.runtimeEnvironmentId == null}
                  >
                    {verifyBusy ? t("topicDeploy.verifying") : t("topicDeploy.verifyButton")}
                  </button>
                  {verifyResult && <div className="text-sm text-slate-700">{verifyResult}</div>}
                </div>

                <div className="mt-3 text-sm font-medium">{t("topicDeploy.logsBlockTitle")}</div>
                <pre className="mt-2 whitespace-pre-wrap rounded border bg-slate-50 p-3 text-xs text-slate-700">
                  {detailData.deploymentLog || t("topicDeploy.logsEmpty")}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const cls =
    normalized === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700"
      : normalized === "PENDING"
        ? "bg-amber-100 text-amber-700"
        : normalized === "FAILED"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{runtimeStatusLabel(normalized)}</span>;
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function inferEngineType(env: RuntimeEnvironment): string {
  const raw = `${env.code ?? ""} ${env.name ?? ""} ${env.datasetName ?? ""}`.toLowerCase();
  if (raw.includes("solr")) return "SOLR";
  if (raw.includes("chroma")) return "CHROMA";
  if (raw.includes("hybrid") || raw.includes("mix")) return "HYBRID";
  return "UNKNOWN";
}

function engineTypeLabel(type: string): string {
  const normalized = String(type ?? "").trim().toUpperCase();
  if (normalized === "SOLR") return t("topicDeploy.engine.solr");
  if (normalized === "CHROMA") return t("topicDeploy.engine.chroma");
  if (normalized === "HYBRID") return t("topicDeploy.engine.hybrid");
  return t("topicDeploy.engine.unknown");
}

function runtimeStatusLabel(status?: string | null): string {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "ACTIVE") return t("topicDeploy.status.active");
  if (normalized === "PENDING") return t("topicDeploy.status.pending");
  if (normalized === "INACTIVE") return t("topicDeploy.status.inactive");
  if (normalized === "FAILED") return t("topicDeploy.status.failed");
  if (normalized === "SUCCESS") return t("topicDeploy.status.success");
  if (normalized.length === 0) return "-";
  return t("topicDeploy.status.unknown");
}
