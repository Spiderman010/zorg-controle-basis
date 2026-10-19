// Eenvoudige client-side opslag voor controledossiers (Fase 2A).
// Later vervangen door Lovable Cloud.

export type PeriodeType = "maand" | "kwartaal" | "jaar";
export type ControleType = "basiscontrole" | "basiscontrole + urenanalyse";
export type DossierStatus = "nieuw" | "in behandeling" | "afgerond";

export interface Dossier {
  id: string;
  bedrijfsnaam: string;
  dossiernaam: string;
  periode_van: string; // YYYY-MM-DD
  periode_tot: string; // YYYY-MM-DD
  periode_type: PeriodeType;
  controle_type: ControleType;
  status: DossierStatus;
  aangemaakt_op: string; // ISO
  /** Terugval-uurtarief voor de soll-omzetcontrole (projecten zonder eigen tarief en "Algemeen"). */
  standaard_tarief?: number;
}

const KEY = "zcb.dossiers.v1";

export function listDossiers(): Dossier[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Dossier[];
  } catch {
    return [];
  }
}

export function getDossier(id: string): Dossier | undefined {
  return listDossiers().find((d) => d.id === id);
}

/** Schrijft een dossier met een bekende id: vervangt het bestaande met dezelfde id, of voegt toe. */
export function upsertDossier(d: Dossier) {
  const all = listDossiers();
  const idx = all.findIndex((x) => x.id === d.id);
  if (idx >= 0) all[idx] = d;
  else all.unshift(d);
  localStorage.setItem(KEY, JSON.stringify(all));
}

/** Verwijdert alleen het dossier zelf; de bijbehorende kostenplaatsen en bronnen moeten apart worden opgeruimd. */
export function deleteDossier(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listDossiers().filter((d) => d.id !== id)));
}

export function saveDossier(input: Omit<Dossier, "id" | "status" | "aangemaakt_op">): Dossier {
  const all = listDossiers();
  const dossier: Dossier = {
    ...input,
    id: crypto.randomUUID(),
    status: "nieuw",
    aangemaakt_op: new Date().toISOString(),
  };
  all.unshift(dossier);
  localStorage.setItem(KEY, JSON.stringify(all));
  return dossier;
}

export function updateDossier(id: string, patch: Partial<Pick<Dossier, "status" | "standaard_tarief">>) {
  const all = listDossiers().map((d) => (d.id === id ? { ...d, ...patch } : d));
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function formatPeriode(d: Dossier): string {
  return `${d.periode_van} t/m ${d.periode_tot}`;
}
