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
- Stap 2.0.5 gebouwd: scherm Uren-controle met uitleg in gewone taal per kostenplaats, een "wat nu?"-zin, en uitsplitsing per cliënt onder een oranje of rode kostenplaats. Alleen weergave; `src/core` is niet aangeraakt
- Gebruiksvriendelijkheid, vier onderdelen op de branch `gebruiksvriendelijk`: (1) centrale Nederlandse veldnamen en uitleg, "kostenplaats" in de UI, "Diagnose" uit het menu; (2) "Wat ontbreekt nog?" per dossier met één volgende stap; (3) kolom "Kostenplaats of cliënt" met koppelen op naam en koppelen per medewerker; (4) voorbeelddossier Zorg Voorbeeld BV en back-up maken/terugzetten
- Wlz-verblijfregels krijgen geen kostenplaats nodig in de voortgang (fout in onderdeel 2 gevonden en gerepareerd)
- `ROADMAP.md` staat op versie 0.10; 4.1 (back-up) is afgevinkt

## Huidige staat
- **Branch:** `gebruiksvriendelijk` (vanaf `main`), nog niet gemerged
- **Laatste commit:** de laatste commit op de branch `gebruiksvriendelijk`
- **Pull request:** nog niet gemaakt en niet gemerged; link: https://github.com/Spiderman010/zorg-controle-basis/compare/main...gebruiksvriendelijk
- **Deploy status:** Lovable-preview, niet gecontroleerd
- **Runtime-fouten:** niet gemeten
- **Tests:** 30 testbestanden en 241 tests, alles groen; typecheck zonder fouten, build in orde, lint: 14 bestaande meldingen (2 fouten in shadcn-bestanden)

## Openstaande taken
- [ ] Pull request maken en mergen (branch `gebruiksvriendelijk` naar `main`)
- [ ] De vier onderdelen doorlopen in de Lovable-preview (zie "Volgende sessie")
- [ ] Beslissen: de bestaande bulkactie "Alle regels naar kostenplaats" in de classificatie overschrijft nu alle koppelingen. Zo laten of voortaan alleen lege regels vullen?
- [ ] `package-lock.json` committen (`npm install` is lokaal gedraaid)
- [ ] `Journaalposten.pdf` opnieuw uploaden en de ruwe uitvoer van `pdfItemsNaarTabel()` (geanonimiseerd) bewaren als testvoorbeeld
- [ ] Open vragen 1, 2, 9, 12 en 13 in `ROADMAP.md` beantwoorden
- [ ] Proef met een echt, geanonimiseerd declaratiebestand (openstaand sinds 2.0.1)
- [ ] Daarna 2.0.6, de aparte tariefcontrole (raakt `src/core`; per keer toestemming vragen)

## Bekende problemen
- 4 van de 10 kerncontroles blijven grijs: `secondary_totals` wordt nergens gevuld (alleen op de debug-pagina)
- `npm ci` faalt tot de lockfile is gecommit
- Lint: 2 fouten in shadcn-bestanden (`command.tsx`, `textarea.tsx`); `npm audit`: 17 hoge meldingen in afhankelijkheden
- Opslag alleen in de browser (`localStorage`): een gewist profiel kost dossiers

## Volgende sessie: begin hier
Draai `git pull` en `npx vitest run` (verwacht 30 testbestanden en 241 tests). Probeer daarna in de Lovable-preview: (1) op het dashboard "Voorbeelddossier laden", het dossier openen en de lijst "Wat ontbreekt nog?" nakijken (verwacht: alles compleet, volgende stap "Bekijk de controle"); (2) "Back-up maken", daarna "Back-up terugzetten" met dat bestand; (3) bij een eigen dossier de kolom "Kostenplaats of cliënt" koppelen en "Koppel automatisch op naam" proberen. Begin daarna met de proef met een echt declaratiebestand.

## Bestanden gewijzigd
- `src/components/AppShell.tsx` — "Diagnose" uit het zijmenu (route blijft)
- `src/components/bronnen/ClassificatieTab.tsx` — kolom Kostenplaats: automatisch op naam en koppelen per medewerker (directe uren)
- `src/components/bronnen/KoppelOpNaam.tsx` — nieuw: koppelen op naam, en per medewerker
- `src/components/bronnen/MappingTab.tsx` — Nederlandse veldnamen en uitleg; knop "Onthoud deze kolomkeuze voor deze klant"
- `src/components/bronnen/ToewijzingPaneel.tsx` — koppelen op naam bij gedeclareerde uren
- `src/components/dashboard/VoorbeeldEnBackup.tsx` — nieuw: voorbeelddossier en back-up op het dashboard
- `src/components/projecten/ProjectenBeheer.tsx` — "Kostenplaatsen & tarieven"
- `src/components/projecten/ToerekeningOverzicht.tsx` — wording kostenplaats
- `src/lib/backup.ts` — nieuw: back-up maken, controleren en terugzetten
- `src/lib/backup.test.ts` — nieuw: tests back-up, incl. heen-en-terug
- `src/lib/bronnen.ts` — veldnamen in validatiemeldingen; kolom Kostenplaats (optioneel); lezen en opruimen per dossier
- `src/lib/dossier-voortgang.ts` — nieuw: wat ontbreekt nog en de volgende stap
- `src/lib/dossier-voortgang.test.ts` — nieuw: tests voortgang
- `src/lib/dossier-voortgang-uren.test.ts` — nieuw: Wlz-verblijf vraagt geen kostenplaats
- `src/lib/dossiers.ts` — dossier schrijven met vaste id, en verwijderen
- `src/lib/gedeclareerde-uren.test.ts` — verwacht nu de Nederlandse veldnaam
- `src/lib/koppel-op-naam.ts` — nieuw: voorstel op naam en per medewerker (puur)
- `src/lib/koppel-op-naam.test.ts` — nieuw: tests
- `src/lib/loonjournaal-randgevallen.test.ts` — verwacht nu "Periode" met hoofdletter
- `src/lib/projecten.ts` — alle kostenplaatsen lezen, schrijven met vaste id, opruimen per dossier
- `src/lib/veld-labels.ts` — nieuw: centrale Nederlandse veldnamen en uitleg
- `src/lib/veld-labels.test.ts` — nieuw: tests veldnamen
- `src/lib/voorbeeld.ts` — nieuw: voorbeelddossier met vaste ids
- `src/lib/voorbeeld.test.ts` — nieuw: tests voorbeelddossier
- `src/pages/Dashboard.tsx` — volgende stap i.p.v. de teller; kaart "Voorbeeld en back-up"
- `src/pages/DossierBronnen.tsx` — tabblad openen via ?tab=
- `src/pages/DossierControle.tsx` — wording kostenplaats
- `src/pages/DossierDetail.tsx` — kaart "Wat ontbreekt nog?"
- `ROADMAP.md` — versie 0.10: blok Gebruiksvriendelijkheid, 4.1 afgevinkt
- `HANDOFF.md` — deze sessie bijgewerkt

## Belangrijke context
- Rol: de app is een onafhankelijke tweede lijn. Uren en bedragen komen van de klant; de app corrigeert of fiatteert niets
- Werkwijze net als BoekAssist: Claude levert bestanden, gebruiker kopieert, draait `npx vitest run`, commit en push
- `src/core/` alleen wijzigen na expliciete toestemming (zie `CLAUDE.md`)
- Periode van het loonjournaal valt terug op de afdrukdatum als er geen label "Periode" staat (open vraag 7)
