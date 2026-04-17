import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

const CHECK_FORMULES: Record<CheckId, string> = {
  revenue_reconciliation: "Σ zorgopbrengsten vs. tweede bron",
  payroll_reconciliation: "Σ personeelskosten vs. tweede bron",
  external_hire_reconciliation: "Σ inhuur vs. tweede bron",
  personnel_cost_ratio: "(personeelskosten + inhuur) / zorgopbrengsten",
  paid_hours_reconciliation: "Σ betaalde uren vs. tweede bron",
  direct_hours_ratio: "directe uren / betaalde uren",
  non_productive_hours_ratio: "niet-productieve uren / betaalde uren",
  remaining_hours_analysis: "(betaalde − direct − niet-productief) / betaalde",
};

const CHECK_BRONNEN: Record<CheckId, string> = {
  revenue_reconciliation: "Zorgopbrengsten + tweede bron",
  payroll_reconciliation: "Personeelskosten + tweede bron",
  external_hire_reconciliation: "Inhuur + tweede bron",
  personnel_cost_ratio: "Zorgopbrengsten, personeelskosten, inhuur",
  paid_hours_reconciliation: "Betaalde uren + tweede bron",
  direct_hours_ratio: "Betaalde uren, directe uren",
  non_productive_hours_ratio: "Betaalde uren, niet-productieve uren",
  remaining_hours_analysis: "Betaalde, directe en niet-productieve uren",
};

const CHECK_VERVOLG: Record<CheckId, string> = {
  revenue_reconciliation: "Controleer aansluiting met grootboek of subadministratie.",
  payroll_reconciliation: "Vergelijk met loonjournaalpost.",
  external_hire_reconciliation: "Vergelijk inkoopfacturen met grootboek.",
  personnel_cost_ratio: "Onderzoek loonkostenverhouding bij afwijking.",
  paid_hours_reconciliation: "Controleer met salarisadministratie.",
  direct_hours_ratio: "Analyseer urenregistratie en cliëntplanning.",
  non_productive_hours_ratio: "Bekijk verzuim, verlof en scholing.",
  remaining_hours_analysis: "Onderzoek niet-toegewezen uren en hun kosten.",
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

interface KPIProps {
  label: string;
  value: string;
  hint: string;
  status?: CheckResult["status"];
}

function KPICard({ label, value, hint, status }: KPIProps) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {status && <StatusBadge status={status} />}
        </div>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function DossierControle() {
  const { id = "" } = useParams();
  const d = getDossier(id);

  const data = useMemo(() => {
    if (!d) return null;
    const { dataset } = buildDataset(d.id);
    const metrics = computeMetrics(dataset);
    const checks = runChecks(dataset);
    const summary = summarize(checks);
    const byId = Object.fromEntries(checks.map((c) => [c.id, c])) as Record<CheckId, CheckResult>;
    return { dataset, metrics, checks, summary, byId };
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
  const { metrics, checks, summary, byId } = data;
  const m = metrics;

  const heeftBronnen = (data.dataset.revenue?.length ?? 0) > 0 || (data.dataset.payroll?.length ?? 0) > 0;

  if (!heeftBronnen) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Controle-overzicht</h1>
          <p className="text-sm text-muted-foreground">{d.bedrijfsnaam} — {d.dossiernaam}</p>
        </header>
        <Card>
          <CardContent className="p-6 text-sm">
            Er zijn nog niet genoeg geldige bronnen om een controle-overzicht te tonen.
          </CardContent>
        </Card>
        <Button asChild variant="outline">
          <Link to={`/dossiers/${d.id}/bronnen`}>Naar bronnen</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Controle-overzicht</h1>
          <p className="text-sm text-muted-foreground">{d.bedrijfsnaam} — {d.dossiernaam}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to={`/dossiers/${d.id}`}>Terug</Link></Button>
          <Button asChild><Link to={`/dossiers/${d.id}/rapportage`}>Rapportage</Link></Button>
        </div>
      </header>

      {/* KPI's */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Kerncijfers</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <KPICard label="Zorgopbrengsten" value={fmtEUR(m.totals.revenue)} hint="Totale omzet uit zorg." />
          <KPICard label="Personeelskosten" value={fmtEUR(m.totals.payroll)} hint="Lonen en sociale lasten." />
          <KPICard label="Inhuur" value={fmtEUR(m.totals.external_hire)} hint="Externe inhuur (zzp, detachering)." />
          <KPICard
            label="Personeelslastenratio"
            value={fmtPct(m.personnel_cost_ratio)}
            hint="(personeel + inhuur) / omzet."
            status={byId.personnel_cost_ratio?.status}
          />
          <KPICard label="Betaalde uren" value={fmtNum(m.totals.paid_hours, 0)} hint="Verloonde uren totaal." />
          <KPICard
            label="Directe urenratio"
            value={fmtPct(m.direct_hours_ratio)}
            hint="Cliëntgebonden uren / betaalde uren."
            status={byId.direct_hours_ratio?.status}
          />
          <KPICard
            label="Niet-productieve urenratio"
            value={fmtPct(m.non_productive_hours_ratio)}
            hint="Verlof, ziekte, scholing / betaalde uren."
            status={byId.non_productive_hours_ratio?.status}
          />
          <KPICard label="Resturen" value={fmtNum(m.remaining_hours, 1)} hint="Niet-toegewezen uren." />
          <KPICard
            label="Resturenratio"
            value={fmtPct(m.remaining_hours_ratio)}
            hint="Resturen / betaalde uren."
            status={byId.remaining_hours_analysis?.status}
          />
          <KPICard
            label="Resturen euro-impact"
            value={fmtEUR(m.remaining_hours_euro_impact)}
            hint="Resturen × gemiddeld uurloon."
          />
        </div>
      </section>

      {/* Controles */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Kerncontroles</h2>
          <p className="text-xs text-muted-foreground">
            Score: {summary.score === undefined ? "—" : `${(summary.score * 100).toFixed(0)}%`}
            {" · "}
            {summary.groen} groen · {summary.oranje} oranje · {summary.rood} rood · {summary.grijs} grijs (telt niet mee)
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {checks.map((c) => (
                <AccordionItem key={c.id} value={c.id} className="px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center gap-3 pr-4 text-left">
                      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{CHECK_CODES[c.id]}</span>
                      <span className="flex-1 text-sm font-medium">{c.label}</span>
                      <span className="hidden text-xs text-muted-foreground md:inline">{c.message}</span>
                      <StatusBadge status={c.status} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4 pl-20 pr-4 text-sm">
                    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase text-muted-foreground">Formule</dt>
                        <dd className="font-mono text-xs">{CHECK_FORMULES[c.id]}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase text-muted-foreground">Gebruikte bronnen</dt>
                        <dd>{CHECK_BRONNEN[c.id]}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase text-muted-foreground">Uitkomst</dt>
                        <dd className="tabular-nums">
                          {c.value === undefined
                            ? "—"
                            : c.id.endsWith("_ratio")
                            ? fmtPct(c.value)
                            : fmtNum(c.value, 2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase text-muted-foreground">Status</dt>
                        <dd><StatusBadge status={c.status} /></dd>
                      </div>
                      {c.details && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase text-muted-foreground">Inputwaarden</dt>
                          <dd className="font-mono text-xs">
                            {Object.entries(c.details)
                              .filter(([, v]) => v !== undefined)
                              .map(([k, v]) => `${k}: ${typeof v === "number" ? fmtNum(v, 2) : v}`)
                              .join(" · ")}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className="text-muted-foreground">{c.message}</p>
                    <p className="text-xs"><span className="font-medium">Aanbevolen vervolgstap:</span> {CHECK_VERVOLG[c.id]}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
