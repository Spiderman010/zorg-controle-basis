// Voorbeelddossier "Zorg Voorbeeld BV" met vaste ids. Laden vervangt alleen dit voorbeeld;
// andere dossiers blijven onaangeroerd. Het voorbeeld is fictief.
import { upsertBron, deleteBronnenVanDossier, type BronBestand } from "./bronnen";
import { upsertDossier, deleteDossier, listDossiers, type Dossier } from "./dossiers";
import { upsertProject, deleteProjectsVanDossier, type Project } from "./projecten";

export const VOORBEELD_DOSSIER_ID = "voorbeeld-zorg-voorbeeld-bv-2026-09";
export const VOORBEELD_NAAM = "VOORBEELD Zorg Voorbeeld BV - Test 2026-09";

const ZVW_ID = "voorbeeld-zvw-team";
const WMO_ID = "voorbeeld-wmo-team";
const AANGEMAAKT = "2026-10-19T00:00:00.000Z";

const dossier: Dossier = {
  id: VOORBEELD_DOSSIER_ID,
  bedrijfsnaam: "Zorg Voorbeeld BV",
  dossiernaam: VOORBEELD_NAAM,
  periode_van: "2026-09-01",
  periode_tot: "2026-09-30",
  periode_type: "maand",
  controle_type: "basiscontrole + urenanalyse",
  status: "nieuw",
  aangemaakt_op: AANGEMAAKT,
};

const kostenplaatsen: Project[] = [
  { id: ZVW_ID, dossier_id: VOORBEELD_DOSSIER_ID, naam: "Zvw-team", stroom: "zvw", rol: "opdrachtgever", aangemaakt_op: AANGEMAAKT },
  { id: WMO_ID, dossier_id: VOORBEELD_DOSSIER_ID, naam: "Wmo-team", stroom: "wmo", rol: "opdrachtgever", aangemaakt_op: AANGEMAAKT },
];

const basis = {
  dossier_id: VOORBEELD_DOSSIER_ID,
  geupload_op: AANGEMAAKT,
  type_auto_herkend: false,
  type_bevestigd: true,
  preview_rows: 5,
};

const bronnen: BronBestand[] = [
  {
    ...basis,
    id: "voorbeeld-zorgopbrengsten",
    bestandsnaam: "Opbrengsten september.csv",
    type: "zorgopbrengsten",
    headers: ["Periode", "Rekening", "Stroom", "Bedrag"],
    rijen: [
      ["2026-09", "8000", "Zvw wijkverpleging", "60000,00"],
      ["2026-09", "8010", "Wmo", "42000,00"],
    ],
    mapping: { periode: "Periode", rekening_of_categorie: "Rekening", financieringsstroom: "Stroom", bedrag: "Bedrag" },
    projecttoewijzingen: { 0: ZVW_ID, 1: WMO_ID },
    classificaties: { 0: "meetellen", 1: "meetellen" },
  },
  {
    ...basis,
    id: "voorbeeld-personeelskosten",
    bestandsnaam: "Loonkosten september.csv",
    type: "personeelskosten",
    headers: ["Periode", "Looncomponent", "Bedrag"],
    rijen: [
      ["2026-09", "Brutolonen", "70000,00"],
      ["2026-09", "Sociale lasten", "14000,00"],
    ],
    mapping: { periode: "Periode", looncomponent: "Looncomponent", bedrag: "Bedrag" },
  },
  {
    ...basis,
    id: "voorbeeld-directe-uren",
    bestandsnaam: "Directe uren september.csv",
    type: "directe_uren",
    headers: ["Periode", "Medewerker", "Uren"],
    rijen: [
      ["2026-09", "Team Zvw", "421"],
      ["2026-09", "Team Wmo", "300"],
    ],
    mapping: { periode: "Periode", medewerker: "Medewerker", directe_uren: "Uren" },
    projecttoewijzingen: { 0: ZVW_ID, 1: WMO_ID },
    classificaties: { 0: "direct", 1: "direct" },
  },
  {
    ...basis,
    id: "voorbeeld-gedeclareerde-uren",
    bestandsnaam: "Declaratie september.csv",
    type: "gedeclareerde_uren",
    headers: ["Periode", "Stroom", "Gedeclareerde minuten"],
    rijen: [
      ["2026-09", "Zvw wijkverpleging", "25200"],
      ["2026-09", "Wmo", "19800"],
      ["2026-09", "Wlz verblijf", "31"],
    ],
    mapping: { periode: "Periode", financieringsstroom: "Stroom", gedeclareerde_uren: "Gedeclareerde minuten" },
    // De Wlz-verblijfregel declareert niet in uren en krijgt daarom geen kostenplaats.
    projecttoewijzingen: { 0: ZVW_ID, 1: WMO_ID },
  },
];

export function heeftVoorbeeldDossier(): boolean {
  return listDossiers().some((d) => d.id === VOORBEELD_DOSSIER_ID);
}

/** Verwijdert het voorbeeld met zijn kostenplaatsen en bronnen. Andere dossiers blijven staan. */
export function verwijderVoorbeeldDossier() {
  deleteProjectsVanDossier(VOORBEELD_DOSSIER_ID);
  deleteBronnenVanDossier(VOORBEELD_DOSSIER_ID);
  deleteDossier(VOORBEELD_DOSSIER_ID);
}

/** Laadt het voorbeeld opnieuw in: eerst het oude voorbeeld weg, dan het nieuwe. Geeft het dossier-id terug. */
export function laadVoorbeeldDossier(): string {
  verwijderVoorbeeldDossier();
  upsertDossier(dossier);
  kostenplaatsen.forEach(upsertProject);
  bronnen.forEach(upsertBron);
  return VOORBEELD_DOSSIER_ID;
}
