import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KopieerKnop({ tekst, label = "Kopiëren" }: { tekst: string; label?: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const kopieer = async () => {
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      /* klembord niet beschikbaar */
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={kopieer} className="print:hidden">
      {gekopieerd ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {gekopieerd ? "Gekopieerd" : label}
    </Button>
  );
}
