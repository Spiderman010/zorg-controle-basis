import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDossier } from "@/lib/dossiers";
import { buildDataset } from "@/lib/datasetBuilder";
import {
  computeMetrics,
  runChecks,
  runTrendChecksFromDataset,
  type CheckId,
  type CheckResult,
  type CheckStatus,
  type TrendCheckResult,
} from "@/core";
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

interface ConclusieResult {
  conclusie: string;
  betrouwbaarheid: string;
  bevindingen: { code: string; status: CheckStatus; tekst: string }[];
  risicos: string[];
  verbeterpunten: string[];
}

function bouwConclusie(checks: CheckResult[], trends: TrendCheckResult[]): ConclusieResult {
  const all: { code: string; status: CheckStatus; label: string; message: string }[] = [
    ...checks.map((c) => ({ code: CHECK_CODES[c.id], status: c.status, label: c.label, message: c.message })),
    ...trends.map((t) => ({ code: t.code, status: t.status, label: t.label, message: t.message })),
  ];

  const totaalKern = checks.length;
  const uitvoerbaarKern = checks.filter((c) => c.status !== "grijs").length;
  const grijzeKern = checks.filter((c) => c.status === "grijs");
  const rood = all.filter((c) => c.status === "rood");
  const oranje = all.filter((c) => c.status === "oranje");
  const grijsAll = all.filter((c) => c.status === "grijs");
  const groen = all.filter((c) => c.status === "groen");

  // Conclusie kort en zakelijk, op basis van uitvoerbare kerncontroles
  let conclusie: string;
  if (uitvoerbaarKern === 0) {
    conclusie = "Geen oordeel mogelijk: geen enkele kerncontrole is uitvoerbaar door ontbrekende bronnen.";
  } else if (rood.length > 0) {
    conclusie = `Verhoogd risico: ${rood.length} controle(s) op rood. Nadere opvolging is noodzakelijk.`;
  } else if (oranje.length > 0) {
    conclusie = `Aandachtspunten: ${oranje.length} controle(s) op oranje. Verbeteradvies aanbevolen.`;
  } else {
    conclusie = `Beeld is positief: alle ${groen.length} uitvoerbare controle(s) zijn groen.`;
  }

  // Betrouwbaarheid
  let niveau: string;
  if (uitvoerbaarKern === totaalKern) niveau = "Hoog";
  else if (uitvoerbaarKern >= Math.ceil(totaalKern * 0.6)) niveau = "Gemiddeld";
  else if (uitvoerbaarKern >= Math.ceil(totaalKern * 0.3)) niveau = "Beperkt tot gemiddeld";
  else niveau = "Beperkt";
  let betrouwbaarheid = `${niveau}: ${uitvoerbaarKern} van de ${totaalKern} kerncontroles zijn uitvoerbaar op basis van de beschikbare bronnen.`;
  if (grijzeKern.length > 0) {
    const ontbrekend = grijzeKern.map((c) => c.message.replace(/^Niet uitvoerbaar – /, "")).slice(0, 3).join("; ");
    betrouwbaarheid += ` Beperking veroorzaakt door ontbrekende bronnen (${ontbrekend}${grijzeKern.length > 3 ? ", …" : ""}).`;
  }

  // Bevindingen geprioriteerd
  const bevindingen: ConclusieResult["bevindingen"] = [
    ...rood.map((c) => ({ code: c.code, status: "rood" as const, tekst: `${c.label}: ${c.message}` })),
    ...oranje.map((c) => ({ code: c.code, status: "oranje" as const, tekst: `${c.label}: ${c.message}` })),
    ...grijsAll.map((c) => ({ code: c.code, status: "grijs" as const, tekst: `${c.label}: ${c.message}` })),
  ];
  if (rood.length === 0 && oranje.length === 0 && grijsAll.length === 0 && groen.length > 0) {
    bevindingen.push({ code: "—", status: "groen", tekst: `${groen.length} controle(s) groen — geen bijzonderheden.` });
  }

  // Risico's
  const risicos = rood.map((c) => `${c.code} ${c.label} — ${c.message}`);

  // Verbeterpunten uit oranje + rood + grijs (concreet)
  const verbeterpunten: string[] = [];
  for (const c of rood) verbeterpunten.push(`${c.code} ${c.label}: nader onderzoek en onderbouwing nodig — ${c.message}`);
  for (const c of oranje) verbeterpunten.push(`${c.code} ${c.label}: oorzaak van afwijking analyseren — ${c.message}`);
  for (const c of grijsAll) {
    const reden = c.message.replace(/^Niet uitvoerbaar – /, "");
    verbeterpunten.push(`${c.code} ${c.label}: aanvullen ontbrekende onderbouwing (${reden}).`);
  }

  return { conclusie, betrouwbaarheid, bevindingen, risicos, verbeterpunten };
}

const STATUS_KLEUR: Record<CheckStatus, string> = {
  rood: "border-l-destructive",
  oranje: "border-l-warning",
  grijs: "border-l-muted-foreground",
  groen: "border-l-success",
};

export default function DossierRapportage() {
  const { id = "" } = useParams();
  const d = getDossier(id);

  const data = useMemo(() => {
    if (!d) return null;
    const { dataset } = buildDataset(d.id);
    return {
      dataset,
      metrics: computeMetrics(dataset),
      checks: runChecks(dataset),
      trends: runTrendChecksFromDataset(dataset),
    };
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

  const { metrics: m, checks, trends } = data;
  const c = bouwConclusie(checks, trends);

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
        <CardHeader><CardTitle className="text-base">Conclusie</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">{c.conclusie}</p>
          <p className="text-muted-foreground">{c.betrouwbaarheid}</p>
        </CardContent>
      </Card>

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
        <CardHeader><CardTitle className="text-base">Aanvullende verbandscontroles</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {trends.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{t.code}</span>
                <span className="flex-1">{t.label}</span>
                <span className="hidden text-xs text-muted-foreground md:inline">{t.message}</span>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Belangrijkste bevindingen</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {c.bevindingen.map((b, i) => (
              <li key={i} className={`border-l-2 pl-3 ${STATUS_KLEUR[b.status]}`}>
                <span className="font-mono text-xs text-muted-foreground">{b.code}</span>{" "}
                <span>{b.tekst}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top-risico's</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {c.risicos.length === 0 ? (
              <p className="text-muted-foreground">Geen rode controles geconstateerd.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">{c.risicos.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Verbeterpunten</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {c.verbeterpunten.length === 0 ? (
              <p className="text-muted-foreground">Geen verbeterpunten — alle controles in orde.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">{c.verbeterpunten.map((v, i) => <li key={i}>{v}</li>)}</ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
