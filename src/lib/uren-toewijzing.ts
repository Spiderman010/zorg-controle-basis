// Voorstel om gedeclareerde uren aan een kostenplaats te koppelen op basis van de financieringsstroom.
// Alleen een voorstel: bij twijfel (meerdere of geen passende kostenplaats) wordt niets gekozen.
import { normalizeStroom } from "@/core";
import type { GedeclareerdeUrenRegel } from "./bronnen";

export interface VoorstelResultaat {
  toewijzingen: Record<number, string>; // regelindex -> project_id
  onduidelijk: number; // regels met meerdere passende kostenplaatsen
  zonderMatch: number; // regels zonder stroom of zonder passende kostenplaats
}

export function voorstelToewijzing(
  regels: GedeclareerdeUrenRegel[],
  projecten: { id: string; stroom?: string }[],
  bestaand: Record<number, string> = {},
): VoorstelResultaat {
  const uit: VoorstelResultaat = { toewijzingen: {}, onduidelijk: 0, zonderMatch: 0 };
  for (const r of regels) {
    if (bestaand[r.regel] || r.toepasbaar === "nee") continue;
    const stroom = normalizeStroom(r.stroom);
    const passend = stroom ? projecten.filter((p) => p.stroom === stroom) : [];
    if (passend.length === 1) uit.toewijzingen[r.regel] = passend[0].id;
    else if (passend.length > 1) uit.onduidelijk += 1;
    else uit.zonderMatch += 1;
  }
  return uit;
}
