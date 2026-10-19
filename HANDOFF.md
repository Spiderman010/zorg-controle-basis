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
- Stap 2.0.4 gebouwd: verbandcontrole gedeclareerde tegen gewerkte uren per kostenplaats (`src/core/urenverband.ts`), met de kaart "Uren-controle" op het scherm Controle
- Besluit: de uren-controle telt mee in de hoofdscore als tiende kerncontrole (V1-C10). Toestemming voor wijzigingen aan `src/core/` en de scoreberekening is gegeven; de hoofdscore en de dekking gaan nu over 10 controles

## Huidige staat
- **Branch:** `urenverband` (vanaf `main`, na PR #4), nog niet gemerged
- **Laatste commit:** de laatste commit op de branch `urenverband`
- **Pull request:** nog niet gemaakt en niet gemerged; link: https://github.com/Spiderman010/zorg-controle-basis/compare/main...urenverband
- **Deploy status:** Lovable-preview, niet gecontroleerd
- **Runtime-fouten:** niet gemeten
- **Tests:** 22 testbestanden en 186 tests, alles groen; typecheck zonder fouten, build in orde, lint: 14 bestaande meldingen (2 fouten in shadcn-bestanden)

## Openstaande taken
- [ ] Pull request maken en mergen (branch `urenverband` naar `main`)
- [ ] Het fictieve bestand uit "Volgende sessie" doorlopen, en de kaart "Uren-controle" en de score in het scherm Controle nakijken
- [ ] `package-lock.json` committen (`npm install` is lokaal gedraaid)
- [ ] `Journaalposten.pdf` opnieuw uploaden en de ruwe uitvoer van `pdfItemsNaarTabel()` (geanonimiseerd) bewaren als testvoorbeeld
- [ ] Open vragen 1, 2, 9, 12 en 13 in `ROADMAP.md` beantwoorden
- [ ] Daarna 2.0.5: scherm "Uren-controle" (uitleg in gewone taal, een "wat nu?"-zin, uitsplitsing per cliënt)

## Bekende problemen
- 4 van de 10 kerncontroles blijven grijs: `secondary_totals` wordt nergens gevuld (alleen op de debug-pagina)
- `npm ci` faalt tot de lockfile is gecommit
- Lint: 2 fouten in shadcn-bestanden (`command.tsx`, `textarea.tsx`); `npm audit`: 17 hoge meldingen in afhankelijkheden
- Opslag alleen in de browser (`localStorage`): een gewist profiel kost dossiers

## Volgende sessie: begin hier
Draai `git pull` en `npx vitest run` (verwacht 22 testbestanden en 186 tests). Open in de Lovable-preview het scherm Controle van het testdossier met het fictieve declaratiebestand en directe uren (aan kostenplaatsen gekoppeld). Controleer de kaart "Uren-controle" en dat de controle V1-C10 in de lijst en de hoofdscore staat. Begin daarna met 2.0.5.

## Bestanden gewijzigd
- `ROADMAP.md` — versie 0.8: 2.0.4 afgevinkt, uren-controle als V1-C10 in de hoofdscore
- `HANDOFF.md` — deze sessie bijgewerkt (gedaan, huidige staat, openstaande taken, bestanden)
- `src/core/urenverband.ts` — nieuw: verbandcontrole gedeclareerde tegen gewerkte uren per kostenplaats (V1-C10)
- `src/core/__tests__/urenverband.test.ts` — nieuw: tests voor de verbandcontrole
- `src/core/index.ts` — exporteert de verbandcontrole
- `src/core/types.ts` — typen voor de verbandcontrole en de configuratie
- `src/core/checks.ts` — de uren-controle als tiende kerncontrole in de hoofdscore
- `src/core/__tests__/financiering.test.ts` — verwacht nu 10 kerncontroles (was 9)
- `src/core/__tests__/projecten.test.ts` — verwacht nu 10 kerncontroles (was 9)
- `src/core/__tests__/sollomzet.test.ts` — verwacht nu 10 kerncontroles (was 9)
- `src/lib/datasetBuilder.ts` — gedeclareerde uren, omgerekend naar uren en per kostenplaats, in de dataset
- `src/lib/urenverband-dataset.test.ts` — nieuw: tests voor de dataset van de verbandcontrole
- `src/components/controle/UrenVerbandKaart.tsx` — nieuw: kaart "Uren-controle" op het scherm Controle
- `src/components/controle/UrenVerbandKaart.test.tsx` — nieuw: tests voor de kaart
- `src/pages/DossierControle.tsx` — toont de kaart "Uren-controle" en V1-C10 in de lijst
- `src/pages/DossierRapportage.tsx` — neemt V1-C10 op in het rapport

## Belangrijke context
- Rol: de app is een onafhankelijke tweede lijn. Uren en bedragen komen van de klant; de app corrigeert of fiatteert niets
- Werkwijze net als BoekAssist: Claude levert bestanden, gebruiker kopieert, draait `npx vitest run`, commit en push
- `src/core/` alleen wijzigen na expliciete toestemming (zie `CLAUDE.md`)
- Periode van het loonjournaal valt terug op de afdrukdatum als er geen label "Periode" staat (open vraag 7)
