# Roadmap — Zorg Controle Basis

**Versie:** 0.3 — 19 oktober 2026
**Status:** concept, wordt herzien aan het einde van elke sessie (zie "Herzien")

## Doel

Een controle-instrument voor mijn zorgklanten (MKB-zorg: thuiszorg, VVT). Bronnen van een klant worden ingelezen, de cijfers worden onderling gecontroleerd, en per dossier is te zien waar het afwijkt.

**Fase A (nu):** betrouwbaar eigen controlewerk voor mijn zorgklanten.
**Fase B (later, niet gepland):** commercieel product via een externe ontwikkelaar.

**Leidend principe:** een controle-instrument mag nooit stilletjes gokken. Onbekend, onleesbaar of niet sluitend wordt zichtbaar (oranje of rood), nooit een nette maar foute uitkomst.

## Rol en afbakening

| Onderwerp | Afspraak |
|---|---|
| Herkomst van de gegevens | Alle uren en bedragen komen van de klant, uit diens eigen systemen (bijvoorbeeld Nedap Ons, een salarispakket of het grootboek). Ik stel zelf geen uren vast en bied geen uren aan. |
| Rol van de app | Onafhankelijke tweede lijn: de app controleert achteraf of de aangeleverde gegevens onderling en met een tweede bron kloppen. |
| Wat de app niet doet | Gegevens corrigeren, fiatteren, plannen of verdelen. Dat is werk van het bronsysteem en zou de onafhankelijkheid aantasten. |
| Uit de Nedap-patronen overnemen | Een expliciete afkapregel per bron, verschillen verklaren, ruwe en afgeleide waarden naast elkaar, en herkomst per bron vastleggen. |
| Oordelen | Een indeling (zorginhuur, direct of niet-productief) is mijn oordeel en geen feit uit de bron. Dat leg ik vast met datum en reden. |

## Prioriteit (door Naoufal bepaald)

1. Import betrouwbaar (PDF, Excel, journaal)
2. Controles uitbreiden (balans, aansluitingen)
3. Rapportage en klantweergave
4. Opslag veilig (nu alleen in de browser)

## Werkafspraken

| Onderwerp | Afspraak |
|---|---|
| Verdeling | Net als BoekAssist: Claude levert aangepaste bestanden of een patch, ik kopieer ze naar de projectmap, draai `npx vitest run`, commit en push. |
| Voor elk werkblok | `git pull`. Controleer met `git remote -v` dat het remote `github.com/Spiderman010/zorg-controle-basis` is. |
| Rekenkern | `src/core/` alleen wijzigen na expliciete toestemming. Bij statuslogica of scoreberekening eerst om duiding vragen. |
| Per onderdeel | Spec (max. 10 regels) → plan → tests eerst → code. Vaste stappen uit de skill `superpowers`, zonder de Next.js/Supabase-delen. |
| Einde sessie | `HANDOFF.md` bijwerken (skill `handoff`): wat gedaan, huidige staat, eerste stap van de volgende keer. |
| Bij elke mijlpaal | Tussentijdse check met de skill `verkoopklaar` (zes blokken, bewijs boven belofte). |
| Opslag | Geen database of Lovable Cloud zonder expliciete opdracht. |
| Commit/push | Alleen op mijn verzoek. |

## Nulmeting

Gemeten op `main`, commit `4a1f9b4` (19 oktober 2026), vóór de patch met randgevallen.

| Meting | Uitkomst |
|---|---|
| Tests | 81 van 81 slagen (12 testbestanden) |
| Typecheck | geen fouten |
| Lint | 14 meldingen: 2 fouten (shadcn-bestanden `command.tsx` en `textarea.tsx`), 12 waarschuwingen |
| Build | slaagt, hoofdbundel 516 kB |
| `npm ci` | faalt: `package-lock.json` loopt achter op `package.json` |
| `npm audit` (productie) | 19 meldingen, waarvan 17 hoog en 0 kritiek |
| Niet gemeten | testdekking van `bronnen.ts`; import met echte `Journaalposten.pdf` |

## Wat de app nu heeft, en wat ontbreekt

| Onderdeel | Stand |
|---|---|
| Verhoudingscontroles (personeelslasten, directe uren, niet-productieve uren, resturen, soll-omzet) | aanwezig |
| Trendcontroles (4, tegen de vorige periode) | aanwezig |
| Financieringsmix, projecttoerekening, dubbele facturen, importvalidatie | aanwezig |
| Zichtbaar hoeveel controles uitvoerbaar zijn ("x van 9") en een betrouwbaarheidsniveau | aanwezig |
| Rapportage met samenvatting, actiepunten en PDF via afdrukken | aanwezig |
| **Aansluiting op een tweede bron** (omzet, personeel, inhuur, betaalde uren) | **kern is er, maar `secondary_totals` wordt in de echte app nergens gevuld: 4 van de 9 kerncontroles blijven grijs** |
| Verschillen verklaren (afkapregel, bekende oorzaak) | ontbreekt |
| Herkomst per bron (systeem, soort export, exportdatum, periode) | beperkt: bestandsnaam en uploadmoment |
| Ruwe en afgeleide waarden naast elkaar | ontbreekt |
| Oordelen (classificatie) met datum en reden | ontbreekt |

Gevolg: de betrouwbaarheid in het rapport kan volgens mijn lezing van de code niet hoger worden dan "Beperkt tot gemiddeld", en de score deelt alleen door de uitvoerbare controles. Dit lossen we op in mijlpaal 2.

## Fase 0 — Fundament (eerst, klein)

- [x] Patch met randgevallen toegepast (min-teken, geen terugval op briefhoofd, tekstkolommen, periode)
- [ ] `package-lock.json` synchroniseren: `npm install` is gedraaid, de gewijzigde lockfile nog committen
- [x] `ROADMAP.md` en `HANDOFF.md` in de root van de repo gezet
- [ ] `Journaalposten.pdf` opnieuw uploaden na de patch en de ruwe uitvoer van `pdfItemsNaarTabel()` bewaren als geanonimiseerd testvoorbeeld

## Mijlpaal 1 — Import betrouwbaar

- [ ] 1.1 Loonjournaal-import bevestigd met de echte PDF van een klant
- [ ] 1.2 Balanscontrole bij import: som Debet gelijk aan som Credit, en beide gelijk aan de totaalregel op de PDF; bij verschil een waarschuwing op de bron
- [ ] 1.3 Importverslag per bron: aantal gelezen, overgeslagen en reden (totaalregel, geen bedrag), zodat er geen regels stil verdwijnen
- [ ] 1.4 Excel-journaal: de echte kopregel zoeken in plaats van altijd de eerste regel (`parseExcel`)
- [ ] 1.5 Generieke PDF-terugval: dezelfde briefhoofd-fout kan elders voorkomen; waarschuwen of strenger maken
- [ ] 1.6 Bewaarde PDF opnieuw inlezen zonder opnieuw uploaden en zonder koppelingen te verliezen
- [ ] 1.7 Testvoorbeelden (geanonimiseerde echte bestanden) per brontype
- [ ] 1.8 Herkomst per bron vastleggen: systeem (bijvoorbeeld Nedap Ons of SnelStart), soort export, exportdatum, periode, uploadmoment
- [ ] 1.9 Urenbronnen van de klant (bijvoorbeeld een Nedap Ons-verloningsrapport of urenexport) als importtype uitwerken, zodra er een voorbeeld is

**Klaar als:** elk brontype heeft een testvoorbeeld; geen rij verdwijnt zonder melding; van elke bron is te zien waar hij vandaan komt; een echte klant-PDF is zonder handwerk verwerkt.

## Mijlpaal 2 — Controles uitbreiden

*Wijzigingen in `src/core/` vragen mijn toestemming.*

- [ ] 2.1 **Tweede bron inbouwen:** een export van het grootboek of de subadministratie inlezen en daarmee `secondary_totals` vullen, zodat de vier aansluitcontroles (omzet, personeel, inhuur, betaalde uren) echt draaien
- [ ] 2.2 Besluit: waarmee wordt het loonjournaal vergeleken en telt alleen Debet of Debet min Credit (zie open vragen)
- [ ] 2.3 Journaalbalans als eigen controle (Debet gelijk aan Credit)
- [ ] 2.4 Aansluiting loonjournaal en grootboek (kostenrekeningen); regel "Brutolonen" tegen de brutolonen op de loonstroken
- [ ] 2.5 Verschillen verklaren: expliciete afkapregel per bron en bij een verschil de bekende oorzaak noemen (bijvoorbeeld een andere periode of een dienst over de maandgrens)
- [ ] 2.6 Tolerantiebanden vastleggen en documenteren per controle (nu: 1 cent, bij een verschil alleen oranje en nooit rood)
- [ ] 2.7 Per controleresultaat terug te herleiden naar de bronregels

**Klaar als:** alle negen kerncontroles zijn uitvoerbaar zodra de bronnen er zijn; elke controle heeft tests en een vastgelegde norm; de score is reproduceerbaar.

## Mijlpaal 3 — Rapportage en klantweergave

- [ ] 3.1 Rapport vermeldt de herkomst van de uren en bedragen en dat ze door de klant zijn aangeleverd en niet zelfstandig zijn vastgesteld
- [ ] 3.2 Dekking ("x van 9 controles uitgevoerd") op gelijke hoogte met de score tonen, zodat een hoge score bij weinig uitgevoerde controles niet geruststelt
- [ ] 3.3 Ruwe en afgeleide waarden naast elkaar tonen en afgeleide waarden markeren
- [ ] 3.4 Oordelen (classificaties) vastleggen met datum en reden
- [ ] 3.5 PDF-rapport met bronverwijzing, datum en versie van de rekenkern
- [ ] 3.6 Klantweergave (vier kaarten) nalopen op duidelijkheid van de statuszinnen
- [ ] 3.7 CBS-benchmarking (dataset 83670NED): uitzoeken wat er al is en wat nog moet

**Klaar als:** een rapport kan als werkdossier worden bewaard en later worden nagelopen, en de lezer ziet meteen wat wel en niet gecontroleerd is.

## Mijlpaal 4 — Opslag veilig

- [ ] 4.1 Back-up: dossiers exporteren en importeren (JSON), zodat een gewist browserprofiel geen dossiers kost
- [ ] 4.2 Besluit over duurzame opslag (Lovable Cloud of anders) — alleen na expliciete opdracht
- [ ] 4.3 Privacy: loonjournalen bevatten gegevens van medewerkers; bewaartermijn en toegang vastleggen
- [ ] 4.4 `verkoopklaar`-check, blokken B (betrouwbaarheid) en D (juridisch)

**Klaar als:** een verloren browsergeschiedenis kost geen dossier en de omgang met persoonsgegevens is vastgelegd.

## Open vragen en besluiten

| # | Vraag | Eigenaar | Status |
|---|---|---|---|
| 1 | Is het grootboek van mijn zorgklanten meestal beschikbaar als SnelStart-export? Dat bepaalt het importtype van de tweede bron (2.1) | Naoufal | open |
| 2 | Waarmee wordt het loonjournaal vergeleken: grootboek, brutolonen uit loonstroken, of beide? | Naoufal | open |
| 3 | Telt alleen Debet (kostenkant) of Debet min Credit? Nu: alleen Debet | Naoufal | open |
| 4 | Opslag staat op plaats 4, maar een gewist browserprofiel kost nu dossiers. Moet 4.1 (export als back-up) eerder? | Naoufal | voorstel |
| 5 | Een voorbeeld van een Nedap Ons-verloningsrapport of urenexport (geanonimiseerd), voor 1.9 | Naoufal | open |
| 6 | Is een aansluitverschil alleen oranje goed, of moet bij een grote afwijking ook rood mogelijk zijn? | Naoufal | open |
| 7 | Mag de periode uit de afdrukdatum van het journaal komen als er geen label "Periode" staat? | Naoufal | open |
| 8 | Zit CBS-benchmarking al in de app? | Claude | uitzoeken |

## Herzien

Aan het einde van elke sessie, samen met `HANDOFF.md`:

1. Wat is afgevinkt? Werk de checkboxen en de status bij.
2. Is er iets veranderd in prioriteit of aanpak? Noteer het in het logboek.
3. Wat is de eerste, concrete stap van de volgende sessie?

## Logboek

| Datum | Versie | Wijziging |
|---|---|---|
| 2026-10-19 | 0.1 | Roadmap aangemaakt na nulmeting; prioriteit door Naoufal bepaald |
| 2026-10-19 | 0.2 | Rol en afbakening toegevoegd (geen uren aanbieden, alleen controleren); tabel "wat de app heeft"; tweede bron bovenaan mijlpaal 2; herkomst per bron (1.8, 1.9); dekking, herkomst en oordelen in mijlpaal 3; open vragen uitgebreid |
| 2026-10-19 | 0.3 | Patch met randgevallen, `ROADMAP.md` en `HANDOFF.md` in de repo gezet; Fase 0 deels afgevinkt |
