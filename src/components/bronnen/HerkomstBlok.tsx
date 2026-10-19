import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertBron, type BronBestand } from "@/lib/bronnen";
import {
  BEWIJSNIVEAU_LABEL,
  HERKOMST_MANIER_LABEL,
  HERKOMST_MANIEREN,
  bewijsniveau,
  type Herkomst,
  type HerkomstManier,
} from "@/lib/herkomst";

/**
 * Herkomst van één bestand: manier, systeem en exportdatum. Elke wijziging wordt direct opgeslagen.
 * Alleen systeemnamen en datums, geen persoonsgegevens.
 */
export function HerkomstBlok({
  bron,
  onChange,
  suggesties = [],
}: {
  bron: BronBestand;
  onChange: () => void;
  suggesties?: string[];
}) {
  const h: Herkomst = bron.herkomst ?? {};
  const lijstId = `herkomst-systemen-${bron.id}`;

  const zet = (patch: Partial<Herkomst>) => {
    const next: Herkomst = { ...h, ...patch };
    for (const k of Object.keys(next) as (keyof Herkomst)[]) {
      if (next[k] === "" || next[k] === undefined) delete next[k];
    }
    upsertBron({ ...bron, herkomst: Object.keys(next).length > 0 ? next : undefined });
    onChange();
  };

  return (
    <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">Herkomst</span>
        <span className="text-[11px] text-muted-foreground">{BEWIJSNIVEAU_LABEL[bewijsniveau(h)]}</span>
      </div>
      <Select value={h.manier ?? ""} onValueChange={(v) => zet({ manier: v as HerkomstManier })}>
        <SelectTrigger className="h-8 text-xs" aria-label="Manier van aanleveren">
          <SelectValue placeholder="Hoe is dit bestand ontvangen?" />
        </SelectTrigger>
        <SelectContent>
          {HERKOMST_MANIEREN.map((m) => (
            <SelectItem key={m} value={m}>{HERKOMST_MANIER_LABEL[m]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <Input
          className="h-8 text-xs"
          placeholder="Systeem, bijv. Nedap Ons"
          aria-label="Systeem"
          list={suggesties.length > 0 ? lijstId : undefined}
          value={h.systeem ?? ""}
          onChange={(e) => zet({ systeem: e.target.value })}
        />
        <Input
          className="h-8 text-xs"
          type="date"
          aria-label="Exportdatum"
          value={h.export_datum ?? ""}
          onChange={(e) => zet({ export_datum: e.target.value })}
        />
      </div>
      {suggesties.length > 0 && (
        <datalist id={lijstId}>
          {suggesties.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
