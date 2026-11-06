# Väntetider över hela appen — aktiv granskning 2026-11-06

Målet är snabbare användbara övergångar för elev och lärare, med bevarade
original, serverkvittenser och aktuell åtkomst. Första ändringssjoket är
publicerat 2026-11-06; namnlistans första publicering följdes av en underkänd
produktionskontroll och en komplettering för övriga lärarroller. En snabb
intern funktion eller en godkänd robot avslutar inte hela uppdraget.

## Belagd startpunkt

Produktionsmätning 2026-11-05, en syntetisk elev i Chrome på dator:

| Övergång | Observationer, ms | Tolkning |
|---|---|---|
| Hem → övning | 4030, 4025, 311, 4005, 327, 4246 | Blandade återvaliderade och varma starter |
| Övning → hem | 324, 328, 327, 380, 697 | Fem återgångar |

Mätningen börjar vid klickhändelsen och slutar vid användbar DOM, utan
verktygstransporttid. Den sega vägen innehöll sessionshämtning (782–912 ms),
eventkö (1638–1900 ms), profil (906–1177 ms) och klasskonfiguration
(296–365 ms). Den tidigare pilotens materialanrop tog 50 484 ms; det är en
separat observation, inte samma övergång eller samma mätserie.

Råa, avidentifierade mätvärden: [produktion före](evaluations/transition-latency-2026-11-05/pupil-production-before.json).
Detta är elva observationer, ingen p95 eller klassrums-/iPad-verifiering.
Ett felaktigt första beredskapskriterium för tom svarsruta förkastades.

## Lokala ändringar och bevis

| Orsak | Ändring | Kontrollerat före → efter |
|---|---|---|
| Samma elevsession hämtade profilen dubbelt vid förnyad start | Redan identitetsbunden CSRF återanvänds som transportinformation; färsk profil och väntande event valideras fortfarande av servern | Robot kräver profilhämtning och utebliven extra sessionshämtning efter utgången 60-sekundersperiod |
| Oberoende sessions-/klass-/raderingsläsningar låg i serie | Parallella läsningar inom samma begäran | 600 → 300 ms med 100 ms per läsning; ändrad credentialVersion och stängd klass avvisas nästa begäran |
| Screeninghistorik lästes försök för försök | Högst åtta samtidiga försök, bevarad ordning och alla original-/revisionskontroller | 20 försök: 8000 → 1200 ms, exakt 80 kontrollerade läsningar |
| Kall katalog skrev metadata elev för elev | Högst åtta samtidiga tombstone-skyddade skrivningar | 24 elever: 2400 → 300 ms med 100 ms per skrivning; privata fält saknas |
| Lärarens underlagskontroll läste profil, klass och två raderingsmarkörer i serie | Oberoende läsningar parallellt, därefter färsk klassbehörighet; samma kontroll upprepas efter långsam historikläsning | 400 → 100 ms med 100 ms per läsning; roll- och medlemsbyten under läsning avvisas fortfarande |

De kontrollerade tiderna ovan använder virtuella fördröjningar och är
inte uppmätt produktionsvinst. Ingen historik har trimmats och ingen auth-TTL
har förlängts. Kall katalog läser fortfarande hela profiler i små batcher.

API-svaren kan nu ge `Server-Timing` för total tid, elev-/lärarauth och
screeninghistorik. Tillståndet är bundet till begäran och innehåller bara
statiska fasnamn, antal och tider. Överlappande faser får inte summeras som
oberoende tid. Instrumenteringen förklarar inte all KV-, CPU- eller nätverkstid.

## Reproducerbar lokal arbetsgång

`robots/transition-latency.robot.js` kör ett produktionsbygge med riktiga
API-hanterare och syntetiska konton. Den mäter login, upprepade hem/övning,
svar/nästa, tabellval, förnyad bootstrap, screening öppna/nästa/förra/inlämning,
klassbyte, lärararbetslägen, elevdetalj och hämtat analys-/screeningunderlag.
Elevens siffra måste finnas kvar efter frågebyte och screening måste lämna
vanlig mastery och problemLog oförändrade.

```powershell
$env:ROBOT_PORT='5296'
$env:ROBOT_BUILD_NAME='.build-latency'
$env:ROBOT_WORKERS='1'
$env:ROBOT_MEASURE_TRANSITIONS='1'
$env:ROBOT_KV_READ_DELAY_MS='50'
npm run robots -- transition-latency.robot.js --workers=1
```

Mätroboten körs separat för att inte blanda in last från andra tester.
Fördröjningen gäller minneslagrets get/mget/exists/smembers/lrange, inte
Lua/skrivningar eller HTTP. Den simulerar därför bara en del av molnkostnaden.
Robotens tider omfattar Playwright-åtgärd och verifierad beredskap, inklusive
automatisk väntan/pollning. Login inkluderar navigering och formulärinmatning.
De ska jämföras med samma robot, inte direkt med produktionens passiva klickprob.

### Samma robot före och efter, 2026-11-06

Före är en separat temporär kopia av `6fdbe83`, med endast mätroboten och
lagringsfördröjningen tillagda. Efter är aktuella lokala ändringar. Samma
syntetiska arbetsgång kördes med en worker och 50 ms per läsoperation.
En körning vardera; upprepningarna nedan sker inom respektive körning.

| Övergång | Antal per körning | Före, medel ms | Efter sluträttning, medel ms |
|---|---:|---:|---:|
| Varm hem → övning | 10 | 150 | 146 |
| Varm övning → hem | 10 | 161 | 151 |
| Förnyad hem → övning | 1 | 2954 | 1926 |
| Screening öppna | 1 | 4780 | 2752 |
| Screening nästa inklusive sparande | 10 | 2033 | 1013 |
| Screening förra | 10 | 1927 | 907 |
| Screening inlämning | 1 | 3920 | 2928 |
| Lärarens klassbyte till färdiga resultat | 10 | 925 | 936 |
| Lärarens elevdetalj | 2 | 1968 | 1980 |
| Öppna analyshistorik | 2 | 1938 | 947 |
| Läs screeningunderlag | 2 | 2985 | 1462 |

Oförändrade klass-/elevbyten är kvarvarande problem, inte en uppmätt vinst.
Nästa screening hade ett max på 1917 ms även efter rättningen. Lärarens
underlag omfattar en elev med tre försök och en utan försök; medlet får inte
tolkas som en större elevhistorik. Små skillnader i redan snabba flöden är
inte belägg för förbättring. Playwrights beredskapspollning ger grova steg i
tiderna; API-faserna i råfilerna kompletterar dessa övre observationer.

Artefakter: [före](evaluations/transition-latency-2026-11-05/local-before.json),
[första efter](evaluations/transition-latency-2026-11-05/local-after.json),
[slutlig efter](evaluations/transition-latency-2026-11-05/local-after-final.json).
Den första efterseriens oförändrade lärartider ledde till nästa rättning;
slutserien upprepade hela arbetsgången efter denna.

JSON-artefakten innehåller alla observationer, budgetöverdrag och API-status/
statiska `Server-Timing`-värden. Ingen svarskropp, PIN, cookie eller token sparas.
Vanliga varma övningsbyten har en lokal kontrollgräns på 1000 ms. Övriga
övergångar redovisas även när de ännu saknar fastställd budget.

Slutkontroller 2026-11-06: 233 testfiler/1254 tester, produktionsbuild,
19 riktade regressionsrobotar och den separata mätroboten passerar.
Lint för berörda JavaScript-filer, arkitekturkontroll och projektkartans
struktur passerar. Dessa kontroller föregick publiceringen nedan.

## Produktion 2026-11-06 och nästa belagda orsak

Simon godkände publicering och fortsatt produktionsmätning. GitHub/master
uppdaterades utan force från `3a77fce` till `c4a0b65` (runtimeändringen
`592fb69` och dokumenterat godkännande). Vercel-projekt `sekvens`, deployment
`dpl_B6T9z3yFhumPaKEfSJem5u7hxjPt`, blev READY med samma fulla commit-SHA
och alias `matematik.ximon.se`. Den faktiska webbläsaren laddade
`index-v5jkbivQ.js`. Den parallella talpar-arbetsytan ändrades inte.

Två separata sessioner med befintliga lokala inloggningar användes. Enbart
den tidigare syntetiska testprofilens träningsoriginal lästes; inga nya
elevsvar, rapporter, utdelningar eller inlämningar skapades. Normal navigering
kan ge vanliga sessions-/checkpoint-händelser. Slutlig hashjämförelse av
masteryFacts och problemLog visade oförändrat innehåll.

Den fullföljda avgränsade serien gav 24 observationer och inga API-fel:

| Övergång | Produktion efter första sjoket |
|---|---|
| Första hem → övning efter login | 321 ms |
| Fem varma hem → övning | 295–331 ms |
| Sex återgångar övning → hem | 297–547 ms |
| Övningsstart efter verkligt utgången 60-sekundersperiod | 2673 ms |
| Tre klassval till användbara resultat | 12967, 2655, 2724 ms |
| Lärarens tre arbetslägesbyten | 14–39 ms |
| Elevdetalj via full sidnavigering, separat övre observation | 5595 ms |
| Öppna analyshistorik | 1427 ms |

Vid utgången återanvändningsperiod lästes färsk profil utan extra GET av
student-session. Detta verifierar vägen i produktion, men är en enda
observation. Första seriens varma starter låg 295–466 ms och dess klassval
12534, 2614, 3876 ms. Den serien avbröts vid ett felaktigt mätkriterium för
Screening: skapa, vilket rättades inför den fullföljda körningen. Den ska
inte redovisas som en komplett godkänd matris.

[Avidentifierad fullföljd serie](evaluations/transition-latency-2026-11-05/pupil-teacher-production-after.json).
Lokal robot och produktion har olika fördröjning och beredskapsmätning och
får inte jämföras som samma miljö. Produktionsserien är ingen p95, iPad- eller
klasslastmätning. Profilen hade ingen tillgänglig inlämnad screeningsamling
för läsande frågenavigering; screeningens spar-/inlämningsväg och material
är därför fortsatt oprövade i denna produktionsserie.

**Nytt belagt problem:** `/api/teacher-pupil-labels` gjorde 681 lärarauth-anrop
per begäran. Den fullföljda körningen visade totalt 9,16–18,43 sekunder för
sådana anrop; den första serien hade också 25,72 sekunder. Auth-faserna
överlappade och deras summerade tidsvärde får inte tolkas som väggtid.
Koden läste dessutom 680 hela profiler trots att huvudadminens befintliga
åtkomstregel redan godkände varje profil. Samtidigt tog ett `/api/students`
17,84 sekunder med 26 auth-anrop. Därför är varken hela lärarväntan eller
hela appens väntetider lösta av första publiceringen.

Nästa lokala rättning behåller namnen i lärarens eget privata namnobjekt,
läser färsk kontoidentitet och roll efter objektläsningen och returnerar
huvudadminens namn utan onödiga elevprofiler. Återkallad/ändrad identitet ger
inga namn, nedgraderad roll går genom de befintliga elevscope-kontrollerna.
Ingen cache mellan begäranden införs. Det kontrollerade 680-namnstestet
kräver en namnläsning och två auth-anrop totalt i stället för ett per namn.

Den första namnlistesrättningen verifierades lokalt med 233 testfiler/1257 tester,
produktionsbuild, nio namn-/katalogrobotar och riktad lint. Den godkändes
därefter för publicering. Kostnaden i `/api/students` är fortsatt öppen.

### Namnlistans första publicering: livekontrollen underkänd

`f2d0be6` publicerades med godkännandet `b34108e` via GitHub. Sekvens
deployment `dpl_33T3XCzxJR3oExcA2rYhoPVSfZDf` blev READY med rätt commit
och produktionsalias. Samma läsande arbetsgång gav 24 observationer utan
API-fel och oförändrad träningsevidens, men den avslutande invarianten
underkändes: namnlistan gjorde **682 auth-anrop**, inte två. Testkontot gick
inte genom huvudadminens snabbväg. Detta visar varför en lyckad deploy och
en lokal huvudadmin-fixture inte bevisar att Simons väntan är löst.

Namnlistans tre svar tog 8381, 8303 och 17945 ms. Klassvalen tog 14841,
2682 och 2650 ms. Instrumenteringen skiljer nu säkra resursnamn från
query-parametrarnas identiteter: `students?resource=catalog` tog 20678 ms
vid första laddningen och 1355 ms vid nästa. Skopade resultatläsningar låg
1831–2241 ms. Kall katalog är därmed en separat belagd väntväg.

[Underkänd serie med bevarade observationer](evaluations/transition-latency-2026-11-05/production-labels-first-attempt.json).
Den får inte redovisas som en godkänd kontroll av namnlistesfixen.

Kompletteringen inom samma godkända namnlistesarbete kontrollerar varje
faktisk profilklass en gång med befintlig `canAccessClass`, högst åtta
klasser samtidigt. Äldre profilklasser kräver ingen komplett katalogindexpost.
Efter profilläsning och klasskontroll återläses kontot; ändrad session, roll,
klass-/skolscope eller identitet stoppar resultatet. Profilernas faktiska
medlemskap filtrerar namnen, och huvudadminens tidigare snabbväg behålls.
Allt tillstånd gäller enbart den aktuella begäran.

Profilläsningarna använder MGET med högst fem profiler per kommando och
högst fyra kommandon samtidigt. Ett misslyckat eller ofullständigt batchsvar
faller tillbaka till originalets enskilda läsningar; inga namn tappas för
att ett större lagringssvar inte stöds. Ett 40-profilsprov kräver åtta
MGET-kommandon, ingen individuell profilläsning i normalfallet, exakt samma
ordning/scope och komplett återfall vid storleksfel. Ändrat skolscope under
läsningen avvisas uttryckligen.

## Fortsatt öppet

- Samma kompletta produktionsmatris före/efter publicering, inklusive material.
- Fler övningstyper, större klasser/profiler och längre screeninghistorik i webbläsare.
- Kall katalog, stora valda resultatprofiler och upprepade lärarauth-läsningar.
- Verkligt nätverk, databasens skriv-/Lua-tid, iPad och samtidiga elever.
- Förstagångsladdning och renderingskostnad: nuvarande huvudentré är cirka
  1,8 MB minifierad JavaScript (538 kB gzip). Storleken är belagd; dess andel
  av de rapporterade väntetiderna är ännu inte uppmätt.

Publicering går via GitHub/master → Vercel `sekvens`. Båda publiceringarna
har mandat; namnlistans komplettering följer samma godkända uppdrag.
Appen får inte beskrivas som snabb eller färdigoptimerad innan kvarvarande
vägar har uppmätta resultat och oförklarade väntetider har följts upp.
