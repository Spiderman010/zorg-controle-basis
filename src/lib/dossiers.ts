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

export function formatPeriode(d: Dossier): string {
  return `${d.periode_van} t/m ${d.periode_tot}`;
}
