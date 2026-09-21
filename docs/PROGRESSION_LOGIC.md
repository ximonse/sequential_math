# Progression & Mätlogik

> OBS - KOD AR KALLAN:
> Detta dokument ar en forklaringsguide. Source of truth for faktisk drift:
> - `src/lib/difficultyAdapter.js`
> - `src/lib/studentProfile.js`
> - `src/lib/problemGenerator.js`
> - `src/lib/answerQuality.js`
> Vid avvikelse mellan text och implementation ar det koden som galler.

Detta dokument beskriver hur appen väljer uppgifter, hur svårighet anpassas, vad som loggas, och hur elevens progression bedöms i nuvarande implementation.

## 1. Översikt

Appen använder en adaptiv modell med:

- en **center-nivå** (`currentDifficulty`)
- en **viktad svårighetsmix** runt center
- **per-skill loggning** (template-baserad)
- **reasonableness** (rimlighet) utöver rätt/fel
- särskilda flöden för:
  - warmup efter frånvaro
  - warmup när elev väljer nytt/fokuserat räknesätt
  - uppdrag via länk / aktivt klassuppdrag

Källfiler:

- `src/lib/difficultyAdapter.js`
- `src/lib/studentProfile.js`
- `src/lib/problemGenerator.js`
- `src/lib/answerQuality.js`

## 2. Lägen i elevflödet

Eleven kan träna i:

- **Fri träning**
- **Fokuserat läge**: addition, subtraktion, multiplikation, division
- **Uppdrag** (assignment) via länk eller aktivt för alla

Prioritet i problemval:

1. Uppdrag (om aktivt) styr typer + nivåintervall.
2. Fokuserat läge styr till en typ.
3. Annars fri träning med adaptiv typmix.

## 3. Hur nästa uppgift väljs

### 3.1 Huvudflöde

`selectNextProblem(profile, options)` använder:

- senaste träffsäkerhet (`getRecentSuccessRate`, 5 senaste)
- felstreak (`getConsecutiveErrors`)
- center-nivå (`currentDifficulty`)

Möjliga valvägar:

1. **Forced warmup** (sessionstyrd)  
2. **Frånvaro-warmup**  
3. **Recovery easy** vid hög felstreak  
4. **Push harder** vid hög stabil success  
5. **Relief easier** vid låg success  
6. **Normal weighted mix** (default)

### 3.3 Variationsskydd (anti-repeat)

Efter att en kandidat valts körs en **novelty-score** mot senaste historiken
innan uppgiften visas.

- historikfönster: 8 senaste uppgifter + nuvarande uppgift
- upp till 8 kandidatförsök per nästa uppgift
- exakt repetition straffas hårt
- strukturell repetition (samma uppgiftstyp/promptform) straffas medel
- återanvändning av samma tal straffas lätt

Motorn väljer den kandidat som har lägst novelty-score och accepterar tidigt
om score redan är låg. Detta gäller alla domäner (inte bara aritmetik med `a/b`).

Dessutom blockeras exakt samma uppgift två gånger i rad så länge det finns
alternativ i kandidatförsöken.

För bråk gäller dessutom:
- **Nivå 3** är en dedikerad förenkla-fokusnivå.
- Övriga bråknivåer innehåller fortfarande förenklingskrav i mix, men med lägre andel.

### 3.2 Weighted difficulty mix

Basbucketar (challenge-profil, används för all träning):

- `very_easy` (offset -2): 5%
- `easy` (offset -1): 25%
- `core` (offset 0): 50%
- `hard` (offset +1): 15%
- `challenge` (offset +2): 5%

Bucket-vikter justeras dynamiskt:

- mer lätt vid låg success/felstreak
- mer svår/challenge vid hög success

Målnivå = `round(currentDifficulty) + bucketOffset`, clamped till tillåtet nivåspann.

> **Obs:** Tidigare fanns ett tempoval (Utmaning/Lugn) med olika bucket-profiler.
> Tempovalet är borttaget — alla sessioner använder nu samma profil.
> I praktiken hade `lockToMasteryFloor` redan gjort bucket-skillnaderna irrelevanta
> för all single-domain- och fri träning.

## 4. Typmix (räknesätt) i fri träning

`chooseProblemType(...)` introducerar typer stegvis:

- Start: mest addition
- Subtraktion introduceras före multiplikation
- Multiplikation introduceras senare
- Division introduceras senare och försiktigt

Om elev kämpar (låg success/hög felstreak) prioriteras enklare bas (addition).

## 5. Warmup-logik

### 5.1 Efter frånvaro

Om elev varit borta minst 1 dag:

- första uppgifterna sänks något i nivå
- 70/30 bias mot lättare uppgifter
- syfte: snabbare in i 80/20-känsla

### 5.2 Fokuserat räknesättsläge

När elev väljer t.ex. bara division:

- om ingen historik i räknesättet: start på nivå 1
- annars start lite under beräknad nivå för den typen
- första ~3 uppgifter rampas upp snabbt mot beräknad nivå

## 6. Hur svårigheten justeras efter svar

`adjustDifficulty(profile, wasCorrect)`:

- upp på rätt svar (streak/success beroende)
- ner på fel svar (streak/success beroende)
- clamp 1..12
- uppdaterar även `highestDifficulty`

Dessutom:

- per-skill state uppdateras efter varje svar:
  - ability
  - attempts/correct/reasonable
  - avgTime
  - lastSeen

## 7. Vad som loggas per elevsvar

I `recentProblems` sparas bl.a.:

- `problemType`, `difficulty`, `timeSpent`, `correct`
- `promptText` (visad uppgiftstext)
- `skillTag`
- `selectionReason` (t.ex. `weighted_mix`, `warmup_after_break`)
- `difficultyBucket` (`easy/core/hard/...`)
- `targetLevel`
- `abilityBefore`, `abilityAfter`
- `isReasonable`, `absError`, `relativeError`, `tolerance`
- `isPartial`, `partialCode`, `partialDetail` (för svar som är värdemässigt rätt
  men formmässigt ofullständiga, t.ex. explicit koefficient `1x`)
- metadata som `carryCount`, `borrowCount`

I `adaptive.recentSelections` sparas urvalslogg (för framtida visualisering).

## 8. Reasonableness (rimlighet)

`evaluateAnswerQuality(...)` använder:

- absolutfel
- relativt fel
- tolerans baserad på:
  - räknesätt
  - nivå
  - om decimaler förekommer

Resultat: `isReasonable` + felmått.

Detta används i:

- lärarens tabell (rimlighet/medelavvikelse)
- per-skill adaptiv uppdatering

## 9. “Klarat nivå” och automatisk fortsättning

Regel för mastery:

- minst 5 försök på nivån (av de senaste 15 per nivå)
- minst 85% rätt (beräknat på senaste 15 försök, inte alla)

Sliding window: Både träningssystemet och Framsteg-kortet använder de
**senaste 15 försöken** per operation+nivå för mastery-bedömning. Äldre misstag
under inlärningsfasen drar inte ner snittet permanent.

Datakälla: Framsteg-kortet läser från `problemLog` (max 5000 poster) för att
undvika att resultat försvinner vid intensiv fri träning. Träningssystemets
mastery-check (`getLowestUnmasteredLevel`) läser från `recentProblems` (max 250)
med samma 15-fönster.

Beräknas för:

- historiskt
- denna vecka

I träningsvyn visas diskret bara aktuell typ.
På elevens startsida visas klarade nivåer per räknesätt.

När svarspipelinen skapar ett nytt mastery-faktum skapar
`adaptationDecision.js` samtidigt ett `adaptation_decision` enligt regelversion
1. Beslutet bär operation, från-/nästanivå, träningsram, observationsreferenser,
syfte och reason codes. Händelsen lagras idempotent både lokalt och via
event-API:t.

- fri träning, områdesfokus och nivåfokus får `advance` till nästa steg;
- nivå 12 får `complete_domain`;
- ett låst läraruppdrag, eller taket i ett adaptivt läraruppdrag, får
  `hold_frame` och lämnar inte lärarens ram.

Eleven får inget ja/nej-val och förvarnas inte före avanceringen. Efter ett
nytt mastery-belägg visas en avgränsad gratulation med en enda knapp:
`Fortsätt`. I nivåfokus öppnar den redan beslutade nästa nivån. I övriga lägen
väljer den befintliga scoped-motorn nästa uppgift från det uppdaterade
mastery-golvet inom träningsramen.

### 9.1 Aktuellt träningsbehov och återhämtning

Varje mastery-berättigad observation uppdaterar även ett versionsmärkt
`CurrentNeed` per kompetens. Det är skilt från historiska masteryfakta och
innehåller syfte, målnivå, reason codes, ram och observationens ID. Scoped
problemval läser detta behov, och nästa uppgift bär behovets ID och syfte vidare
till den sparade observationen.

Regelversion 1 samlar två tidigare spridda streakvärden till en uttrycklig
återhämtningsregel:

- tre fel i följd ger `recover` ett steg lägre, klampat inom träningsramen;
- ett rätt svar behåller återhämtningen;
- två fullständigt rätta svar i följd återgår till `consolidate` på aktuellt
  mastery-golv;
- fyra observationer i följd medan återhämtningen är aktiv, utan två
  fullständigt rätta svar i följd, ger `support` på samma målnivå;
- ett nytt masterybeslut ger `challenge` på nästa steg.

Lärarlåsta intervall klampas alltid; `recover` kan därför beskriva stödbehovet
utan att lämna den tilldelade nivån. `support` pausar inte eleven och visar ingen
automatisk stöddialog. Träningen fortsätter på samma återhämtningsnivå, medan
lärarbilden får en signal med upp till sex identifierbara felsvar, inklusive
fråga, elevsvar, facit, innehåll och nivå. Två fullständigt rätta svar i följd
avslutar både återhämtningen och signalen. Ett samlat startbeslut återstår i E3.

## 10. Assignment-logik

Assignment kan begränsa:

- `allowedTypes`
- `levelRange`

Det påverkar både uppgiftsval och adaptiv nivåclamp.

## 11. Framtidssäkring (nya räknesätt)

`src/lib/operations.js` är central för labels i elevvyer.  
När nya räknesätt läggs till:

1. Lägg label i `OPERATION_LABELS`
2. Lägg templates
3. Lägg typ-prefix i infer/normalisering vid behov
4. Justera typmix-vikter vid behov

## 12. Kända begränsningar

- Många regler är heuristiska (inte IRT/BKT än).
- Reasonableness är generell, inte ämnesspecifik per alla subskills.
- UI visar inte ännu full loggvisualisering; datat finns för framtida dashboards.
- Vissa tidiga nivåer har medvetet smal svårighetsyta för pedagogisk tydlighet, så viss repetition finns kvar trots anti-repeat.
