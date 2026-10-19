// Bulkactie "alle regels naar kostenplaats": berekent wat er gebeurt en hoeveel koppelingen worden overschreven.
// Puur; het scherm vraagt alleen bevestiging als er overschreven wordt.

/**
 * Koppelt alle `aantal` regels aan `projectId`, of haalt de koppelingen weg bij `null` (Algemeen).
 * `overschreven` telt de regels die nu al een koppeling hebben en daardoor veranderen.
 */
export function bulkKoppelen(
  aantal: number,
  projectId: string | null,
  bestaand: Record<number, string> = {},
): { toewijzingen: Record<number, string>; overschreven: number } {
  const overschreven = Object.keys(bestaand).filter((k) => Number(k) < aantal).length;
  const toewijzingen: Record<number, string> = {};
  if (projectId !== null) for (let i = 0; i < aantal; i++) toewijzingen[i] = projectId;
  return { toewijzingen, overschreven };
}

/** Bevestigingsvraag in gewone taal, met het aantal regels dat overschreven wordt. */
export function bulkBevestigingTekst(aantal: number): string {
  return aantal === 1
    ? "1 regel heeft al een kostenplaats. Overschrijven?"
    : `${aantal} regels hebben al een kostenplaats. Overschrijven?`;
}
