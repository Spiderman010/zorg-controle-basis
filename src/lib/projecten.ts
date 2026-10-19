// Client-side opslag voor projecten per dossier (Fase B).
// Later vervangen door Lovable Cloud.
import type { Financieringsstroom, ProjectDefMetTarief } from "@/core";

export type ProjectRol = "opdrachtgever" | "onderaannemer" | "client";

export const ROL_LABELS: Record<ProjectRol, string> = {
  opdrachtgever: "Opdrachtgever / Debiteur",
  onderaannemer: "Onderaannemer / Zorgpartner / ZZP'er",
  client: "Cliënt / Zorgvrager",
};

export const ROL_KORT: Record<ProjectRol, string> = {
  opdrachtgever: "Opdrachtgever",
  onderaannemer: "Partner",
  client: "Cliënt",
};

export interface Project extends ProjectDefMetTarief {
  dossier_id: string;
  aangemaakt_op: string; // ISO
  rol?: ProjectRol;
  /** Bij een cliënt: id van de opdrachtgever via wie de zorg loopt (onderaanneming). */
  via_id?: string;
}

const KEY = "zcb.projecten.v1";

function read(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Project[];
  } catch {
    return [];
  }
}

function write(all: Project[]) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function listProjecten(dossier_id: string): Project[] {
  return read().filter((p) => p.dossier_id === dossier_id);
}

export function addProject(
  dossier_id: string,
  naam: string,
  stroom?: Financieringsstroom,
  tarief?: number,
  rol?: ProjectRol,
  via_id?: string,
): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    dossier_id,
    naam: naam.trim(),
    stroom,
    tarief,
    rol,
    via_id,
    aangemaakt_op: new Date().toISOString(),
  };
  write([...read(), project]);
  return project;
}

export function updateProject(id: string, patch: Partial<Pick<Project, "naam" | "stroom" | "tarief" | "rol" | "via_id">>) {
  write(read().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

/** Weergavenaam: alleen de naam, zonder rol of opdrachtgever tussen haakjes. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function projectLabel(p: Project, _alle?: Project[]): string {
  return p.naam;
}
