# Export radata - kolumnordlista

Detta dokument forklarar `Export radata` (problemdata detalj).

Kalla i kod:
- `buildDetailedProblemExportRows(...)` i `src/lib/teacherAnalytics.js`
- underlag fran `flattenProblems(...)` i samma fil.

## 1. Radniva

- En rad = ett loggat elevsvar pa en uppgift.
- Underlaget tas fran elevens senaste tillforlitliga problemkalla (`problemLog` eller `recentProblems`).

## 2. Kolumner

| Kolumn | Hur den beraknas | Varfor den finns |
|---|---|---|
| `DatumTid` | problemets tidsstampel i ISO-format | Tidlinje for analys |
| `ElevNamn` | profilens namn | Identifiering |
| `ElevID` | profilens ID | Identifiering |
| `Klass` | profilens klassnamn | Gruppjamforelse |
| `Raknesatt` | infereras fran problemtyp (`add_`, `sub_`, `mul_`, `div_`) | Delanalys per raknesatt |
| `Problemtyp` | template-id for uppgiften | Exakt delmoment |
| `SkillTag` | skilltag om finns, annars problemtyp | Finare segmentering |
| `Niva` | konceptuell niva (oftast `difficulty.conceptual_level`) | Jamforelse inom svarighetssteg |
| `Ratt` | `1` om korrekt, annars `0` | Bastraffsakerhet |
| `Felkategori` | `none`, `knowledge`, `inattention` | Felklassning |
| `Kunskapsfel` | `1` om fel och inte inattention | Metodbrist vs annat |
| `Ouppmarksamhetsfel` | `1` om inattention | Separera uppmarksamhetsmissar |
| `RimligtSvar` | `1` om svaret ligger inom rimlighetstolerans | Felkvalitet, inte bara ratt/fel |
| `SvarstidSek` | ra svarstid (`timeSpent`) | Fullt tidsutfall |
| `SpeedTidSek` | tidsvarde efter outlier/avbrottsfilter | Robust hastighetsanalys |
| `ExkluderadSpeed` | `1` om tid exkluderats fran speed | Datakvalitetsflagga |
| `ExkluderingsOrsak` | t.ex. `hard_cap`, `interruption`, `personal_outlier` | Transparens i filtrering |
| `AvbrottMisstankt` | `1` vid dold tid/blur-monster | Skydd mot falsk "langsam" |
| `DoldTidSek` | sammanlagd dold tid under uppgiften | Kontext vid avbrott |
| `Progressionslage` | `challenge` eller `steady` | Tolkning av progressionstempo |
| `SelectionReason` | urvalsorsak for uppgift | Forstar varfor denna uppgift kom |
| `DifficultyBucket` | adaptivt bucket-val (`easy/core/hard/...`) | Svarighetsmix-analys |
| `TargetLevel` | malniva vid urvalet | Jamforelse av avsikt vs utfall |
| `AbilityBefore` | elevens uppskattade forformaga fore uppgiften | Adaptiv sparning |
| `CarryCount` | antal overgangar i uppgiften (om relevant) | Procedurbelastning |
| `BorrowCount` | antal lan i uppgiften (om relevant) | Procedurbelastning |
| `TermOrder` | ordning stor/liten term for vissa templates | Variationsanalys |
| `PeerMedianTidTemplateNiva` | median speedtid for samma problemtyp+niva i urvalet | Referensram |
| `PeerAccuracyTemplateNiva` | andel ratt for samma problemtyp+niva i urvalet | Referensram |
| `SpeedIndexTemplateNiva` | `PeerMedianTidTemplateNiva / SpeedTidSek` | Hastighet relativt jamforbara |
| `Tabell` | infererad tabell (2-12) om gangertabellproblem | Tabellanalyser |
| `PeerMedianTidTabell` | median speedtid for tabellen i urvalet | Referensram tabeller |
| `SpeedIndexTabell` | `PeerMedianTidTabell / SpeedTidSek` | Hastighet i tabellkontext |

## 3. Viktiga berakningsdetaljer

### 3.1 SpeedTid och exkludering

`SpeedTidSek` ar null/exkluderad om nagon regel slar till, t.ex.:
- ogiltig tid,
- hard cap over 180 sek,
- misstankt avbrott,
- personlig outlier mot elevens egen baseline.

Detta ger hogre reliabilitet i hastighetsjamforelser.

### 3.2 Kunskapsfel kontra ouppmarksamhet

- `Kunskapsfel = 1` nar felet inte klassas som `inattention`.
- `Ouppmarksamhetsfel = 1` nar felmonster tyder pa uppmarksamhetsmiss.

Syfte: undvika att metodkunskap undervarderas av tillfalliga fokusmissar.

### 3.3 Peer-jamforelser

- Peer-varden byggs pa aktuell exportmangd (det urval du exporterar).
- Jamforelsen ar mest valid nar urvalet ar pedagogiskt relevant (t.ex. samma arskursgrupp).

## 4. Rekommenderad tolkning

- Jamfor alltid hastighet inom samma `Problemtyp + Niva`.
- Krav pa minsta underlag innan starka slutsatser (t.ex. minst 8-10 rader).
- Anvand `ExkluderadSpeed` och `ExkluderingsOrsak` aktivt i filtrering.
- Om du vill bedoma kunskap: filtrera eller markera `Ouppmarksamhetsfel` separat.

## 5. Pedagogiskt vardeforslag i praktiken

- Hitta nivaer med hog `Kunskapsfel` och lag `PeerAccuracyTemplateNiva`:
  - detta pekar pa moment som sannolikt behover tydligare undervisning.
- Hitta elever med god traff men lag `SpeedIndex` pa samma problemtyp:
  - prioriterad mangdtraning/automatisering snarare an konceptomstart.
- Hitta hog andel `inattention` men relativt god rimlighet:
  - behov av arbetsro, rutiner, pacing, inte i forsta hand ny metodgenomgang.
