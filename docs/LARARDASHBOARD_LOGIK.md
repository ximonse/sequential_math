# Larardashboard - logik och kolumnforklaringar

Detta dokument forklarar **vad varje sektion visar**, **hur siffrorna beraknas i koden**, **varfor de beraknas sa**, och **vilket pedagogiskt varde de har**.

Primar kodkalla: `src/components/teacher/Dashboard.jsx`.

## 1. Tolkningsregler (viktigt)

- Tolka aldrig en enskild kolumn isolerat. Kombinera minst:
  - traffsakerhet,
  - feltyp (kunskapsfel/ouppmarksamhet),
  - tid pa uppgift,
  - aktuell niva/problemtyp.
- Smatt underlag ger osakra slutsatser.
  - Exempel: `Felandel per niva` visar bara nivaer med minst 8 forsok.
- Tid och snabbhet pa hogre nivaer ar inte direkt jamforbar med latta nivaer.
  - Jamfor inom samma raknesatt + niva/problemtyp.

## 2. Urval: klass/grupp

- Dashboarden filtrerar alla paneler med vald(a) klass/grupp(er).
- Om inget ar valt visas alla elever.
- Valet sparas lokalt i lararens webblasare.

Pedagogiskt varde:
- Du kan snabbt skifta mellan grupper utan att tappa kontext.
- Samma urval over alla paneler minskar risken for feltolkning.

## 3. Ovre snabbkort

### Antal elever
- Berakning: `filteredStudents.length`.
- Varde: visar storlek pa aktuellt underlag.

### Aktiva idag
- Berakning: antal elever dar senaste problem-tidsstampel ar efter dagens start (00:00).
- Varde: snabb narvarosignal kopplad till faktisk uppgiftslosning.

### Genomsnitt success
- Berakning: medel av elevens `overallSuccessRate` for alla i urvalet.
- Varde: grov klassindikator, men ska kompletteras med spridning och individdata.

### Totalt problem
- Berakning: summa av `stats.totalProblems` for elever i urvalet.
- Varde: visar mangdtraning (inte kvalitet i sig).

## 4. Datakvalitet

Kolumner:
- `Telemetry tackning`: antal elever med minst 1 telemetry-event.
- `Narvarosignal idag`: antal elever med `presenceLastSeenAt` idag.
- `Session-gap idag`: elever dar `sessions_started > sessions_ended`.
- `Datamismatch idag`: elever dar `|telemetry_svar - registrerade_forsok| >= 4`.
- `Overall quality %`: medel av fyra delscore:
  - telemetryCoverage,
  - presenceCoverage,
  - sessionGapScore,
  - mismatchScore.

Varfor sa:
- Fore analys maste datat vara tillrackligt komplett och konsistent.

Pedagogiskt varde:
- Hindrar felaktiga slutsatser om elevprestation nar underlaget ar tekniskt ofullstandigt.

## 5. Insikter fran anvandning (7d)

Kolumner:
- `Tid pa uppgift / aktiv elev`: total engaged tid / antal aktiva elever.
- `Median sessionslangd`: median av sessioners varaktighet.
- `Pausacceptans`: `breaks_taken / break_prompts_shown`.
- `Ticket traffsakerhet (idag)`: `ticket_correct / ticket_submitted`.
- `Vanligaste traningsstart`: topp eventtyper for startlage.
- `Vanligaste felkategori`: topp felkategorier i practice_answer-event.

Varfor sa:
- Fokus pa hur appen faktiskt anvands, inte bara resultat.

Pedagogiskt varde:
- Ger underlag for att justera lektionsdesign, passlangd och val av ovningslage.

## 6. Klass/gruppvy - snabbstatus

Kolumner:
- `Elev`: namn + elev-ID.
- `Status`: aktivitetsfarg (se avsnitt 14).
- `Jobbar med`: elevens fokusraknesatt nu.
- `Idag`: antal forsok idag.
- `Ratt/Fel idag`: `todayCorrectCount/todayWrongCount`.
- `Traff idag`: `todayCorrectCount/todayAttempts`.
- `Tid pa uppgift idag`: engaged tid idag.
- `Senast aktiv`: senaste aktivitetstidsstampel.

Varfor sa:
- Ger snabb klassrumsoverblick i realtid.

Pedagogiskt varde:
- Du ser direkt vilka elever som ar igang, vilka som fastnar, och vem som behover snabb intervention.

## 7. Gangertabell - sticky status per elev

Statuslogik per tabell (2-12):
- `Klar idag` (morkgron): uppfyllt idag.
- `Klar denna vecka` (ljusgron): uppfyllt nagon gang sedan mandag 00:00.
- `Star idag`: tre eller fler tabell-kompletteringar samma dag.
- `Ej klar`: inget av ovan.

Kompletteringsregel (sticky):
- minst 10 forsok pa tabellen,
- minst 80% ratt.

Kolumner:
- `2..12`: status per tabell.
- `Dagsklara`: antal tabeller klara idag.
- `Veckoklara`: antal tabeller klara denna vecka.
- `Star idag`: antal tabeller med star-status idag.

Varfor sa:
- Sticky-status undviker att status "fladdrar" av enstaka svar.

Pedagogiskt varde:
- Lamplig for uppfoljning av automatisering i tabeller over dag/vecka.

## 8. Elevvy (larare)

### 8.1 Sammanfattningskort

Kolumner:
- `Totalt losta`: livstidsmangd.
- `Traff totalt`: total andel ratt.
- `Idag`, `Vecka`: forsok i respektive tidsfonster.
- `Tid pa uppgift idag`, `Tid pa uppgift 7d`: engaged tid.
- `Niva nu/hogst`: adaptiv aktuell niva / historiskt hogsta.
- `Aktivitet`: aktivitetsfarg.

Pedagogiskt varde:
- Ger snabb helhetsbild av mangd, kvalitet, uthallighet och progression.

### 8.2 Gangertabell - status (individ)

Kolumner:
- `Tabell`, `Status`, `Forsok 7d`, `Traff 7d`, `Forsok totalt`.

Pedagogiskt varde:
- Kombinerar stickystatus med faktisk ovningsmangd och precision.

### 8.3 Framsteg (som elevvyn)

Nivarutor per raknesatt och period:
- `Historiskt`
- `Denna vecka`

Status per niva:
- `klarad`: minst 5 forsok och minst 80% ratt,
- `pagande`: minst 1 forsok men ej klarad,
- `ej startad`: 0 forsok.

Pedagogiskt varde:
- Stabilitetskrav (5 + 80%) minskar overtolkning av tillfalliga toppar.

### 8.4 Felandel per niva (historiskt)

Visar bara nivaer med minst 8 forsok.

Kolumner:
- `Raknesatt`
- `Niva`
- `Forsok`
- `Ratt`
- `Fel`
- `Felandel = Fel/Forsok`
- `Kunskapsfel`
- `Ouppmarksamhet`

Farglogik felandel:
- gron: < 25%
- amber: 25-39%
- rod: >= 40%

Varfor sa:
- Jamfor **inom** niva/raknesatt i stallet for att jamfora olika svara nivaer mot varandra.

Pedagogiskt varde:
- Hjalper dig hitta exakt var eleven har kunskapslucka kontra uppmarksamhetsproblem.

### 8.5 Svagast/starkast typer

- Baseras pa problemtyper med minst 3 forsok.
- Rankas efter success rate per typ.

Pedagogiskt varde:
- Underlag for riktad ovning pa delmoment (inte bara "raknesatt generellt").

## 9. Inaktivitet

Kolumner:
- `Inte aktiv idag`
- `2+ dagar utan aktivitet`
- `7+ dagar utan aktivitet`
- `Ej startat alls`

Varfor sa:
- Tidig upptackt av elever som tappar kontinuitet.

Pedagogiskt varde:
- Gor uppfoljning av narvaro och arbetsvanor konkret.

## 10. Klassniva

Kolumner:
- `Klass`, `Elever`, `Startat`, `Ej startat`, `Aktiva v`, `Natt veckomal`.

Definitioner:
- `Startat`: minst ett problem historiskt.
- `Aktiva v`: minst ett problem sedan veckostart.
- `Natt veckomal`: elever med `weekAttempts >= weekGoal`.

Pedagogiskt varde:
- Ger gruppniva-underlag for planering och likvardig uppfoljning.

## 11. Gangertabell - utveckling (7 dagar)

Kolumner:
- `Forsok 7d`: antal forsok senaste 7 dagarna.
- `Traff 7d`: ratt/forsok senaste 7 dagar.
- `Trend traff`: `accuracy7d - accuracyPrev7d`.
- `Median tid 7d`: median tid pa korrekta svar.
- `Trend tid`: `(medianPrev7d - median7d) / medianPrev7d`.

Varfor median:
- Median ar robust mot enstaka extremtider.

Pedagogiskt varde:
- Visar om tabellflyt utvecklas utan att straffa enstaka avbrott.

## 12. Behover stod nu

Urval till panelen:
- elev kommer med om `supportScore >= 45` eller `riskLevel = high`.

Risksignaler (urval av regler):
- aldrig aktiv,
- inaktiv 2+/7+ dagar,
- lag veckotraff,
- manga orimliga fel,
- lang svarstid,
- tuff dag idag,
- lag uppdragsfoljsamhet.

Nyckeltal:
- `Risk`: visuell riskniva (lag/medel/hog).
- `Stod`: sammanvagt supportscore 0-100.
- `R/F idag`, `Traff v`, `Kampar med`, `Flaggor`.

Pedagogiskt varde:
- Prioriterar lararens tid till de elever dar insats sannolikt gor storst skillnad.

## 13. Resultatvy (dagsvy/veckovy/alla elever)

### Dagsvy
- `Gjort idag`: antal forsok + fordelning per raknesatt.
- `Ratt/fel idag`: traff + kvot + rimliga fel + uppdragsfoljsamhet.
- `Tid pa uppgift idag`: engaged tid + antal interaktioner.
- `Kampar med idag`: typ med hogst feltryck idag.
- `Svarslangd idag`: medellangd pa elevsvar.

### Veckovy
- `Gjort denna vecka`: antal forsok + fordelning per raknesatt.
- `Aktiv tid (svar)`: summa svarstider (speed tid).
- `Tid pa uppgift`: engaged tid + interaktioner.
- `Ratt/fel vecka`: traff + kvot + rimliga fel + uppdragsfoljsamhet.
- `Kampar med vecka`: tydligaste feltyp denna vecka.
- `Svarslangd vecka`: medellangd pa elevsvar.

### Alla elever (total)
- `Forsok`: totalt i elevens historikfonster.
- `Ratt`: total traffsakerhet.
- `Rimlighet`: andel svar inom rimlig tolerans.
- `Medelavvikelse`: genomsnittlig relativ avvikelse pa kunskapsfel.
- `Trend`: skillnad mellan senaste 10 och foregaende 10 svar.

Pedagogiskt varde:
- Dagsvy = lektionsstyrning nu.
- Veckovy = uppfoljning av vanor och uthallighet.
- Alla elever = langsiktig utvecklingsbild.

## 14. Aktivitetsfarger (statuslogik)

- `Gron`: sidan i fokus + interaktion senaste 2 minuter.
- `Orange`: sidan i fokus, men ingen interaktion senaste 2-4 minuter.
- `Svart`: elev har varit inne idag men ar inte aktiv just nu.
- `Rod`: ingen aktivitet idag.

Teknisk detalj:
- Fokus-signal maste vara farsk (senaste narvaropuls inom 90 sekunder).

Pedagogiskt varde:
- Minskar falskt "aktiv" nar elevens sida star oppen men arbetet har stannat.

## 15. Snabbknappar for atgard (Fokus / Varm upp / Mix)

Niva valjs kring uppskattad fokusniva:
- `Fokus`: samma raknesatt, ungefarligt niva-1 till niva+1.
- `Varm upp`: samma raknesatt, lattare intervall.
- `Mix`: bredare intervall och alla raknesatt.

Pedagogiskt varde:
- Du kan omsatta diagnos i direkt, avgransad ovning utan extra administration.

## 16. Felkategorier och rimlighet

- `Kunskapsfel`: fel svar som inte klassas som ouppmarksamhet.
- `Ouppmarksamhetsfel`: i mixed-lage markeras vissa operationsmissar (t.ex. addition i stallet for subtraktion).
- `Rimligt svar`: svar inom toleransband beroende pa raknesatt, niva och decimalforekomst.

Pedagogiskt varde:
- Separera metodbrist fran uppmarksamhetsmissar innan pedagogiskt beslut tas.
