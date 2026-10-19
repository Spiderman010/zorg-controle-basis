# Handoff — Zorg Controle Basis — 19 oktober 2026

## Wat er gedaan is deze sessie
- Nulmeting van `main` (commit `4a1f9b4`): 81 tests slagen, typecheck en build in orde, `npm ci` faalt, lint 2 fouten
- Loonjournaal-import van Lovable beoordeeld; vier zwakke plekken bevestigd en opgelost (min-teken, terugval op briefhoofd, tekstkolommen, lege periode)
- App vergeleken met de Nedap Ons-patronen vanuit de rol als controleur
- `ROADMAP.md` (v0.3) opgesteld en deze handoff aangemaakt
- Getalfout opgelost: bedragen en uren met een decimale punt (uit Excel en herkende PDF's) werden 10 tot 100 keer te groot gelezen. Nu één gedeelde functie `parseGetal`, met tests
- Stap 2.0.1 gebouwd: brontype "gedeclareerde uren" via Excel of CSV. Kolommen en eenheid worden geraden en met één klik bevestigd. Nog niet in de score en nog niet aan projecten te koppelen
- `ROADMAP.md` staat op versie 0.5 (2.0.0 en 2.0.1 afgevinkt, 2.0.3b toegevoegd)
- Stap 2.0.3 gebouwd: eenheid-kiezer bij het koppelen van kolommen (gedeclareerde uren) en toepasbaarheid per stroom (`declareertInUren`: ja, nee of onzeker; Wlz-verblijf grijs)
- Stap 2.0.3b gebouwd: gedeclareerde uren koppelen aan een kostenplaats in de stap Classificatie, met een voorstel dat alleen kiest bij één passende kostenplaats
- `ROADMAP.md` staat op versie 0.6

## Huidige staat
- **Branch:** `eenheid-en-koppeling` (vanaf `main`, na PR #3), nog niet gemerged
- **Laatste commit:** de laatste commit op de branch `eenheid-en-koppeling`
- **Pull request:** nog niet gemaakt en niet gemerged; link: https://github.com/Spiderman010/zorg-controle-basis/compare/main...eenheid-en-koppeling
- **Deploy status:** Lovable-preview, niet gecontroleerd
- **Runtime-fouten:** niet gemeten
- **Tests:** 19 testbestanden en 150 tests, alles groen; typecheck zonder fouten, lint 0 fouten (2 bestaande waarschuwingen), build in orde

## Openstaande taken
- [ ] Pull request maken van `eenheid-en-koppeling` naar `main` en mergen
- [ ] `package-lock.json` committen (`npm install` is lokaal gedraaid)
- [ ] `Journaalposten.pdf` opnieuw uploaden en de ruwe uitvoer van `pdfItemsNaarTabel()` (geanonimiseerd) bewaren als testvoorbeeld
- [ ] Open vragen 1, 2, 9 en 12 in `ROADMAP.md` beantwoorden (grootboekexport, vergelijking van het loonjournaal, Wlz thuis in uren, declaratiebestand)
- [ ] Daarna stap 2.0.4: de nieuwe kerncontrole per project in de rekenkern (`src/core/`; toestemming is gegeven)

## Bekende problemen
- 4 van de 9 kerncontroles blijven grijs: `secondary_totals` wordt nergens gevuld (alleen op de debug-pagina)
- `npm ci` faalt tot de lockfile is gecommit
- Lint: 2 fouten in shadcn-bestanden (`command.tsx`, `textarea.tsx`); `npm audit`: 17 hoge meldingen in afhankelijkheden
- Opslag alleen in de browser (`localStorage`): een gewist profiel kost dossiers

## Volgende sessie: begin hier
Draai `git pull` en `npx vitest run` (verwacht 19 testbestanden en 150 tests). Probeer daarna in de Lovable-preview het fictieve bestand `Declaratie september.csv` (kolommen Periode, Stroom en Gedeclareerde minuten; regels: Zvw wijkverpleging 25200, Wmo 19800, Wlz verblijf 31) in een testdossier met twee kostenplaatsen (stroom Zvw en stroom Wmo). Controleer: de keuzelijst "Eenheid van de aantallen" bij het koppelen van kolommen, de melding over Wlz-verblijf bij het valideren, het koppelpaneel in de stap Classificatie en de knop "Koppel automatisch op stroom". Begin daarna met stap 2.0.4, de controle in de rekenkern.

## Bestanden gewijzigd
- `ROADMAP.md` — versie 0.6: 2.0.3 en 2.0.3b afgevinkt, logboekregel 0.6
- `HANDOFF.md` — deze sessie bijgewerkt (gedaan, huidige staat, openstaande taken, bestanden)
- `src/components/bronnen/ClassificatieTab.tsx` — stap Classificatie toont gedeclareerde uren en het koppelpaneel
- `src/components/bronnen/MappingTab.tsx` — keuzelijst "Eenheid van de aantallen" voor gedeclareerde uren (automatisch of handmatig)
- `src/components/bronnen/ToewijzingPaneel.tsx` — nieuw: paneel om gedeclareerde uren aan een kostenplaats te koppelen
- `src/components/bronnen/ToewijzingPaneel.test.tsx` — nieuw: tests voor het paneel
- `src/lib/bronnen.ts` — eenheden omrekenen en `declareertInUren` (toepasbaarheid per stroom)
- `src/lib/eenheid-toepasbaarheid.test.ts` — nieuw: tests voor eenheden en toepasbaarheid
- `src/lib/uren-toewijzing.ts` — nieuw: voorstel voor koppeling uren-kostenplaats op basis van de stroom; kiest niets bij twijfel
- `src/lib/uren-toewijzing.test.ts` — nieuw: tests voor het voorstel

## Belangrijke context
- Rol: de app is een onafhankelijke tweede lijn. Uren en bedragen komen van de klant; de app corrigeert of fiatteert niets
- Werkwijze net als BoekAssist: Claude levert bestanden, gebruiker kopieert, draait `npx vitest run`, commit en push
- `src/core/` alleen wijzigen na expliciete toestemming (zie `CLAUDE.md`)
- Periode van het loonjournaal valt terug op de afdrukdatum als er geen label "Periode" staat (open vraag 7)
