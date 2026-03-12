# Arbetslogg

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
