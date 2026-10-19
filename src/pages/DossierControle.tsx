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
import {
  computeMetrics,
  computeFinancieringsMix,
  computeProjectAnalyse,
  computeSollOmzet,
  computeUrenVerband,
  financieringsSignaal,
  runChecks,
  runTrendChecksFromDataset,
  summarize,
  STROOM_LABELS,
  type CheckId,
  type CheckResult,
} from "@/core";
import { listProjecten } from "@/lib/projecten";
import { StatusBadge } from "@/components/controle/StatusBadge";
import { UrenVerbandKaart } from "@/components/controle/UrenVerbandKaart";

const CHECK_CODES: Record<CheckId, string> = {
  revenue_reconciliation: "V1-C01",
  payroll_reconciliation: "V1-C02",
  external_hire_reconciliation: "V1-C03",
  personnel_cost_ratio: "V1-C04",
  paid_hours_reconciliation: "V1-C05",
  direct_hours_ratio: "V1-C06",
  non_productive_hours_ratio: "V1-C07",
  remaining_hours_analysis: "V1-C08",
  soll_omzet_check: "V1-C09",
  declared_hours_check: "V1-C10",
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
  soll_omzet_check: "(omzet − directe uren × tarief) / (directe uren × tarief)",
  declared_hours_check: "(gedeclareerde − gewerkte directe uren) / gewerkte directe uren, per kostenplaats",
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
  soll_omzet_check: "Zorgopbrengsten, directe uren, tarieven (projecten/standaard)",
  declared_hours_check: "Gedeclareerde uren, directe uren, kostenplaatsen",
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
  soll_omzet_check: "Onderzoek tariefverschillen, niet-gedeclareerde uren of omzet zonder uren.",
  declared_hours_check: "Onderzoek per kostenplaats: te veel gedeclareerd (risico op terugvordering) of uren zonder declaratie (gemiste omzet).",
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

interface Meter {
  /** Drempels als fractie (0-1), alleen voor weergave; statuslogica zit in de rekenkern. */
  oranje: number;
  rood: number;
  /** "hoog" = hoger is slechter, "laag" = lager is slechter */
  richting: "hoog" | "laag";
}

interface KPIProps {
  label: string;
  value: string;
  hint: string;
  status?: CheckResult["status"];
  ratio?: number;
  meter?: Meter;
}

function DrempelMeter({ ratio, meter }: { ratio?: number; meter: Meter }) {
  const pct = (n: number) => `${Math.min(100, Math.max(0, n * 100))}%`;
  const hoog = meter.richting === "hoog";
  const lo = Math.min(meter.oranje, meter.rood);
  const hi = Math.max(meter.oranje, meter.rood);
  return (
    <div className="space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`absolute inset-y-0 ${hoog ? "bg-warning/40" : "bg-warning/40"}`} style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
        <div className="absolute inset-y-0 bg-destructive/40" style={hoog ? { left: pct(hi), right: 0 } : { left: 0, width: pct(lo) }} />
        <div className="absolute inset-y-0 bg-success/40" style={hoog ? { left: 0, width: pct(lo) } : { left: pct(hi), right: 0 }} />
        {ratio !== undefined && Number.isFinite(ratio) && (
          <div className="absolute -top-0.5 h-3 w-1 rounded bg-foreground" style={{ left: `calc(${pct(ratio)} - 2px)` }} />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Oranje {hoog ? ">" : "<"} {(meter.oranje * 100).toFixed(0)}% · rood {hoog ? ">" : "<"} {(meter.rood * 100).toFixed(0)}%
      </p>
    </div>
  );
}

function KPICard({ label, value, hint, status, ratio, meter }: KPIProps) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {status && <StatusBadge status={status} />}
        </div>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        {meter && <DrempelMeter ratio={ratio} meter={meter} />}
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
    const projecten = listProjecten(d.id);
    const sollConfig = { projecten, standaard_tarief: d.standaard_tarief };
    const checks = runChecks(dataset, { soll: sollConfig, urenverband: { projecten } });
    const trends = runTrendChecksFromDataset(dataset);
    const summary = summarize(checks);
    const mix = computeFinancieringsMix(dataset);
    const mixSignaal = financieringsSignaal(mix);
    const projectAnalyse = projecten.length > 0 ? computeProjectAnalyse(dataset, projecten) : [];
    const soll = computeSollOmzet(dataset, sollConfig);
    const urenVerband = computeUrenVerband(dataset, { projecten });
    const byId = Object.fromEntries(checks.map((c) => [c.id, c])) as Record<CheckId, CheckResult>;
    return { dataset, metrics, checks, trends, summary, mix, mixSignaal, projecten, projectAnalyse, soll, urenVerband, byId };
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
  const { metrics, checks, trends, summary, mix, mixSignaal, projectAnalyse, soll, urenVerband, byId } = data;
  const sollPerProject = Object.fromEntries(soll.regels.map((r) => [r.project_id, r]));
  const toonSoll = soll.regels.some((r) => r.tarief !== undefined);
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
            ratio={m.personnel_cost_ratio}
            meter={{ oranje: 0.75, rood: 0.85, richting: "hoog" }}
          />
          <KPICard label="Betaalde uren" value={fmtNum(m.totals.paid_hours, 0)} hint="Verloonde uren totaal." />
          <KPICard
            label="Directe urenratio"
            value={fmtPct(m.direct_hours_ratio)}
            hint="Cliëntgebonden uren / betaalde uren."
            status={byId.direct_hours_ratio?.status}
            ratio={m.direct_hours_ratio}
            meter={{ oranje: 0.6, rood: 0.5, richting: "laag" }}
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
            ratio={m.remaining_hours_ratio}
            meter={{ oranje: 0.15, rood: 0.25, richting: "hoog" }}
          />
          <KPICard
            label="Resturen euro-impact"
            value={fmtEUR(m.remaining_hours_euro_impact)}
            hint="Resturen × gemiddeld uurloon."
          />
        </div>
      </section>

      {/* Financieringsmix */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Financieringsmix</h2>
        <Card>
          <CardContent className="space-y-4 p-4">
            {mix.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen zorgopbrengsten beschikbaar.</p>
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  {mix.entries.map((e) =>
                    e.share !== undefined && e.share > 0 ? (
                      <div
                        key={e.stroom}
                        className={e.stroom === "onbekend" ? "bg-muted-foreground/30" : "bg-primary/80 [&:nth-child(even)]:bg-primary/50"}
                        style={{ width: `${(e.share * 100).toFixed(2)}%` }}
                        title={`${e.label}: ${fmtPct(e.share)}`}
                      />
                    ) : null,
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {mix.entries.map((e) => (
                    <div key={e.stroom} className="rounded-md border p-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{e.label}</p>
                      <p className="text-sm font-semibold tabular-nums">{fmtEUR(e.amount)}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">{fmtPct(e.share)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="flex items-start gap-3 border-t pt-3">
              <StatusBadge status={mixSignaal.status} />
              <div className="text-sm">
                <p className="font-medium">Signaal: meerdere wettelijke kaders</p>
                <p className="text-muted-foreground">{mixSignaal.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">Informatief signaal — telt niet mee in de hoofdscore.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Uren-controle: gedeclareerd tegen gewerkt (apart, niet in de hoofdscore) */}
      <UrenVerbandKaart resultaat={urenVerband} />

      {/* Projecten */}
      {projectAnalyse.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Projecten</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left">Project</th>
                      <th className="px-4 py-2 text-right">Opbrengsten</th>
                      <th className="px-4 py-2 text-right">Aandeel</th>
                      <th className="px-4 py-2 text-right">Inhuur</th>
                      <th className="px-4 py-2 text-right">Directe uren</th>
                      <th className="px-4 py-2 text-right">Aandeel uren</th>
                      <th className="px-4 py-2 text-right">Opbrengst per uur</th>
                      {toonSoll && (
                        <>
                          <th className="px-4 py-2 text-right">Tarief</th>
                          <th className="px-4 py-2 text-right">Soll-omzet</th>
                          <th className="px-4 py-2 text-right">Afwijking</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {projectAnalyse.map((p) => (
                      <tr key={p.project_id} className="border-t">
                        <td className="px-4 py-2">
                          {p.naam}
                          {p.stroom && (
                            <span className="ml-2 text-xs text-muted-foreground">{STROOM_LABELS[p.stroom]}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(p.revenue)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtPct(p.revenue_share)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(p.external_hire)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtNum(p.direct_hours, 1)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtPct(p.direct_hours_share)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(p.revenue_per_direct_hour)}</td>
                        {toonSoll && (
                          <>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(sollPerProject[p.project_id]?.tarief)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtEUR(sollPerProject[p.project_id]?.soll)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{fmtPct(sollPerProject[p.project_id]?.afwijking)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Opbrengst per uur = opbrengsten / directe uren van het project (gerealiseerd tarief). Projecten zijn
            informatief en tellen niet mee in de hoofdscore; niet-toegewezen regels vallen onder "Algemeen".
          </p>
        </section>
      )}

      {/* Hoofdscore */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Hoofdscore kerncontroles</h2>
        <Card>
          <CardContent className="space-y-2 p-4">
            {summary.scorePercent === undefined ? (
              <p className="text-sm">Nog geen uitvoerbare kerncontroles beschikbaar.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-semibold tabular-nums">{summary.scorePercent.toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">
                    op basis van {summary.uitvoerbaar} van de {summary.total} kerncontroles
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.groen} groen · {summary.oranje} oranje · {summary.rood} rood · {summary.grijs} grijs (telt niet mee)
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  ({summary.groen} × 1 + {summary.oranje} × 0,5 + {summary.rood} × 0) / {summary.uitvoerbaar} ={" "}
                  {summary.teller} / {summary.uitvoerbaar} = {summary.scorePercent.toFixed(1)}%
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Controles */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Kerncontroles</h2>
          <p className="text-xs text-muted-foreground">
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
                            : c.id.endsWith("_ratio") || c.id === "soll_omzet_check"
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

      {/* Aanvullende verbandscontroles (trend) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Aanvullende verbandscontroles</h2>
        <Card>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {trends.map((t) => (
                <AccordionItem key={t.id} value={t.id} className="px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center gap-3 pr-4 text-left">
                      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{t.code}</span>
                      <span className="flex-1 text-sm font-medium">{t.label}</span>
                      <span className="hidden text-xs text-muted-foreground md:inline">{t.message}</span>
                      <StatusBadge status={t.status} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pb-4 pl-20 pr-4 text-sm">
                    <p className="text-muted-foreground">{t.message}</p>
                    {t.details && (
                      <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-xs">
                        {Object.entries(t.details)
                          .filter(([, v]) => v !== undefined)
                          .map(([k, v]) => (
                            <div key={k} className="font-mono">
                              <span className="text-muted-foreground">{k}:</span>{" "}
                              {typeof v === "number" ? fmtNum(v, 2) : v}
                            </div>
                          ))}
                      </dl>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Trendcontroles vergelijken de laatste twee periodes en tellen niet mee in de score.
        </p>
      </section>
    </div>
  );
}
