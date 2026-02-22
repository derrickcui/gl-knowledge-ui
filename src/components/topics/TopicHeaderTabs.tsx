"use client";

import Link from "next/link";
import { t } from "@/i18n";

export type TopicHeaderTabKey = "RULE" | "REVIEW" | "PUBLISH" | "DEPLOY";

type TopicHeaderTabsProps = {
  topicId: string;
  topicName: string;
  createdAt?: string | null;
  statusText: string;
  statusCode?: string | null;
  activeTab: TopicHeaderTabKey;
  onTabChange?: (tab: TopicHeaderTabKey) => void;
  reviewRevision?: number | null;
};

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-rose-100 text-rose-800",
  "已发布": "bg-green-100 text-green-800",
  "草稿": "bg-amber-100 text-amber-800",
  "待评审": "bg-blue-100 text-blue-800",
  "已通过": "bg-emerald-100 text-emerald-800",
  "被退回": "bg-rose-100 text-rose-800",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function getStatusClass(statusCode?: string | null, statusText?: string | null) {
  const codeKey = String(statusCode ?? "").trim().toUpperCase();
  if (codeKey && STATUS_STYLES[codeKey]) return STATUS_STYLES[codeKey];
  const textKey = String(statusText ?? "").trim();
  if (textKey && STATUS_STYLES[textKey]) return STATUS_STYLES[textKey];
  return "bg-gray-100 text-gray-700";
}

function tabHref(topicId: string, tab: TopicHeaderTabKey, reviewRevision?: number | null): string {
  const encoded = encodeURIComponent(topicId);
  if (tab === "RULE") return `/knowledge/topics/${encoded}`;
  if (tab === "REVIEW") {
    if (typeof reviewRevision === "number" && Number.isFinite(reviewRevision) && reviewRevision > 0) {
      return `/knowledge/topics/${encoded}/reviews/${reviewRevision}`;
    }
    return `/knowledge/topics/${encoded}?tab=REVIEW`;
  }
  if (tab === "PUBLISH") return `/knowledge/topics/${encoded}?tab=PUBLISH`;
  return `/knowledge/topics/${encoded}?tab=DEPLOY`;
}

export function TopicHeaderTabs({
  topicId,
  topicName,
  createdAt,
  statusText,
  statusCode,
  activeTab,
  onTabChange,
  reviewRevision,
}: TopicHeaderTabsProps) {
  const tabs: Array<{ key: TopicHeaderTabKey; label: string }> = [
    { key: "RULE", label: t("topicTabs.rule") },
    { key: "REVIEW", label: t("topicTabs.review") },
    { key: "PUBLISH", label: t("topicTabs.publish") },
    { key: "DEPLOY", label: t("topicTabs.deploy") },
  ];

  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="grid gap-3 px-1 pb-2 md:grid-cols-3">
        <div>
          <div className="text-xs text-slate-500">{t("topicDetail.header.name")}</div>
          <div className="text-base font-semibold text-slate-900">{topicName || t("common.topic")}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("topicDetail.header.createdAt")}</div>
          <div className="text-sm text-slate-900">{formatDate(createdAt)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("topicDetail.header.status")}</div>
          <div className="pt-0.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(
                statusCode,
                statusText
              )}`}
            >
              {statusText || "-"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          const cls = `rounded-md px-3 py-1.5 text-sm ${
            active ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`;
          if (onTabChange) {
            return (
              <button key={tab.key} type="button" className={cls} onClick={() => onTabChange(tab.key)}>
                {tab.label}
              </button>
            );
          }
          return (
            <Link key={tab.key} href={tabHref(topicId, tab.key, reviewRevision)} className={cls}>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
