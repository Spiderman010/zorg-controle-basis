// Client-side opslag voor projecten per dossier (Fase B).
// Later vervangen door Lovable Cloud.
import type { Financieringsstroom, ProjectDef } from "@/core";

export interface Project extends ProjectDef {
  dossier_id: string;
  aangemaakt_op: string; // ISO
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

export function addProject(dossier_id: string, naam: string, stroom?: Financieringsstroom): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    dossier_id,
    naam: naam.trim(),
    stroom,
    aangemaakt_op: new Date().toISOString(),
  };
  write([...read(), project]);
  return project;
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}
