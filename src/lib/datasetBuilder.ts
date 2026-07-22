// Bouwt een core Dataset op basis van geclassificeerde BronBestanden van een dossier.
import type {
  Dataset,
  RevenueRecord,
  PayrollCostRecord,
  ExternalHireRecord,
  PaidHoursRecord,
  DirectHoursRecord,
  NonProductiveHoursRecord,
} from "@/core";
import { normalizeStroom, detectStroom } from "@/core";
import { listBronnen, type BronBestand, type BronType } from "@/lib/bronnen";

/** Parse Nederlands of internationaal getal naar number; NaN als ongeldig. */
function parseNumber(raw: string | undefined): number {
  if (!raw) return NaN;
  const s = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function colVal(b: BronBestand, row: string[], veld: string): string | undefined {
  const header = b.mapping?.[veld];
  if (!header) return undefined;
  const idx = b.headers.indexOf(header);
  if (idx < 0) return undefined;
  return row[idx];
}

interface BronnenByType {
  [key: string]: BronBestand[];
}

function groupByType(bronnen: BronBestand[]): BronnenByType {
  const out: BronnenByType = {};
  for (const b of bronnen) {
    if (b.type === "niet_gebruiken") continue;
    (out[b.type] ||= []).push(b);
  }
  return out;
}

export function buildDataset(dossier_id: string): { dataset: Dataset; bronnen: BronBestand[]; perType: BronnenByType } {
  const bronnen = listBronnen(dossier_id);
  const perType = groupByType(bronnen);
  const ds: Dataset = {};

  // Zorgopbrengsten — alleen "meetellen" of als er geen classificaties zijn alles meenemen
  const revBronnen = perType["zorgopbrengsten"] || [];
  if (revBronnen.length) {
    const rec: RevenueRecord[] = [];
    for (const b of revBronnen) {
      b.rijen.forEach((row, idx) => {
        const cls = b.classificaties?.[idx];
        if (cls && cls !== "meetellen") return;
        const amount = parseNumber(colVal(b, row, "bedrag"));
        if (!Number.isFinite(amount)) return;
        const rekening = colVal(b, row, "rekening_of_categorie") || "";
        // Stroom: expliciet gemapte kolom heeft voorrang, anders herkenning uit rekeningnaam.
        const stroom =
          normalizeStroom(colVal(b, row, "financieringsstroom")) ?? detectStroom(rekening) ?? "onbekend";
        rec.push({
          dossier_id,
          period: colVal(b, row, "periode") || "",
          source_file: b.bestandsnaam,
          import_status: "valid",
          account_code: rekening,
          account_name: rekening,
          revenue_type: stroom,
          amount,
        });
      });
    }
    ds.revenue = rec;
  }

  // Personeelskosten
  const payBronnen = perType["personeelskosten"] || [];
  if (payBronnen.length) {
    const rec: PayrollCostRecord[] = [];
    for (const b of payBronnen) {
      b.rijen.forEach((row) => {
        const amount = parseNumber(colVal(b, row, "bedrag"));
        if (!Number.isFinite(amount)) return;
        rec.push({
          dossier_id,
          period: colVal(b, row, "periode") || "",
          source_file: b.bestandsnaam,
          import_status: "valid",
          payroll_component: colVal(b, row, "looncomponent") || "",
          amount,
        });
      });
    }
    ds.payroll = rec;
  }

  // Inhuur — alleen "zorginhuur" als classificaties bestaan
  const hireBronnen = perType["inhuur"] || [];
  if (hireBronnen.length) {
    const rec: ExternalHireRecord[] = [];
    for (const b of hireBronnen) {
      b.rijen.forEach((row, idx) => {
        const cls = b.classificaties?.[idx];
        if (cls && cls !== "zorginhuur") return;
        const amount = parseNumber(colVal(b, row, "bedrag"));
        if (!Number.isFinite(amount)) return;
        rec.push({
          dossier_id,
          period: colVal(b, row, "periode") || "",
          source_file: b.bestandsnaam,
          import_status: "valid",
          vendor_name: colVal(b, row, "leverancier_of_omschrijving") || "",
          amount,
        });
      });
    }
    ds.external_hire = rec;
  }

  // Betaalde uren
  const paidBronnen = perType["betaalde_uren"] || [];
  if (paidBronnen.length) {
    const rec: PaidHoursRecord[] = [];
    for (const b of paidBronnen) {
      b.rijen.forEach((row) => {
        const paid_hours = parseNumber(colVal(b, row, "betaalde_uren"));
        if (!Number.isFinite(paid_hours)) return;
        rec.push({
          dossier_id,
          period: colVal(b, row, "periode") || "",
          source_file: b.bestandsnaam,
          import_status: "valid",
          employee_id: colVal(b, row, "medewerker") || "",
          paid_hours,
        });
      });
    }
    ds.paid_hours = rec;
  }

  // Directe uren — alleen "direct" als classificaties bestaan
  const dirBronnen = perType["directe_uren"] || [];
  if (dirBronnen.length) {
    const rec: DirectHoursRecord[] = [];
    for (const b of dirBronnen) {
      b.rijen.forEach((row, idx) => {
        const cls = b.classificaties?.[idx];
        if (cls && cls !== "direct") return;
        const direct_hours = parseNumber(colVal(b, row, "directe_uren"));
        if (!Number.isFinite(direct_hours)) return;
        rec.push({
          dossier_id,
          period: colVal(b, row, "periode") || "",
          source_file: b.bestandsnaam,
          import_status: "valid",
          employee_id: colVal(b, row, "medewerker") || "",
          direct_hours,
        });
      });
    }
    ds.direct_hours = rec;
  }

  // Niet-productieve uren
  const npBronnen = perType["niet_productieve_uren"] || [];
  if (npBronnen.length) {
    const rec: NonProductiveHoursRecord[] = [];
    for (const b of npBronnen) {
      b.rijen.forEach((row) => {
        const non_productive_hours = parseNumber(colVal(b, row, "uren"));
        if (!Number.isFinite(non_productive_hours)) return;
        rec.push({
          dossier_id,
          period: colVal(b, row, "periode") || "",
          source_file: b.bestandsnaam,
          import_status: "valid",
          employee_id: colVal(b, row, "medewerker") || "",
          non_productive_hours,
        });
      });
    }
    ds.non_productive_hours = rec;
  }

  return { dataset: ds, bronnen, perType };
}

export function hasMinimaleBronnen(dossier_id: string): boolean {
  const { perType } = buildDataset(dossier_id);
  return (perType["zorgopbrengsten"]?.length ?? 0) > 0 && (perType["personeelskosten"]?.length ?? 0) > 0;
}
