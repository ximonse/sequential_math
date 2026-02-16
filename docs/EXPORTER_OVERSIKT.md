# Exporter - oversikt, aktivitet och elevvy

Detta dokument forklarar kolumner i:
- `Export oversikt`
- `Export skill`
- `Export tabeller`
- `Export aktivitet`
- `Exportera elevvy CSV`

For `Export radata`, se `docs/EXPORTER_RADATA.md`.

## Gemensamt for alla exporter

- CSV separator: `;`
- Filerna skrivs med UTF-8 BOM for att svenska tecken ska visas ratt i Excel.
- Tider exporteras som ISO-tidsstampel dar det ar relevant.

## 1. Export oversikt

Kalla i kod: `buildSnapshotCsvRows(...)` i `src/components/teacher/Dashboard.jsx`.

### Bas-kolumner (alla lagen)

- `Namn`: elevens namn.
- `ID`: elev-ID.
- `Klass`: sammanfogad klass/gruppetikett.
- `SenastAktiv`: senaste aktivitet (ISO).
- `TidPaUppgiftIdagMin`: dagens engaged tid i minuter.
- `TidPaUppgift7dMin`: senaste 7 dagars engaged tid i minuter.
- `InteraktionerIdag`: antal interaktioner idag.
- `Interaktioner7d`: interaktioner senaste 7 dagar.
- `RiskNiva`: `low | medium | high`.
- `RiskScore`: regelbaserad riskdel (0-100).
- `StodScore`: sammanvagt stodscore (0-100).

### Extra i Dagsvy

- `DagensMangd`: antal forsok idag.
- `DagensRatt`: antal ratt idag.
- `DagensFel`: antal fel idag.
- `DagensKunskapsfel`: fel klassade som kunskapsfel.
- `DagensOuppmarksamhetsfel`: fel klassade som ouppmarksamhet.
- `DagensTraff`: `DagensRatt / DagensMangd`.
- `DagensUppdragsfoljsamhet`: andel dagens forsok som matchar aktivt uppdrag.
- `DagensKamparMed`: svagaste skill idag.

### Extra i Veckovy

- `VeckansMangd`: antal forsok sedan veckostart.
- `VeckansRatt`: antal ratt sedan veckostart.
- `VeckansFel`: antal fel sedan veckostart.
- `VeckansKunskapsfel`: veckans kunskapsfel.
- `VeckansOuppmarksamhetsfel`: veckans ouppmarksamhetsfel.
- `VeckansTraff`: `VeckansRatt / VeckansMangd`.
- `VeckansAktivTidSek`: summa speed tid for veckan.
- `VeckansMal`: aktivt veckomal i dashboard.
- `VeckansMalNatt`: `ja` om veckans mangd >= veckomal.
- `VeckansUppdragsfoljsamhet`: andel veckoforsok som matchar uppdrag.
- `VeckansKamparMed`: svagaste skill veckan.

### Extra i Alla elever-laget

- `ForsokTotalt`: total antal forsok.
- `RattTotalt`: total antal ratt.
- `OuppmarksamhetsfelTotalt`: total ouppmarksamhet.
- `TraffTotalt`: total traffsakerhet.
- `RimlighetTotalt`: andel rimliga svar.
- `Uppdragsfoljsamhet`: total andel match mot aktivt uppdrag.
- `Trend`: skillnad i traff mellan senaste och foregaende 10 svar.

Pedagogiskt varde:
- Oversikten ar den snabbaste filen for daglig/veckovis klassuppfoljning.

## 2. Export skill

Kalla i kod: `buildSkillComparisonExportRows(...)` i `src/lib/teacherAnalytics.js`.

Nyckelgruppering:
- per elev,
- per skillTag,
- per niva.

Kolumner:
- `ElevNamn`, `ElevID`, `Klass`.
- `Raknesatt`: addition/subtraktion/multiplikation/division.
- `SkillTag`: intern skill-id.
- `Niva`: konceptuell niva.
- `Forsok`: antal forsok i gruppen.
- `Ratt`: antal ratt i gruppen.
- `Traffsakerhet`: i forsta hand kunskapsfel-rensad andel (nar underlag finns).
- `MedianTidRattSek`: elevens median pa korrekta speed-tider.
- `PeerMedianTidSek`: median for jamforbar grupp (samma template+niva).
- `SpeedIndex`: `PeerMedian / ElevMedian`.
- `Accuracy7d`, `Accuracy30d`: traff i 7 respektive 30 dagar.
- `AccuracyTrend7d`: `Accuracy7d - AccuracyPrev7d`.
- `TidMedian7d`, `TidMedianPrev7d`: tidsmedianer over tva 7-dagarsfonster.
- `SpeedTrend7d`: `(TidMedianPrev7d - TidMedian7d) / TidMedianPrev7d`.

Pedagogiskt varde:
- Visar om eleven blir sakrare och snabbare i just delmomentet, inte bara "total matte".

## 3. Export tabeller

Kalla i kod: `buildTableDevelopmentExportRows(...)` i `src/lib/teacherAnalytics.js`.

Nyckelgruppering:
- per elev,
- per tabell (2-12).

Kolumner:
- `ElevNamn`, `ElevID`, `Klass`, `Tabell`.
- `ForsokTotalt`: totalt antal forsok pa tabellen.
- `TraffsakerhetTotalt`: total andel ratt pa tabellen.
- `MedianTidTotaltSek`: total median pa korrekta speed-tider.
- `PeerMedianTidSek`: gemensam median for tabellen i urvalet.
- `SpeedIndexTotalt`: `PeerMedian / ElevMedian`.
- `Forsok7d`: antal forsok senaste 7 dagar.
- `Traffsakerhet7d`: andel ratt senaste 7 dagar.
- `TraffTrend7d`: `Traffsakerhet7d - TraffsakerhetPrev7d`.
- `MedianTid7dSek`: median tid 7d.
- `MedianTidPrev7dSek`: median tid foregaende 7d.
- `SpeedTrend7d`: `(MedianTidPrev7d - MedianTid7d) / MedianTidPrev7d`.

Pedagogiskt varde:
- Stark for att folja automatisering i gangertabeller over tid.

## 4. Export aktivitet

Kalla i kod: `buildActivityExportRows(...)` i `src/components/teacher/Dashboard.jsx`.

Kolumner:
- `ElevNamn`, `ElevID`, `Klass`.
- `AktivNuStatus`: `green|orange|black|red`.
- `HarLoggatIn`: 1/0.
- `LoginCount`: antal inloggningar.
- `SenastAktiv`: senaste aktivitet (ISO).
- `FokusSida`: vilken sidtyp eleven senast var pa.
- `TidPaUppgiftIdagMin`, `FokusTidIdagMin`, `InteraktionerIdag`.
- `TidPaUppgift7dMin`, `FokusTid7dMin`, `Interaktioner7d`.
- `TraningStarterIdag`.
- `TraningSvarIdag`, `TraningRattIdag`, `TraningFelIdag`.
- `TicketSvarIdag`, `TicketRattIdag`, `TicketFelIdag`.
- `PausFragorIdag`, `PauserTagnaIdag`, `PauserSkippadeIdag`.
- `SessionerStartadeIdag`, `SessionerAvslutadeIdag`.
- `TelemetryEventsTotal`.

Pedagogiskt varde:
- Underlag for "time on task", deltagandegrad och arbetsvanor, inte bara mattepoang.

## 5. Exportera elevvy CSV

Kalla i kod: `buildStudentDetailExportRows(...)` i `src/components/teacher/Dashboard.jsx`.

Format:
- filen ar sektionerad med kolumnen `Sektion`.
- radtyper: `Sammanfattning`, `Tabellstatus`, `Nivastatus`, `SenasteProblem`, `Metadata`.

### Sammanfattning
- elevidentitet, klass, totaler, tid pa uppgift, niva nu/hogst, aktivitet, svagast/starkast typer.

### Tabellstatus
- en rad for total och en rad for 7d per tabell.
- innehaller `Tabell`, `Status`, `Forsok`, `Ratt`, `TraffProcent`.

### Nivastatus
- per raknesatt och period (`Historiskt`, `DennaVecka`).
- innehaller `Niva`, `Status`, `Forsok`, `Ratt`, `TraffProcent`.

### SenasteProblem
- upp till 80 senaste problem.
- innehaller bl.a. `Nyckel` (problemtyp), `Del` (raknesatt), `Niva`, `Tabell`, `Status`, `TidSek`, `Varde` (felkategori), `Tidsstampel`.

Pedagogiskt varde:
- ger individnara underlag for samtal med elev och planering av nasta steg.

## 6. Rekommenderad tolkning i Excel

- Filtrera bort mycket sma underlag innan jamforelse.
- Jamfor inom samma raknesatt+niva innan du jamfor mellan olika nivaer.
- Separera kunskapsfel fran ouppmarksamhetsfel i analyser.
- Anvand median for tid (inte medel) dar det ar mojligt.
