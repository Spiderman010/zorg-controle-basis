// Back-up en terugzetten van dossiers, kostenplaatsen en bronnen in één JSON-bestand.
// Het bestand kan gegevens van medewerkers en cliënten bevatten. De PDF-originelen van
// bronnen zitten niet in de back-up; de ingelezen gegevens wel.
import { listDossiers, upsertDossier, type Dossier } from "./dossiers";
import { listAllProjecten, upsertProject, deleteProjectsVanDossier, type Project } from "./projecten";
import { listAllBronnen, upsertBron, deleteBronnenVanDossier, type BronBestand } from "./bronnen";

export const BACKUP_APP = "zorg-controle-basis";
export const BACKUP_VERSIE = 1;

export interface Backup {
  app: string;
  versie: number;
  gemaakt_op: string;
  dossiers: Dossier[];
  projecten: Project[];
  bronnen: BronBestand[];
}

export type LeesResultaat =
  | { ok: true; backup: Backup; aantal: { dossiers: number; projecten: number; bronnen: number } }
  | { ok: false; fout: string };

export function maakBackup(nu: Date = new Date()): Backup {
  return {
    app: BACKUP_APP,
    versie: BACKUP_VERSIE,
    gemaakt_op: nu.toISOString(),
    dossiers: listDossiers(),
    projecten: listAllProjecten(),
    bronnen: listAllBronnen(),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Leest en controleert de opbouw van een back-up. Schrijft niets weg. */
export function leesBackup(tekst: string): LeesResultaat {
  const fout = (f: string): LeesResultaat => ({ ok: false, fout: f });
  let data: unknown;
  try {
    data = JSON.parse(tekst);
  } catch {
    return fout("Dit bestand is geen geldige back-up: het is geen leesbare JSON.");
  }
  if (!isObj(data)) return fout("Dit bestand is geen geldige back-up.");
  if (data.app !== BACKUP_APP) return fout("Dit bestand is geen back-up van deze app.");
  if (data.versie !== BACKUP_VERSIE) {
    return fout(`Versie ${String(data.versie)} wordt niet ondersteund (verwacht versie ${BACKUP_VERSIE}).`);
  }
  for (const onderdeel of ["dossiers", "projecten", "bronnen"]) {
    if (!Array.isArray(data[onderdeel])) return fout(`Onderdeel "${onderdeel}" ontbreekt of is geen lijst.`);
  }
  const dossiers = data.dossiers as unknown[];
  const projecten = data.projecten as unknown[];
  const bronnen = data.bronnen as unknown[];
  if (!dossiers.every((d) => isObj(d) && typeof d.id === "string")) return fout("Een dossier in de back-up heeft geen id.");
  if (!projecten.every((p) => isObj(p) && typeof p.id === "string" && typeof p.dossier_id === "string" && typeof p.naam === "string")) {
    return fout("Een kostenplaats in de back-up is onvolledig.");
  }
  if (!bronnen.every((b) => isObj(b) && typeof b.id === "string" && typeof b.dossier_id === "string" && typeof b.type === "string" && Array.isArray(b.headers) && Array.isArray(b.rijen))) {
    return fout("Een bron in de back-up is onvolledig.");
  }
  const dossierIds = new Set((dossiers as { id: string }[]).map((d) => d.id));
  const wees = [...(projecten as { dossier_id: string }[]), ...(bronnen as { dossier_id: string }[])].some((x) => !dossierIds.has(x.dossier_id));
  if (wees) return fout("Een kostenplaats of bron hoort bij een dossier dat niet in het bestand staat.");

  const backup = data as unknown as Backup;
  return {
    ok: true,
    backup,
    aantal: { dossiers: dossiers.length, projecten: projecten.length, bronnen: bronnen.length },
  };
}

export interface TerugzetPlan {
  /** Dossiers die worden geschreven (nieuw of, met overschrijven, bestaand). */
  teSchrijven: Dossier[];
  /** Dossiers die al bestaan en zonder overschrijven worden overgeslagen. */
  overgeslagen: string[];
  /** Hoeveel er nieuw wordt toegevoegd en hoeveel bestaande worden vervangen. */
  toegevoegd: number;
  vervangen: number;
}

/** Bepaalt wat er gebeurt, zonder iets te schrijven. */
export function planTerugzetten(backup: Backup, bestaandeIds: Set<string>, overschrijven: boolean): TerugzetPlan {
  const teSchrijven: Dossier[] = [];
  const overgeslagen: string[] = [];
  let toegevoegd = 0;
  let vervangen = 0;
  for (const d of backup.dossiers) {
    const bestaat = bestaandeIds.has(d.id);
    if (bestaat && !overschrijven) {
      overgeslagen.push(d.id);
      continue;
    }
    teSchrijven.push(d);
    if (bestaat) vervangen += 1;
    else toegevoegd += 1;
  }
  return { teSchrijven, overgeslagen, toegevoegd, vervangen };
}

/**
 * Zet een gecontroleerde back-up terug. Bestaande dossiers met dezelfde id worden alleen
 * vervangen als `overschrijven` waar is; dan worden ook hun kostenplaatsen en bronnen vervangen.
 */
export function terugzetten(backup: Backup, overschrijven: boolean): { toegevoegd: number; vervangen: number; overgeslagen: number } {
  const bestaandeIds = new Set(listDossiers().map((d) => d.id));
  const plan = planTerugzetten(backup, bestaandeIds, overschrijven);
  const geschreven = new Set(plan.teSchrijven.map((d) => d.id));
  // upsertDossier en upsertBron voegen nieuwe items vooraan toe; omgekeerd schrijven houdt de volgorde van de back-up.
  for (const d of [...plan.teSchrijven].reverse()) {
    if (bestaandeIds.has(d.id)) {
      deleteProjectsVanDossier(d.id);
      deleteBronnenVanDossier(d.id);
    }
    upsertDossier(d);
  }
  backup.projecten.filter((p) => geschreven.has(p.dossier_id)).forEach(upsertProject);
  [...backup.bronnen].filter((b) => geschreven.has(b.dossier_id)).reverse().forEach(upsertBron);
  return { toegevoegd: plan.toegevoegd, vervangen: plan.vervangen, overgeslagen: plan.overgeslagen.length };
}
