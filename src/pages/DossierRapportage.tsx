import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDossier } from "@/lib/dossiers";
import { buildDataset } from "@/lib/datasetBuilder";
import { computeMetrics, runChecks, summarize, type CheckId, type CheckResult } from "@/core";
import { StatusBadge } from "@/components/controle/StatusBadge";

const CHECK_CODES: Record<CheckId, string> = {
  revenue_reconciliation: "V1-C01",
  payroll_reconciliation: "V1-C02",
  external_hire_reconciliation: "V1-C03",
  personnel_cost_ratio: "V1-C04",
  paid_hours_reconciliation: "V1-C05",
  direct_hours_ratio: "V1-C06",
  non_productive_hours_ratio: "V1-C07",
  remaining_hours_analysis: "V1-C08",
};

function fmtEUR(n: number | undefined) {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number | undefined, digits = 1) {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: digits }).format(n);
}
function fmtPct(n: number | undefined) {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function bouwConclusie(checks: CheckResult[]): {
  conclusie: string;
  bevindingen: string[];
  risicos: string[];
  verbeterpunten: string[];
  betrouwbaarheid: string;
} {
  const uitvoerbaar = checks.filter((c) => c.status !== "grijs");
  const grijs = checks.filter((c) => c.status === "grijs");
  const rood = uitvoerbaar.filter((c) => c.status === "rood");
  const oranje = uitvoerbaar.filter((c) => c.status === "oranje");
  const groen = uitvoerbaar.filter((c) => c.status === "groen");

  let conclusie: string;
  if (uitvoerbaar.length === 0) {
    conclusie = "Er zijn geen uitvoerbare controles. Vul aanvullende bronnen aan om een oordeel te kunnen geven.";
  } else if (rood.length > 0) {
    conclusie = `Er is sprake van een verhoogd risico: ${rood.length} controle(s) staan op rood. Nadere opvolging en onderbouwing is noodzakelijk.`;
  } else if (oranje.length > 0) {
    conclusie = `De controles zijn grotendeels in orde, maar ${oranje.length} aandachtspunt(en) verdienen nadere analyse en verbeteradvies.`;
  } else {
    conclusie = `Alle ${groen.length} uitvoerbare controles zijn groen. Het beeld is positief en consistent.`;
  }

  const bevindingen = uitvoerbaar.map((c) => `${CHECK_CODES[c.id]} ${c.label}: ${c.message}`);
  const risicos = rood.map((c) => `${CHECK_CODES[c.id]} ${c.label} — ${c.message}`);
  const verbeterpunten = oranje.map((c) => `${CHECK_CODES[c.id]} ${c.label} — ${c.message}`);

  const totaal = checks.length;
  const dekking = totaal === 0 ? 0 : Math.round((uitvoerbaar.length / totaal) * 100);
  let betrouwbaarheid: string;
  if (dekking >= 80) betrouwbaarheid = `Hoog (${dekking}% van de controles uitvoerbaar).`;
  else if (dekking >= 50) betrouwbaarheid = `Gemiddeld (${dekking}% van de controles uitvoerbaar). Aanvullende bronnen vergroten de betrouwbaarheid.`;
  else betrouwbaarheid = `Beperkt (${dekking}% van de controles uitvoerbaar). Vul aanvullende bronnen aan voor een vollediger beeld.`;

  if (grijs.length > 0) {
    bevindingen.push(`${grijs.length} controle(s) zijn niet uitvoerbaar wegens ontbrekende bronnen en wegen niet mee in het oordeel.`);
  }

  return { conclusie, bevindingen, risicos, verbeterpunten, betrouwbaarheid };
}

export default function DossierRapportage() {
  const { id = "" } = useParams();
  const d = getDossier(id);

  const data = useMemo(() => {
    if (!d) return null;
    const { dataset } = buildDataset(d.id);
    return { dataset, metrics: computeMetrics(dataset), checks: runChecks(dataset), summary: summarize(runChecks(dataset)) };
  }, [d]);

  if (!d) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Dossier niet gevonden</h1>
        <Button asChild variant="outline"><Link to="/">Terug naar dashboard</Link></Button>
      </div>
    );
  }
  if (!data) return null;

  const heeftBronnen = (data.dataset.revenue?.length ?? 0) > 0 || (data.dataset.payroll?.length ?? 0) > 0;
  if (!heeftBronnen) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Rapportage</h1>
          <p className="text-sm text-muted-foreground">{d.bedrijfsnaam} — {d.dossiernaam}</p>
        </header>
        <Card>
          <CardContent className="p-6 text-sm">
            Vul eerst voldoende brondata aan om rapportage te genereren.
          </CardContent>
        </Card>
        <Button asChild variant="outline">
          <Link to={`/dossiers/${d.id}/bronnen`}>Naar bronnen</Link>
        </Button>
      </div>
    );
  }

  const { metrics: m, checks } = data;
  const c = bouwConclusie(checks);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Managementsamenvatting</h1>
          <p className="text-sm text-muted-foreground">
            {d.bedrijfsnaam} · {d.dossiernaam} · {d.periode_van} t/m {d.periode_tot}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button asChild variant="outline"><Link to={`/dossiers/${d.id}/controle`}>Naar controle-overzicht</Link></Button>
          <Button onClick={() => window.print()}>Afdrukken</Button>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Kerncijfers</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {([
              ["Totaal zorgopbrengsten", fmtEUR(m.totals.revenue)],
              ["Totaal personeelskosten", fmtEUR(m.totals.payroll)],
              ["Totaal inhuur", fmtEUR(m.totals.external_hire)],
              ["Personeelslastenratio", fmtPct(m.personnel_cost_ratio)],
              ["Directe urenratio", fmtPct(m.direct_hours_ratio)],
              ["Niet-productieve urenratio", fmtPct(m.non_productive_hours_ratio)],
              ["Resturen", fmtNum(m.remaining_hours, 1)],
              ["Resturenratio", fmtPct(m.remaining_hours_ratio)],
              ["Resturen euro-impact", fmtEUR(m.remaining_hours_euro_impact)],
            ] as const).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Status per kerncontrole</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {checks.map((ch) => (
              <li key={ch.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{CHECK_CODES[ch.id]}</span>
                <span className="flex-1">{ch.label}</span>
                <span className="hidden text-xs text-muted-foreground md:inline">{ch.message}</span>
                <StatusBadge status={ch.status} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Conclusie</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{c.conclusie}</p>

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Belangrijkste bevindingen</h3>
            <ul className="list-disc space-y-1 pl-5">
              {c.bevindingen.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top-risico's</h3>
            {c.risicos.length === 0 ? (
              <p className="text-muted-foreground">Geen rode controles geconstateerd.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">{c.risicos.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
          </div>

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verbeterpunten</h3>
            {c.verbeterpunten.length === 0 ? (
              <p className="text-muted-foreground">Geen oranje controles geconstateerd.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">{c.verbeterpunten.map((v, i) => <li key={i}>{v}</li>)}</ul>
            )}
          </div>

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Betrouwbaarheid van de analyse</h3>
            <p>{c.betrouwbaarheid}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
