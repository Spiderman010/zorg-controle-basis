import { useMemo } from "react";
import {
  runChecks,
  computeMetrics,
  validateDataset,
  summarize,
  runTrendChecks,
  type Dataset,
} from "@/core";
import { StorageDiagnose } from "@/components/debug/StorageDiagnose";

const sample: Dataset = {
  revenue: [
    { dossier_id: "D1", period: "2025-01", source_file: "gb.xlsx", import_status: "valid", account_code: "8000", account_name: "WLZ opbrengsten", amount: 800_000, revenue_type: "WLZ" },
    { dossier_id: "D1", period: "2025-01", source_file: "gb.xlsx", import_status: "valid", account_code: "8010", account_name: "ZVW opbrengsten", amount: 200_000, revenue_type: "ZVW" },
  ],
  payroll: [
    { dossier_id: "D1", period: "2025-01", source_file: "loon.xlsx", import_status: "valid", payroll_component: "bruto loon", amount: 600_000 },
  ],
  external_hire: [
    { dossier_id: "D1", period: "2025-01", source_file: "crediteuren.xlsx", import_status: "valid", vendor_name: "ZZP A", amount: 100_000 },
  ],
  paid_hours: [
    { dossier_id: "D1", period: "2025-01", source_file: "loon.xlsx", import_status: "valid", employee_id: "E1", paid_hours: 10_000 },
  ],
  direct_hours: [
    { dossier_id: "D1", period: "2025-01", source_file: "rooster.xlsx", import_status: "valid", employee_id: "E1", direct_hours: 7_000 },
  ],
  non_productive_hours: [
    { dossier_id: "D1", period: "2025-01", source_file: "verzuim.xlsx", import_status: "valid", employee_id: "E1", non_productive_hours: 1_500 },
  ],
  secondary_totals: {
    revenue_total: 1_000_000,
    payroll_total: 600_000,
    external_hire_total: 100_000,
    paid_hours_total: 10_000,
  },
};

// Trendscenario's: vorige (2024-12) → huidige (2025-01)
const baseRec = (period: string, file: string) =>
  ({ dossier_id: "D1", period, source_file: file, import_status: "valid" as const });

const trendScenarios: { naam: string; vorig: Dataset; huidig: Dataset }[] = [
  {
    naam: "T01 — directe uren stijgen, opbrengsten dalen → oranje",
    vorig: {
      revenue: [{ ...baseRec("2024-12", "gb.csv"), account_code: "8000", account_name: "WLZ", amount: 1_000_000, revenue_type: "WLZ" }],
      direct_hours: [{ ...baseRec("2024-12", "uren.csv"), employee_id: "E1", direct_hours: 6_000 }],
    },
    huidig: {
      revenue: [{ ...baseRec("2025-01", "gb.csv"), account_code: "8000", account_name: "WLZ", amount: 900_000, revenue_type: "WLZ" }],
      direct_hours: [{ ...baseRec("2025-01", "uren.csv"), employee_id: "E1", direct_hours: 7_000 }],
    },
  },
  {
    naam: "T02 — personeelskosten stijgen, directe uren dalen → rood",
    vorig: {
      payroll: [{ ...baseRec("2024-12", "loon.csv"), payroll_component: "loon", amount: 500_000 }],
      direct_hours: [{ ...baseRec("2024-12", "uren.csv"), employee_id: "E1", direct_hours: 7_000 }],
    },
    huidig: {
      payroll: [{ ...baseRec("2025-01", "loon.csv"), payroll_component: "loon", amount: 600_000 }],
      direct_hours: [{ ...baseRec("2025-01", "uren.csv"), employee_id: "E1", direct_hours: 6_000 }],
    },
  },
  {
    naam: "T03 — inhuur stijgt, directe uren gelijk → oranje",
    vorig: {
      external_hire: [{ ...baseRec("2024-12", "ext.csv"), vendor_name: "ZZP", amount: 50_000 }],
      direct_hours: [{ ...baseRec("2024-12", "uren.csv"), employee_id: "E1", direct_hours: 6_000 }],
    },
    huidig: {
      external_hire: [{ ...baseRec("2025-01", "ext.csv"), vendor_name: "ZZP", amount: 80_000 }],
      direct_hours: [{ ...baseRec("2025-01", "uren.csv"), employee_id: "E1", direct_hours: 6_000 }],
    },
  },
  {
    naam: "T04 — opbrengsten stijgen, capaciteit gelijk → oranje",
    vorig: {
      revenue: [{ ...baseRec("2024-12", "gb.csv"), account_code: "8", account_name: "x", amount: 800_000, revenue_type: "WLZ" }],
      paid_hours: [{ ...baseRec("2024-12", "uren.csv"), employee_id: "E1", paid_hours: 10_000 }],
      external_hire: [{ ...baseRec("2024-12", "ext.csv"), vendor_name: "ZZP", amount: 50_000 }],
    },
    huidig: {
      revenue: [{ ...baseRec("2025-01", "gb.csv"), account_code: "8", account_name: "x", amount: 1_000_000, revenue_type: "WLZ" }],
      paid_hours: [{ ...baseRec("2025-01", "uren.csv"), employee_id: "E1", paid_hours: 10_000 }],
      external_hire: [{ ...baseRec("2025-01", "ext.csv"), vendor_name: "ZZP", amount: 50_000 }],
    },
  },
];

const STATUS_COLOR: Record<string, string> = {
  groen: "#16a34a",
  oranje: "#f59e0b",
  rood: "#dc2626",
  grijs: "#9ca3af",
};

const Index = () => {
  const metrics = useMemo(() => computeMetrics(sample), []);
  const issues = useMemo(() => validateDataset(sample), []);
  const results = useMemo(() => runChecks(sample), []);
  const score = useMemo(() => summarize(results), [results]);
  const trendOutputs = useMemo(
    () =>
      trendScenarios.map((s) => ({
        naam: s.naam,
        vorig: s.vorig,
        huidig: s.huidig,
        results: runTrendChecks(
          { label: "huidig", dataset: s.huidig },
          { label: "vorig", dataset: s.vorig },
        ),
      })),
    [],
  );

  return (
    <main className="min-h-screen p-8 font-mono text-sm" style={{ background: "#0b0f17", color: "#e5e7eb" }}>
      <h1 className="text-2xl mb-1 font-bold">Zorg Controle Basis — rekenkern</h1>
      <p className="mb-6 opacity-70">Demo-output op een ingebouwde voorbeelddataset. Tests: <code>npx vitest run</code></p>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Berekende waarden</h2>
        <pre className="p-4 rounded bg-black/40 overflow-auto">{JSON.stringify(metrics, null, 2)}</pre>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">
          Hoofdscore kerncontroles —{" "}
          {score.scorePercent === undefined ? "n.v.t." : `${score.scorePercent.toFixed(0)}%`}
        </h2>
        <div className="p-4 rounded mb-3" style={{ background: "#111827" }}>
          <div className="text-xs opacity-80 space-y-1">
            <div><span className="opacity-60">Aantal kerncontroles totaal:</span> {score.total}</div>
            <div><span className="opacity-60">Aantal uitvoerbare kerncontroles:</span> {score.uitvoerbaar} (telt mee)</div>
            <div><span className="opacity-60">Niet uitvoerbaar (grijs, telt niet mee):</span> {score.grijs}</div>
            <div className="pt-1">
              <span className="opacity-60">Verdeling:</span>{" "}
              <span style={{ color: STATUS_COLOR.groen }}>● {score.groen} groen</span>{" · "}
              <span style={{ color: STATUS_COLOR.oranje }}>● {score.oranje} oranje</span>{" · "}
              <span style={{ color: STATUS_COLOR.rood }}>● {score.rood} rood</span>{" · "}
              <span style={{ color: STATUS_COLOR.grijs }}>● {score.grijs} grijs</span>
            </div>
            <div className="pt-2"><span className="opacity-60">Scoreformule:</span> {score.formule}</div>
            <div>
              <span className="opacity-60">Tussenstap:</span>{" "}
              ({score.groen} × 1 + {score.oranje} × 0,5 + {score.rood} × 0) / {score.uitvoerbaar} ={" "}
              {score.teller} / {score.uitvoerbaar} ={" "}
              {score.score === undefined
                ? "n.v.t. (geen uitvoerbare kerncontroles)"
                : `${score.score.toFixed(4)} → ${score.scorePercent!.toFixed(1)}%`}
            </div>
            <div className="opacity-60 pt-1">Aanvullende trendcontroles tellen niet mee in deze score.</div>
          </div>
        </div>
        <h3 className="text-sm font-bold mb-2 opacity-80">Welke controles tellen mee?</h3>
        <ul className="space-y-2">
          {results.map((r) => {
            const meetelt = r.status !== "grijs";
            const gewicht = r.status === "groen" ? "1" : r.status === "oranje" ? "0,5" : "0";
            return (
              <li key={r.id} className="p-3 rounded flex items-start gap-3" style={{ background: "#111827" }}>
                <span className="inline-block w-3 h-3 rounded-full mt-1.5" style={{ background: STATUS_COLOR[r.status] }} />
                <div className="flex-1">
                  <div className="font-bold">
                    {r.label} <span className="opacity-60">[{r.status}]</span>{" "}
                    <span className="opacity-60 text-xs">
                      {meetelt ? `→ telt mee (gewicht ${gewicht})` : "→ telt niet mee"}
                    </span>
                  </div>
                  <div className="opacity-80">{r.message}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Aanvullende verbandscontroles (trend) — testscenario's</h2>
        <p className="mb-3 opacity-70 text-xs">Twee periodes per scenario; trendcontroles vergelijken vorige met huidige periode en tellen niet mee in totaalscores.</p>
        <div className="space-y-4">
          {trendOutputs.map((t, idx) => (
            <div key={idx} className="p-3 rounded" style={{ background: "#111827" }}>
              <div className="font-bold mb-2">{t.naam}</div>
              <details className="mb-2 opacity-70 text-xs">
                <summary className="cursor-pointer">Inputdata</summary>
                <pre className="mt-1 p-2 rounded bg-black/40 overflow-auto">vorig: {JSON.stringify(t.vorig, null, 2)}</pre>
                <pre className="mt-1 p-2 rounded bg-black/40 overflow-auto">huidig: {JSON.stringify(t.huidig, null, 2)}</pre>
              </details>
              <ul className="space-y-1">
                {t.results.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ background: STATUS_COLOR[r.status] }} />
                    <div className="flex-1">
                      <div><span className="opacity-60 mr-2">{r.code}</span><span className="font-bold">{r.label}</span> <span className="opacity-60">[{r.status}]</span></div>
                      <div className="opacity-80 text-xs">{r.message}</div>
                      {r.details && (
                        <div className="opacity-60 text-[11px] mt-1">
                          {Object.entries(r.details).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join(" · ")}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Validatie ({issues.length})</h2>
        {issues.length === 0 ? (
          <p className="opacity-70">Geen issues.</p>
        ) : (
          <pre className="p-4 rounded bg-black/40 overflow-auto">{JSON.stringify(issues, null, 2)}</pre>
        )}
      </section>
    </main>
  );
};

export default Index;
