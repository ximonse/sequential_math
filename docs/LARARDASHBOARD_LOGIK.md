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

- Urvalet filtrerar alla datavyer som bygger pa `filteredStudents`/`filteredRows`.
- Om inget ar valt visas alla elever.
- Valet sparas lokalt i lararens webblasare.
- Undantag: vissa registerlistor ar globala (t.ex. uppdrag och ticket-fragmallar).

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

## 17. Uppdrag via lank

Huvuddelar i sektionen:
- skapade uppdrag med titel, raknesatt, niva-intervall och ID,
- aktivt uppdrag for alla,
- lankkopiering.

Hur det raknas/lagras:
- uppdrag skapas med fasta presets (addition, subtraktion, multiplikation, division, mix),
- aktivt uppdrag lagras centralt och anvands i elevflodet,
- uppdragsfoljsamhet i resultatvyer beraknas som andel elevproblem som matchar:
  - raknesatt i uppdraget,
  - niva mellan `minLevel` och `maxLevel`.

Pedagogiskt varde:
- snabbt satt att styra hela gruppens fokusomrade,
- gor det mojligt att skilja pa \"jobbar eleven i ratt material\" och \"lyckas eleven i materialet\".

## 18. Ticket

### 18.1 Fragmallar

Filter/sortering:
- sokning i `fraga + svar + taggar`,
- taggfilter med exakt match i tagglista,
- sortering: senaste, aldsta eller alfabetisk fraga.

Pedagogiskt varde:
- ateranvandbara start/exit-fragor med snabb atkomst.

### 18.2 Mottagare och publicering

Mottagarlogik:
- om inga explicita val ar satta skickas till aktuellt dashboard-urval (`filteredStudents`),
- annars anvands union av:
  - elever i valda klasser/grupper,
  - manuellt valda elever.

Vid `Visa pa startsida`:
- dispatchens targetlista uppdateras,
- elevens `ticketInbox` far aktiv dispatch/payload.

Vid `Ta bort fran startsida`:
- endast elever i aktuellt mottagarurval paverkas,
- endast om deras aktiva dispatch matchar vald dispatch.

Pedagogiskt varde:
- exakt kontroll pa vem som far vilken ticket utan att tappa tempo i lektionen.

### 18.3 Svar for valt utskick

Vilka rader visas:
- elever som finns i dispatchens targetlista,
- eller elever som har svar pa dispatchen.

Kolumner:
- `Elev`, `Klass`, `Status`, `Svar`, `Tid`.

Status:
- `Ej svarat`, `Ratt`, `Fel`.

Summering over tabellen:
- `Svarat`: antal med svar,
- `Ratt`: antal korrekta svar,
- `Fel`: antal felaktiga svar,
- `Total`: antal visade rader.

Pedagogiskt varde:
- direkt diagnostik av gruppforstaelse i start/exit-lagen.

### 18.4 Elevhistorik i tickets

Summeringskort:
- `Totalt svar`: antal ticket-svar for eleven,
- `Ratt`: antal korrekta,
- `Fel`: antal felaktiga,
- `Traffsakerhet = Ratt / Totalt`,
- `Senaste 7 dagar`: antal svar med `answeredAt` inom 7 dagar,
- `Unika utskick`: antal unika dispatch-ID med svar.

Historikrad:
- tid, tickettitel/typ/fraga, status, elevsvar, facit.

Filter:
- typ (`all/start/exit`),
- resultat (`all/correct/wrong`),
- fritext i titel/fraga/svar/facit/taggar.

Sortering:
- nyast svar overst (`answeredAt` fallande).

Pedagogiskt varde:
- gor det mojligt att folja individens begreppsutveckling over flera tickets.

## 19. Nollstall elevlosenord

Kolumner:
- `Namn`, `ID`, `Klass`, `Senaste inloggning`, `Atgard`.

Atgard:
- `Nollstall losenord` satter elevens losen till inloggnings-ID.

Pedagogiskt varde:
- minskar friktion i klassrummet nar inloggning stoppar arbetsflodet.
