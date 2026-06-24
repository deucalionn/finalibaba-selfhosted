"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";

// ── Serialized types (no BigInt) ──────────────────────────────────────────────

export type AllocationSliceExport = {
  name: string;
  valueCents: number;
  pct: number;
};

export type InvestPerfRowExport = {
  name: string;
  institution: string;
  subtype: string | null;
  valueCents: number;
  costBasisCents: number;
  gainCents: number;
  taxCents: number;
  returnPct: number;
};

export type DividendRowExport = {
  name: string;
  symbol: string;
  country: string;
  subtype: string | null;
  valueCents: number;
  annualEstCents: number;
  annualNetCents: number;
  taxRate: number;
  divYield: number;
  exDividendDate: string | null; // ISO string
};

export type PerfRowExport = {
  date: string;
  netWorth: number;
  delta: number | null;
  deltaPct: number | null;
};

export type AnalyticsExportData = {
  netWorth: number;
  netWorthAfterTax: number;
  grossAssets: number;
  totalLiabilities: number;
  totalLatentTax: number;
  investedPct: number;
  hasTaxData: boolean;
  savingsRate: number | null;
  runwayMonths: number | null;
  goalCents: number;
  goalPct: number;
  allocationSlices: AllocationSliceExport[];
  investPerfRows: InvestPerfRowExport[];
  investTotalValueCents: number;
  investTotalCostBasisCents: number;
  investTotalGainCents: number;
  investTotalTaxCents: number;
  investReturnPct: number;
  investCAGR: number | null;
  dividendRows: DividendRowExport[];
  annualDividendsCents: number;
  annualDividendsNetCents: number;
  annualInterestCents: number;
  annualPassiveCents: number;
  monthlyPassiveCents: number;
  performanceRows: PerfRowExport[];
};

// ── Sections ──────────────────────────────────────────────────────────────────

type Section = "resume" | "allocation" | "performance" | "dividendes" | "historique";

// ── Markdown strings interface ────────────────────────────────────────────────

interface AnalyticsExportStrings {
  title: string;
  summary: string;
  allocation: string;
  performance: string;
  passive: string;
  history: string;
  netWorthAfterTax: string;
  netWorth: string;
  gross: string;
  debts: string;
  taxes: string;
  investedRate: string;
  savingsRate: string;
  runway: string;
  goal: string;
  indicator: string;
  value: string;
  category: string;
  pct: string;
  colAccount: string;
  colInvested: string;
  colValue: string;
  colGrossGain: string;
  colTax: string;
  colPerf: string;
  colNetWorth: string;
  colChange: string;
  colAsset: string;
  colEnvelope: string;
  colYield: string;
  colAnnualGross: string;
  colAnnualNet: string;
  colExDiv: string;
  colMonth: string;
  months: string;
  goalFmt: (amount: string, pct: number) => string;
  summaryLine: (params: {
    invested: string;
    value: string;
    gain: string;
    netGain: string;
    perf: string;
    cagr: string;
  }) => string;
  cagrSuffix: (cagr: string) => string;
  passiveLine: (params: {
    annual: string;
    monthly: string;
    dividends: string;
    interest: string;
  }) => string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number, decimals = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(cents / 100);
}

function sign(n: number): string {
  return n >= 0 ? "+" : "";
}

function downloadFile(content: string, suffix: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finalibaba-${suffix}-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Markdown generation ───────────────────────────────────────────────────────

function buildMarkdown(
  data: AnalyticsExportData,
  sections: Set<Section>,
  s: AnalyticsExportStrings
): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines: string[] = [`# ${s.title} — ${date}`, ""];

  // ── Global summary ──
  if (sections.has("resume")) {
    lines.push(`## ${s.summary}`, "");
    lines.push(`| ${s.indicator} | ${s.value} |`);
    lines.push("|---|---|");
    const netLabel = data.hasTaxData ? s.netWorthAfterTax : s.netWorth;
    lines.push(
      `| ${netLabel} | **${fmt(data.hasTaxData ? data.netWorthAfterTax : data.netWorth)}** |`
    );
    lines.push(`| ${s.gross} | ${fmt(data.grossAssets)} |`);
    lines.push(`| ${s.debts} | ${fmt(data.totalLiabilities)} |`);
    if (data.hasTaxData) {
      lines.push(`| ${s.taxes} | ${fmt(data.totalLatentTax)} |`);
    }
    lines.push(`| ${s.investedRate} | ${data.investedPct}% |`);
    if (data.savingsRate !== null) {
      lines.push(
        `| ${s.savingsRate} | ${sign(data.savingsRate)}${data.savingsRate.toFixed(1)}% |`
      );
    }
    if (data.runwayMonths !== null) {
      lines.push(`| ${s.runway} | ${Math.floor(data.runwayMonths)} ${s.months} |`);
    }
    lines.push(`| ${s.goal} | ${s.goalFmt(fmt(data.goalCents), data.goalPct)} |`);
    lines.push("");
  }

  // ── Allocation ──
  if (sections.has("allocation") && data.allocationSlices.length > 0) {
    lines.push(`## ${s.allocation}`, "");
    lines.push(`| ${s.category} | ${s.value} | ${s.pct} |`);
    lines.push("|---|---|---|");
    for (const slice of data.allocationSlices) {
      lines.push(`| ${slice.name} | ${fmt(slice.valueCents)} | ${slice.pct}% |`);
    }
    lines.push("");
  }

  // ── Performance investissements ──
  if (sections.has("performance") && data.investPerfRows.length > 0) {
    lines.push(`## ${s.performance}`, "");
    lines.push(
      `| ${s.colAccount} | ${s.colValue} | ${s.colInvested} | ${s.colGrossGain} | ${s.colTax} | ${s.colPerf} |`
    );
    lines.push("|---|---|---|---|---|---|");
    for (const r of data.investPerfRows) {
      const label = r.subtype ? `${r.name} (${r.subtype})` : r.name;
      lines.push(
        `| ${label} | ${fmt(r.valueCents)} | ${fmt(r.costBasisCents)} | ${sign(r.gainCents)}${fmt(r.gainCents)} | -${fmt(r.taxCents)} | ${sign(r.returnPct)}${r.returnPct.toFixed(1)}% |`
      );
    }
    lines.push("");
    const netGain = data.investTotalGainCents - data.investTotalTaxCents;
    const cagrSuffix =
      data.investCAGR !== null
        ? s.cagrSuffix(`${sign(data.investCAGR)}${data.investCAGR.toFixed(1)}`)
        : "";
    lines.push(
      s.summaryLine({
        invested: fmt(data.investTotalCostBasisCents),
        value: fmt(data.investTotalValueCents),
        gain: `${sign(data.investTotalGainCents)}${fmt(data.investTotalGainCents)}`,
        netGain: `${sign(netGain)}${fmt(netGain)}`,
        perf: `${sign(data.investReturnPct)}${data.investReturnPct.toFixed(1)}`,
        cagr: cagrSuffix,
      })
    );
    lines.push("");
  }

  // ── Revenus passifs & dividendes ──
  if (sections.has("dividendes") && data.annualPassiveCents > 0) {
    lines.push(`## ${s.passive}`, "");
    lines.push(
      s.passiveLine({
        annual: fmt(data.annualPassiveCents),
        monthly: fmt(data.monthlyPassiveCents),
        dividends: fmt(data.annualDividendsCents),
        interest: fmt(data.annualInterestCents),
      })
    );
    lines.push("");
    if (data.dividendRows.length > 0) {
      lines.push(
        `| ${s.colAsset} | ${s.colEnvelope} | ${s.colYield} | ${s.colAnnualGross} | ${s.colAnnualNet} | ${s.colExDiv} |`
      );
      lines.push("|---|---|---|---|---|---|");
      for (const r of data.dividendRows) {
        const envelope = r.subtype ?? "CTO";
        const yieldStr = `${(r.divYield * 100).toFixed(2)}%`;
        const exDiv = r.exDividendDate
          ? new Date(r.exDividendDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—";
        lines.push(
          `| ${r.name} | ${envelope} | ${yieldStr} | ${fmt(r.annualEstCents)} | ${fmt(r.annualNetCents)} | ${exDiv} |`
        );
      }
      lines.push("");
    }
  }

  // ── Historique mensuel ──
  if (sections.has("historique") && data.performanceRows.length > 0) {
    lines.push(`## ${s.history}`, "");
    lines.push(`| ${s.colMonth} | ${s.colNetWorth} | ${s.colChange} | ${s.pct} |`);
    lines.push("|---|---|---|---|");
    for (const r of data.performanceRows) {
      const delta = r.delta !== null ? `${sign(r.delta)}${fmt(r.delta)}` : "—";
      const deltaPct =
        r.deltaPct !== null ? `${sign(r.deltaPct)}${r.deltaPct.toFixed(1)}%` : "—";
      lines.push(`| ${r.date} | ${fmt(r.netWorth)} | ${delta} | ${deltaPct} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportAnalyticsButton({ data }: { data: AnalyticsExportData }) {
  const t = useTranslations("exportAnalytics");

  const sections = [
    { id: "resume" as const, label: t("sectionSummary") },
    { id: "allocation" as const, label: t("sectionAllocation") },
    { id: "performance" as const, label: t("sectionPerformance") },
    { id: "dividendes" as const, label: t("sectionDividends") },
    { id: "historique" as const, label: t("sectionHistory") },
  ] satisfies { id: Section; label: string }[];

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Section>>(
    new Set(sections.map((s) => s.id))
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "export-analytics-title";

  // Accessibility: focus trap + Escape + body scroll lock
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    const modal = dialogRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const allSelected = sections.every((s) => selected.has(s.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sections.map((s) => s.id)));
  }

  function toggle(id: Section) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleExport() {
    const s: AnalyticsExportStrings = {
      title: t("mdTitle"),
      summary: t("mdSummary"),
      allocation: t("mdAllocation"),
      performance: t("mdPerformance"),
      passive: t("mdPassive"),
      history: t("mdHistory"),
      netWorthAfterTax: t("mdNetWorthAfterTax"),
      netWorth: t("mdNetWorth"),
      gross: t("mdGross"),
      debts: t("mdDebts"),
      taxes: t("mdTaxes"),
      investedRate: t("mdInvestedRate"),
      savingsRate: t("mdSavingsRate"),
      runway: t("mdRunway"),
      goal: t("mdGoal"),
      indicator: t("mdIndicator"),
      value: t("mdValue"),
      category: t("mdCategory"),
      pct: t("mdPct"),
      colAccount: t("mdColAccount"),
      colInvested: t("mdColInvested"),
      colValue: t("mdColValue"),
      colGrossGain: t("mdColGrossGain"),
      colTax: t("mdColTax"),
      colPerf: t("mdColPerf"),
      colNetWorth: t("mdColNetWorth"),
      colChange: t("mdColChange"),
      colAsset: t("mdColAsset"),
      colEnvelope: t("mdColEnvelope"),
      colYield: t("mdColYield"),
      colAnnualGross: t("mdColAnnualGross"),
      colAnnualNet: t("mdColAnnualNet"),
      colExDiv: t("mdColExDiv"),
      colMonth: t("mdColMonth"),
      months: t("mdMonths"),
      goalFmt: (amount, pct) => t("mdGoalFmt", { amount, pct }),
      summaryLine: (params) => t("mdSummaryLine", params),
      cagrSuffix: (cagr) => t("mdCagrSuffix", { cagr }),
      passiveLine: (params) => t("mdPassiveLine", params),
    };
    const md = buildMarkdown(data, selected, s);
    downloadFile(md, "analytique");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm text-[var(--muted)] border border-[var(--border)] rounded-lg hover:text-[var(--foreground)] hover:border-[var(--accent)]/40 transition-colors"
      >
        <Download size={14} aria-hidden="true" />
        {t("button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 id={titleId} className="font-semibold text-[var(--foreground)]">
                {t("title")}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Section list */}
            <div className="px-6 py-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {t("selectAll")}
                </span>
              </label>
              <div className="border-t border-[var(--border)]" />
              {sections.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="w-4 h-4 rounded accent-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">{s.label}</span>
                </label>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border)]">
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer min-h-[44px] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleExport}
                disabled={selected.size === 0}
                className="flex cursor-pointer items-center gap-1.5 min-h-[44px] px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={14} aria-hidden="true" />
                {t("export")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
