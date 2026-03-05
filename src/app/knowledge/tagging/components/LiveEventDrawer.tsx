import { Zap } from "lucide-react";
import { t } from "@/i18n";

type LiveEventDrawerProps = {
  events: string[];
};

export function LiveEventDrawer({ events }: LiveEventDrawerProps) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">{t("governance.control.liveEvents")}</h2>
      <div className="mt-3 space-y-2">
        {events.map((event, idx) => (
          <div
            key={`${event}-${idx}`}
            className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-300"
          >
            {idx === 0 ? (
              <span className="mr-2 inline-flex items-center text-cyan-300">
                <Zap className="h-3.5 w-3.5" />
              </span>
            ) : null}
            {event}
          </div>
        ))}
      </div>
    </article>
  );
}
