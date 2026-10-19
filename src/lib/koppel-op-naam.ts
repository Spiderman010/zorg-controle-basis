// Koppelen aan kostenplaatsen op naam. Puur: krijgt de waarden binnen en geeft een voorstel terug.
// Overschrijft nooit een bestaande koppeling, en kiest niets bij twijfel.

/** Vergelijkingssleutel: hoofdletters en witruimte maken niet uit. */
export function normaliseerNaam(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export interface NaamVoorstel {
  /** Nieuwe koppelingen: regelindex -> project_id. Bestaande koppelingen staan er niet in. */
  toewijzingen: Record<number, string>;
  /** Aantal regels dat nu gekoppeld is. */
  gekoppeld: number;
  /** Regels die al een koppeling hadden; die blijven ongewijzigd. */
  bestond: number;
  /** Namen waarvoor geen kostenplaats bestaat; elke naam één keer. */
  geenMatch: string[];
  /** Regels waarvan de naam bij meerdere kostenplaatsen past. */
  onduidelijk: number;
  /** Regels zonder naam. */
  leeg: number;
}

/**
 * Stelt per regel een kostenplaats voor op basis van de naam in de kolom "kostenplaats".
 * `namen[i]` is de cel van regel i; `bestaand` zijn de koppelingen die er al zijn.
 */
export function voorstelOpNaam(
  namen: (string | undefined)[],
  projecten: { id: string; naam: string }[],
  bestaand: Record<number, string> = {},
): NaamVoorstel {
  const uit: NaamVoorstel = { toewijzingen: {}, gekoppeld: 0, bestond: 0, geenMatch: [], onduidelijk: 0, leeg: 0 };
  const bekendeIds = new Set(projecten.map((p) => p.id));
  for (let i = 0; i < namen.length; i++) {
    const ruw = namen[i] ?? "";
    const sleutel = normaliseerNaam(ruw);
    if (!sleutel) {
      uit.leeg += 1;
      continue;
    }
    if (bestaand[i] && bekendeIds.has(bestaand[i])) {
      uit.bestond += 1;
      continue;
    }
    const passend = projecten.filter((p) => normaliseerNaam(p.naam) === sleutel);
    if (passend.length === 1) {
      uit.toewijzingen[i] = passend[0].id;
      uit.gekoppeld += 1;
    } else if (passend.length > 1) {
      uit.onduidelijk += 1;
    } else {
      const naam = ruw.trim().replace(/\s+/g, " ");
      if (!uit.geenMatch.some((n) => normaliseerNaam(n) === sleutel)) uit.geenMatch.push(naam);
    }
  }
  return uit;
}

export interface MedewerkerKoppeling {
  /** Alle koppelingen na de actie: de bestaande plus de nieuwe. */
  toewijzingen: Record<number, string>;
  gekoppeld: number;
  bestond: number;
}

/**
 * Koppelt alle regels van één medewerker aan één kostenplaats. Regels die al een koppeling
 * hebben, blijven zoals ze zijn.
 */
export function koppelMedewerker(
  medewerkers: (string | undefined)[],
  medewerker: string,
  projectId: string,
  bestaand: Record<number, string> = {},
): MedewerkerKoppeling {
  const sleutel = normaliseerNaam(medewerker);
  const uit: MedewerkerKoppeling = { toewijzingen: { ...bestaand }, gekoppeld: 0, bestond: 0 };
  if (!sleutel) return uit;
  medewerkers.forEach((m, i) => {
    if (normaliseerNaam(m ?? "") !== sleutel) return;
    if (bestaand[i]) {
      uit.bestond += 1;
      return;
    }
    uit.toewijzingen[i] = projectId;
    uit.gekoppeld += 1;
  });
  return uit;
}
