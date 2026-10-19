// Toerekening van omzet/kosten/uren naar kostenplaatsen (projecten). Alleen weergave, raakt src/core niet.
import type { BronBestand } from "@/lib/bronnen";
import type { Project } from "@/lib/projecten";

export interface Totalen {
  omzet: number;
  kosten: number;
  uren: number;
  regels: number;
}

export interface ToerekeningRij extends Totalen {
  project: Project | null; // null = niet toegewezen
  kinderen: ToerekeningRij[]; // cliënten via deze opdrachtgever
}

const leeg = (): Totalen => ({ omzet: 0, kosten: 0, uren: 0, regels: 0 });

function getal(s: string | undefined): number {
  if (!s) return 0;
  const t = s.replace(/[€\s]/g, "");
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : 0;
}

function waarde(b: BronBestand, rij: string[], veld: string): number {
  const kolom = b.mapping?.[veld];
  if (!kolom) return 0;
  const i = b.headers.indexOf(kolom);
  return i < 0 ? 0 : getal(rij[i]);
}

export function berekenToerekening(bronnen: BronBestand[], projecten: Project[]): ToerekeningRij[] {
  const per = new Map<string, Totalen>();
  const tel = (id: string) => {
    if (!per.has(id)) per.set(id, leeg());
    return per.get(id)!;
  };
  for (const b of bronnen) {
    if (b.fout || b.type === "niet_gebruiken") continue;
    b.rijen.forEach((rij, idx) => {
      const pid = b.projecttoewijzingen?.[idx];
      const t = tel(pid && projecten.some((p) => p.id === pid) ? pid : "__geen");
      if (b.type === "zorgopbrengsten") t.omzet += waarde(b, rij, "bedrag");
      else if (b.type === "personeelskosten" || b.type === "inhuur") t.kosten += waarde(b, rij, "bedrag");
      else if (b.type === "directe_uren") t.uren += waarde(b, rij, "directe_uren");
      else return;
      t.regels += 1;
    });
  }
  const maak = (p: Project | null): ToerekeningRij => ({
    project: p,
    ...(per.get(p ? p.id : "__geen") ?? leeg()),
    kinderen: [],
  });
  const kindIds = new Set(
    projecten.filter((p) => p.rol === "client" && p.via_id && projecten.some((x) => x.id === p.via_id)).map((p) => p.id),
  );
  const top = projecten.filter((p) => !kindIds.has(p.id)).map((p) => {
    const r = maak(p);
    r.kinderen = projecten.filter((c) => kindIds.has(c.id) && c.via_id === p.id).map(maak);
    return r;
  });
  const geen = maak(null);
  if (geen.regels > 0) top.push(geen);
  return top;
}

/** Totaal inclusief cliënten eronder. */
export function totaalInclusief(r: ToerekeningRij): Totalen {
  return r.kinderen.reduce(
    (a, k) => ({ omzet: a.omzet + k.omzet, kosten: a.kosten + k.kosten, uren: a.uren + k.uren, regels: a.regels + k.regels }),
    { omzet: r.omzet, kosten: r.kosten, uren: r.uren, regels: r.regels },
  );
}

export function filterToerekening(rijen: ToerekeningRij[], zoek: string): ToerekeningRij[] {
  const q = zoek.trim().toLowerCase();
  if (!q) return rijen;
  const match = (r: ToerekeningRij) => (r.project?.naam ?? "niet toegewezen").toLowerCase().includes(q);
  return rijen
    .map((r) => (match(r) ? r : { ...r, kinderen: r.kinderen.filter(match) }))
    .filter((r) => match(r) || r.kinderen.length > 0);
}
