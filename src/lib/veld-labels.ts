// Centrale Nederlandse namen en korte uitleg per technisch veld. Alleen weergave: de sleutels
// (periode, bedrag, ...) blijven ongewijzigd in de opslag en in de rekenkern.

export interface VeldLabel {
  naam: string;
  uitleg: string;
}

export const VELD_LABELS: Record<string, VeldLabel> = {
  periode: { naam: "Periode (maand of jaar)", uitleg: "De maand of het jaar waarop de regel betrekking heeft, bijvoorbeeld 2026-09." },
  bedrag: { naam: "Bedrag (euro's)", uitleg: "Het bedrag in euro's. Een komma of punt als decimaalteken werkt beide." },
  rekening_of_categorie: { naam: "Rekening of categorie", uitleg: "De grootboekrekening of categorie van de regel, bijvoorbeeld 8000." },
  looncomponent: { naam: "Soort loonkosten", uitleg: "Het soort loonkost, bijvoorbeeld brutolonen of sociale lasten." },
  leverancier_of_omschrijving: { naam: "Leverancier of omschrijving", uitleg: "Wie er is ingehuurd of wat er is ingekocht." },
  medewerker: { naam: "Medewerker", uitleg: "Naam of nummer van de medewerker." },
  betaalde_uren: { naam: "Betaalde uren", uitleg: "Uren die zijn verloond aan de medewerker." },
  directe_uren: { naam: "Directe (cliëntgebonden) uren", uitleg: "Uren die aan cliënten zijn besteed, zonder reistijd, overleg of verlof." },
  gedeclareerde_uren: { naam: "Gedeclareerde uren (aantal)", uitleg: "Het aantal dat is gedeclareerd of gefactureerd. De eenheid (uren, minuten of dagen) wordt herkend of gekozen." },
  uren: { naam: "Uren", uitleg: "Het aantal uren." },
  financieringsstroom: { naam: "Financieringsstroom (Zvw, Wlz, Wmo, PGB)", uitleg: "De financieringsstroom van de regel. Die bepaalt of de regel in uren wordt vergeleken." },
  eenheid: { naam: "Eenheid van de aantallen", uitleg: "Uren, minuten, vijfminuten-eenheden of dagen." },
};

/** Nederlandse naam van een veld; valt terug op de technische sleutel als die onbekend is. */
export function veldNaam(veld: string): string {
  return VELD_LABELS[veld]?.naam ?? veld;
}

/** Korte uitleg van een veld; leeg als die onbekend is. */
export function veldUitleg(veld: string): string {
  return VELD_LABELS[veld]?.uitleg ?? "";
}
