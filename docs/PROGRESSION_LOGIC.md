# Progression & Mätlogik

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

### 3.2 Weighted difficulty mix

Basbucketar:

- `very_easy` (offset -2): 5%
- `easy` (offset -1): 25%
- `core` (offset 0): 50%
- `hard` (offset +1): 15%
- `challenge` (offset +2): 5%

Bucket-vikter justeras dynamiskt:

- mer lätt vid låg success/felstreak
- mer svår/challenge vid hög success

Målnivå = `round(currentDifficulty) + bucketOffset`, clamped till tillåtet nivåspann.

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
- `skillTag`
- `selectionReason` (t.ex. `weighted_mix`, `warmup_after_break`)
- `difficultyBucket` (`easy/core/hard/...`)
- `targetLevel`
- `abilityBefore`, `abilityAfter`
- `isReasonable`, `absError`, `relativeError`, `tolerance`
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

## 9. “Klarat nivå” (elevvy)

Regel för mastery:

- minst 5 försök på nivån
- minst 80% rätt

Beräknas för:

- historiskt
- denna vecka

I träningsvyn visas diskret bara aktuell typ.  
På elevens startsida visas klarade nivåer per räknesätt.

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
