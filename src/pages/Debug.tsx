import { useMemo } from "react";
import { runChecks, computeMetrics, validateDataset, summarize, type Dataset } from "@/core";

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

  return (
    <main className="min-h-screen p-8 font-mono text-sm" style={{ background: "#0b0f17", color: "#e5e7eb" }}>
      <h1 className="text-2xl mb-1 font-bold">Zorg Controle Basis — rekenkern</h1>
      <p className="mb-6 opacity-70">Demo-output op een ingebouwde voorbeelddataset. Tests: <code>npx vitest run</code></p>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Berekende waarden</h2>
        <pre className="p-4 rounded bg-black/40 overflow-auto">{JSON.stringify(metrics, null, 2)}</pre>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Controles ({score.total}) — score: {score.score !== undefined ? (score.score * 100).toFixed(0) + "%" : "n.v.t."}</h2>
        <p className="mb-1 opacity-70">groen: {score.groen} · oranje: {score.oranje} · rood: {score.rood} · grijs: {score.grijs} (niet meegerekend)</p>
        <p className="mb-3 opacity-60 text-xs">
          Formule: score = (groen × 1 + oranje × 0,5 + rood × 0) / (groen + oranje + rood)
          {" = "}({score.groen} + 0,5 × {score.oranje} + 0 × {score.rood}) / {score.groen + score.oranje + score.rood}
          {score.score !== undefined && ` = ${score.score.toFixed(3)} → ${(score.score * 100).toFixed(0)}%`}
          . Grijze controles ({score.grijs}) tellen niet mee.
        </p>
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id} className="p-3 rounded flex items-start gap-3" style={{ background: "#111827" }}>
              <span className="inline-block w-3 h-3 rounded-full mt-1.5" style={{ background: STATUS_COLOR[r.status] }} />
              <div className="flex-1">
                <div className="font-bold">{r.label} <span className="opacity-60">[{r.status}]</span></div>
                <div className="opacity-80">{r.message}</div>
              </div>
            </li>
          ))}
        </ul>
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
