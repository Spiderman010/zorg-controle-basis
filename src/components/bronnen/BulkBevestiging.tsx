import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { bulkBevestigingTekst } from "@/lib/bulk-koppelen";

/** Vraagt bevestiging voordat een bulkactie bestaande kostenplaatskoppelingen overschrijft. */
export function BulkBevestiging({
  open,
  aantal,
  onBevestig,
  onAnnuleer,
}: {
  open: boolean;
  aantal: number;
  onBevestig: () => void;
  onAnnuleer: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onAnnuleer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Overschrijven?</DialogTitle>
          <DialogDescription>{bulkBevestigingTekst(aantal)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onAnnuleer}>Annuleren</Button>
          <Button onClick={onBevestig}>Overschrijven</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
