import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, datasetChoices, type Dataset, type Diff, type JobSummary } from "../api";
import { AppWindow } from "../components/Shell";
import { ROOT_CRUMB } from "../events";
import { buildLens, type LensBar, type LensSection } from "./lens-insights";
import { downloadLensReport } from "./lens-report";

const KIND: Record<string, string> = {
  SPONSOR_LOOKUP: "Sponsors",
  JUDGE_LOOKUP: "Judges, mentors and speakers",
  JOB_LOOKUP: "Jobs",
  LEAD_LOOKUP: "Leads",
  COMPETITOR_LOOKUP: "Competitors",
};

/** Lens: a few useful insights for one list, chosen for its kind (sponsors, judges, jobs, leads, competitors). */
export function Lens() {
  const [params, setParams] = useSearchParams();
  const jobId = params.get("job") ?? "";
  const [saving, setSaving] = useState(false);

  const jobsQ = useQuery({ queryKey: ["jobs"], queryFn: () => api<{ jobs: JobSummary[] }>("/api/jobs") });
  const ready = useMemo(() => (jobsQ.data?.jobs ?? []).filter((job) => job.versionNumber != null), [jobsQ.data]);
  const choices = useMemo(() => datasetChoices(ready), [ready]);
  const job = ready.find((item) => item.id === jobId);

  useEffect(() => {
    if (!jobId && choices[0]) setParams({ job: choices[0].id }, { replace: true });
  }, [jobId, choices, setParams]);

  const datasetQ = useQuery({ queryKey: ["dataset", jobId], queryFn: () => api<Dataset>(`/api/jobs/${jobId}/dataset`), enabled: Boolean(jobId) });
  const diffQ = useQuery({ queryKey: ["diff", jobId], queryFn: () => api<{ diff: Diff | null }>(`/api/jobs/${jobId}/diff`), enabled: Boolean(jobId) });
  const outreachQ = useQuery({
    queryKey: ["outreach", jobId],
    queryFn: () => api<{ outreach: Record<string, { status: string; note: string }> }>(`/api/jobs/${jobId}/outreach`),
    enabled: Boolean(jobId),
  });

  const intent = job?.blueprint.intent ?? "";
  const view = useMemo(
    () =>
      datasetQ.data
        ? buildLens({ intent, records: datasetQ.data.records, outreach: outreachQ.data?.outreach ?? {}, diff: diffQ.data?.diff ?? null })
        : null,
    [intent, datasetQ.data, outreachQ.data, diffQ.data],
  );

  const download = async () => {
    if (!view || !job || saving) return;
    setSaving(true);
    try {
      await downloadLensReport({ name: job.name, kind: KIND[intent] ?? "List", query: job.query, view });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppWindow crumbs={[{ label: ROOT_CRUMB, to: "/dashboard" }, { label: "Toolkit", to: "/agents" }, { label: "Lens" }]} sidebar="agents">
      <div className="content agent-page">
        <div className="agent-toolbar flat">
          <select aria-label="List" value={jobId} onChange={(event) => setParams(event.target.value ? { job: event.target.value } : {})}>
            {choices.length === 0 && <option value="">No lists with results yet</option>}
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.label}
              </option>
            ))}
          </select>
          <button className="btn" type="button" disabled={!view || saving} onClick={() => void download()}>
            <FileDown size={14} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} />
            {saving ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>

        {!job ? (
          <p className="lens2-empty">{jobsQ.isLoading ? "Loading…" : "Run a search first. Lens summarizes a list once it has results."}</p>
        ) : !view ? (
          <p className="lens2-empty">Loading {job.name}…</p>
        ) : (
          <div className="lens2">
            <header className="lens2-head">
              <div>
                <div className="lens2-kind">{KIND[intent] ?? "List"}</div>
                <h2>{job.name}</h2>
                <Link to={`/jobs/${job.id}`} className="lens2-open">Open the list</Link>
              </div>
              <dl className="lens2-stats">
                {view.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </header>

            <div className="lens2-grid">
              {view.sections.map((section) => (
                <InsightCard key={section.id} section={section} />
              ))}
            </div>

            {view.sourcesLine && <p className="lens2-sources">{view.sourcesLine}</p>}
          </div>
        )}
      </div>
    </AppWindow>
  );
}

const PIE_COLORS = ["#4c6fff", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
/** "Other", "No email yet", "Not stated": the leftovers are grey so the real parts stand out. */
const PIE_REST = /^(other|no )|not stated|unknown/i;

/** A ring of the section's parts with a legend of counts and shares. Zero parts are left out. */
function PieChart({ bars }: { bars: LensBar[] }) {
  const parts = bars.filter((bar) => bar.count > 0);
  const total = parts.reduce((sum, bar) => sum + bar.count, 0);
  let colorIndex = 0;
  let start = 0;
  const slices = parts.map((bar) => {
    const share = (bar.count / total) * 100;
    const color = PIE_REST.test(bar.label) ? "#b8bcc6" : PIE_COLORS[colorIndex++ % PIE_COLORS.length]!;
    const slice = { ...bar, share, color, start };
    start += share;
    return slice;
  });
  return (
    <div className="lens2-pie">
      <svg viewBox="0 0 42 42" role="img" aria-label={slices.map((slice) => `${slice.label}: ${slice.count}`).join(", ")}>
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--sunken)" strokeWidth="7" />
        {slices.map((slice) => (
          <circle
            key={slice.label}
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={slice.color}
            strokeWidth="7"
            strokeDasharray={`${slice.share} ${100 - slice.share}`}
            strokeDashoffset={25 - slice.start}
          />
        ))}
        <text x="21" y="22.5" textAnchor="middle" className="lens2-pie-total">{total}</text>
      </svg>
      <ul className="lens2-pie-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <span className="lens2-pie-dot" style={{ background: slice.color }} />
            <span className="lens2-bar-label" title={slice.label}>{slice.label}</span>
            <span className="lens2-bar-count">{slice.count} · {Math.round(slice.share)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightCard({ section }: { section: LensSection }) {
  const max = Math.max(1, ...(section.bars ?? []).map((bar) => bar.count));
  return (
    <section className="lens2-card">
      <h3>{section.title}</h3>
      <p className="lens2-takeaway">{section.takeaway}</p>
      {section.chart === "pie" && section.bars && section.bars.some((bar) => bar.count > 0) ? (
        <PieChart bars={section.bars} />
      ) : section.bars && section.bars.length > 0 && (
        <ul className="lens2-bars">
          {section.bars.map((bar) => (
            <li key={bar.label}>
              <span className="lens2-bar-label" title={bar.label}>{bar.label}</span>
              <span className="lens2-bar-track">
                <span className="lens2-bar-fill" style={{ width: `${(bar.count / max) * 100}%` }} />
              </span>
              <span className="lens2-bar-count">{bar.count}</span>
            </li>
          ))}
        </ul>
      )}
      {section.names && section.names.length > 0 && (
        <ul className="lens2-names">
          {section.names.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              <span className="lens2-name">{item.name}</span>
              {item.detail && <span className="lens2-detail">{item.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
