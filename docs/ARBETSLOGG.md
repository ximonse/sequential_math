# Arbetslogg

## 2026-03-16

- Fixade kritisk bugg: molnsync misslyckades tyst pa iPad nar sessionssekret lagrades i sessionStorage (som rensas vid tab-kill). Flyttade till localStorage.
- Tabelltraningsresultat synkroniseras nu direkt (forceSync) istallet for att vanta pa 90-sekunders throttle.
- Lade till explicit 401-hantering och authStale-flagga i molnsync sa att foraldrade sessioner upptacks.
- Lade till CORS-headers pa teacher-class-extras och class-config API-endpoints.
- Fixade merging av adaptiv engine-state vid profilmerge (operationAbilities tar max, skillStates behaller version med flest forsok).
- Bytade till timing-safe jamforelse for losenord pa servern.
- Tog bort error.message fran 500-svar (lakage).
- Fixade UI: "Startsida"-knappen doldes bakom temaväljaren — lade till pr-44 padding.
- Lade till 21-dagars stapeldiagram for gangertabellsaktivitet i lararens elevdetalj (mellan "senast tranad" och "Framsteg").
- Fixade kraschbugg i useDashboardViewData — recentProblems accessades utan Array.isArray-guard pa nya elever.
- Fixade "Traff elev"-kolumnen i Svarighetsanalys: fargkodningen anvande felandel istallet for traffprocent (inverterad signal). Nu fargas korrekt: gron >= 80%, amber >= 60%, rod < 60%.
- Fixade sortering av "Traff elev" — sorterade pa errorShare istallet for successRate, sa "Storst forst" gav samsta eleverna overst.
- Fixade DST-bugg i stapeldiagrammet — bytade fran fast 24h-division till per-bucket dayStart-jamforelse.
- Ny panel: "Nivaoversikt" — klassvy med effektiv konsekutiv masteryniva per elev per operation. Visar hogsta sammanhanande klarade nivan (inte hogsta enskilda). Sortbar pa alla kolumner och snitt.

Referens-commits:
- `9b7065f` - Fix critical cloud sync bug, add CORS, harden auth and profile merge
- `137dc5d` - Add right padding to session header so exit button clears theme switcher
- `4de115e` - Add 21-day table drill activity bar chart to teacher dashboard
- `9468553` - Fix dashboard bugs: crash guard, accuracy color/sort, DST bar chart
- `65f7c14` - Add class mastery level overview panel to teacher dashboard

## 2026-03-07

- Lade till division niva 1 och 2 i uppgiftsgenereringen och gjorde dem synliga i elevens Framsteg.
- Fri traning fick strikt nivalasning per global lagsta ofardiga niva, med rotation mellan domaner pa samma niva.
- En-domantraning fick nivalasning till lagsta ofardiga niva.
- Framsteg (niva-fokus via klick pa niva) fortsatter utan nivalas, dvs explicit vald niva styr.
- Lade till hoegerjusterad `Ga till nasta niva`-knapp i niva-fokusbannern efter nekat erbjudande om niva-hojning.
- Lade till tester for sessionslogik kopplat till nivalas och nasta-niva-beteende.
- Lade till explicita sorteringskontroller i larardashboardens Svarighetsanalys:
  - sortera efter kategori
  - ordning (A-O / O-A eller minst-storst)
- Verifiering kord: `npm run test` och `npm run build` passerade efter andringarna.

## 2026-03-12

- Tog bort tempovalet (Utmaning/Lugn) — var i praktiken en no-op med lockToMasteryFloor.
- Nivaerbjudande fungerar nu i alla single-domain-sessioner, inte bara steady-lage.
- Framsteg-kortet laser nu fran problemLog (5000) istallet for recentProblems (250) sa resultat inte forsvinner efter fri traning.
- Mastery-berakning anvander sliding window (senaste 15 forsok per niva) konsekvent i bade traning och Framsteg.
- Fixade bugg dar mastery aldrig uppnaddes om tidiga misstag under inlarning drog ner snittet.
- Bytte "Avsluta"-knapp till "Startsida".
- Flyttade temaväljaren till horisontell layout med kontrastknapp bredvid.
- Lade till CSS-overrides for alla fargfamiljer (kontrast i mörka teman).
- Snabbade upp sessionsstart: lokal profil returneras direkt, molnsync i bakgrunden.

## Referens-commits

- `56d5391` - Add division levels 1-2 and expose them in progress
- `f35d97f` - Enforce training level locks and add level-focus next-level action
- `7b17df9` - Add explicit sorting controls for teacher difficulty analysis
