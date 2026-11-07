# Väntetider över hela appen — aktiv granskning 2026-11-07

Målet är snabbare användbara övergångar för elev och lärare, med bevarade
original, serverkvittenser och aktuell åtkomst. Första ändringssjoket är
publicerat 2026-11-06; namnlistans första publicering följdes av en underkänd
produktionskontroll och en komplettering för övriga lärarroller. En snabb
intern funktion eller en godkänd robot avslutar inte hela uppdraget.

Aktuellt: namnkompletteringen är publicerad som `0600eb4` och verifierad
med faktisk skoladminroll, oförändrade 340 namn och uttryckligt urval om åtta
saknade elever. Kall katalog tar fortfarande omkring 22 sekunder. Nästa
katalogändring är lokalt verifierad och inväntar separat publiceringsmandat.

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
Den första förklaringen antog huvudadmin och likställde 681 auth-anrop med
680 profiler. Livekontrollen nedan underkände rollantagandet; antalet
auth-anrop är inte antalet lästa profiler. Koden läste profiler för
namnposterna och upprepade kontokontroller. Samtidigt tog ett `/api/students`
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

### Delad klasskontroll: korrekt åtkomst, fortfarande långsam

Kompletteringen `f71c22e` publicerades inom namnlistesuppdraget. Sekvens
`dpl_9HnE79rcbTEfAHyuLfq5S85Sr1yS` blev READY med samma SHA och rätt
domän. Testkontots verkliga roll registrerades som `school_admin`.
Auth-anropen sjönk till **25 per namnlista**, men svarstiderna var fortfarande
9921, 15244 och 23424 ms. Ingen tidsvinst påstås. Klassvalen tog 14164,
2641 och 2683 ms; kall katalog 20521 ms, varm katalog 1355 ms och skopade
resultat 1824–2175 ms. Elevens utgångna bootstrap tog 2251 ms. Serien
slutfördes utan API-fel och med oförändrade träningsoriginal.

[Serie efter delad klasskontroll](evaluations/transition-latency-2026-11-05/production-labels-shared-scope.json).
Den bevisar den minskade upprepningen av auth, inte löst användarväntan.

Nästa komplettering återanvänder `_audienceProfileBatch.js`, som redan
används för mottagarurval. Namnlistan begär endast färska medlemskapsfält
ur lagringen: elev-ID, kodnamn och klass-ID:n. Klassfiltrerat mottagarurval
behåller sitt tidigare standardbeteende. Det nya interna `metadataOnly`
används för namnlistan och bevaras även när ett stort kommando delas.
Inga original, svar, stats eller inloggningshemligheter ingår i den normala
projicerade lagringsresponsen. Samma efterföljande klass-/rollkontroll gäller.

Namnlistan läser högst 100 medlemskap per kommando. Befintligt återfall för
storleks-/tidsgräns, saknat kommando och individuell fullprofilläsning finns
kvar för komplett resultat vid lagringsproblem. Normalvägen hämtar inte
hundratals fulla profiler bara för att filtrera den privata namnlistan.

Lokalt passerar 233 testfiler/1259 tester, build, tio namn-/katalog-/mottagarrobotar,
riktad lint och arkitekturkontroll. Före publicering har ett privat hashkvitto
av det verkliga skoladminkontots filtrerade namnlista sparats utanför Git.
Efter publicering ska exakt innehåll/antal jämföras, utöver tid och antal
auth-anrop. En separat lokal Redis fanns inte tillgänglig; emuleringen och
enhetstesterna är därför inte ett påstående om live-Lua-verifiering.

### Medlemskapsprojektion: innehåll bevarat, omkörningar kvar

`68011b6` publicerades på sekvens `dpl_8ADwX8CxMKxGaVKQ1kMVRrnYD9LH`
med READY, rätt SHA och produktionsalias. Det privata hashkvittot matchade
exakt: 340 tillåtna namn före och efter för `school_admin`.

Namnlistan tog ändå 8092, 8273 och 17371 ms i den fullföljda serien.
Ingen tydlig tidsvinst påstås. Kall katalog tog 27128 ms och första klassval
19629 ms. En separat paritetsläsning pågick samtidigt med början av denna
serie; första kalltiderna är därför inte en ren jämförelse med tidigare
ensamma körning. Varma klassval låg på 2341 och 2612 ms. Träningsoriginalen
var oförändrade och inga API-fel uppstod.

[Serie med stora projektionsbatcher](evaluations/transition-latency-2026-11-05/production-labels-projected-large-batches.json).
Filtrerade Vercel-loggar för denna deployment visade **41**
`audience_profile_batch_fallback execution_limit`, samtliga grupperade till
`/api/teacher-pupil-labels`, och inga träffar för command_failed/size_limit.
Detta belägger att för stora skriptläsningar gav omkörningar även om den
överförda datan blivit mindre. Antal auth-anrop eller lyckad paritet räckte
inte för att förklara svarstiden.

Namnlistans startgräns ändras därför från 100 medlemskap i serie till högst
fyra initiala kommandon med tio medlemskap vardera. Varje våg omfattar högst
40 källnycklar. Den skyddade fallbacken kan dela dessa vidare; ingen namnpost
tas bort för att uppfylla tidsbudgeten. Övriga mottagarläsare behåller sitt
standardbeteende. Faserna `label-store`, `label-memberships` och
`label-class-scope` tidsmäts separat, utan identiteter eller namnvärden.

Ett kontrollerat lagringstest som avvisar mer än tio profiler per skript
gav först tre övertramp/omkörningar; efter ändringen noll, samma kompletta
namnlista och högst fyra samtidiga initiala kommandon. Slutkontroller:
233 testfiler/1260 tester, build, tio namn-/katalog-/mottagarrobotar samt lint
passerar. Nästa livekontroll ska jämföra samma namnkvittot igen, deltidernas
andelar och om tidsgränsvarningarna försvinner. Detta är fortfarande samma
godkända namnlistesuppdrag, inte en färdig lösning av hela appens väntetider.

### Budgeträttning publicerad; nästa glapp var automatisk POST

`2f76a98` blev READY på sekvens `dpl_BJH7dhvoKw7GhTN7439Sfxphbg4j`,
med rätt SHA och produktionsalias. Privat namnparitet matchade åter exakt
340 namn. Det separata kontrollanropet tog 4033 ms, varav medlemskapsläsning
2938 ms, klasskontroll 576 ms och lagrad namnlista 110 ms. Den efterföljande
ensamma flödesmätningen fullföljdes med 24 observationer, utan API-fel och med
oförändrade träningsoriginal. Varma övningsstarter låg på 295–335 ms och
verkligt utgången återanvändningsperiod gav 2224 ms. Klassvalen tog 11656,
2643 och 2870 ms. Filtrerade Vercel-loggar för deploymenten visade inga
matchande fallback-varningar i mätfönstret.

Namnlistans tre observerade anrop hade totaltider 3913, 4871 och 16730 ms.
De uppmätta läsfaserna i det sista anropet förklarade bara cirka fyra
sekunder. Katalogen tog 17358 ms kall och 1517 ms varm; skopade resultat
2129–2352 ms. Hela lärarväntan är fortsatt olöst.

[Budgeterad serie](evaluations/transition-latency-2026-11-05/production-labels-budgeted.json).
**Rättelse av tidigare mätbeskrivning:** webbläsaren navigerades utan
avsiktliga elevsvar/rapporter/utdelningar, men Dashboard kan själv skicka
POST `fill_from_creation_names`. De äldre serierna sparade inte HTTP-metod
och blandar därför GET och automatisk namnkomplettering under samma sökväg.
De ska inte redovisas som enbart läsande GET-anrop eller tilldelas en metod
i efterhand. Den privata namnpariteten är fortfarande korrekt.

2026-11-07 reproducerades glappet i kod och robot: automatiken skickade inget
elevurval. Servern läste hela `students:index` och profiler före kontrollen
av redan sparade namn och gränsen 500 namn. Därför kunde en komplettering
utan någon ändring läsa alla elevhistoriker på nytt vid nästa Dashboard-mount.

Kompletteringen skickar nu uttryckligen de saknade katalogeleverna. API:t
validerar urvalet, behandlar tom lista som inget arbete, filtrerar bort
redan namngivna elever före profilläsning och stannar före nästa batch när
namngränsen nåtts. När den lagrade namnlistan redan är full läses inga
skapandeprofiler eller globalt elevindex för kompletteringen. Resultatets
privata namnlista passerar fortsatt samma färska scope-kontroll. Äldre
uttryckliga anrop utan urval behåller sitt beteende; befintliga namn skrivs
inte över och namn visas fortfarande automatiskt som standard.

Robotens krav på enbart saknade katalog-ID:n blev först rött och därefter
grönt. API-proven för full namnlista och explicit urval blev också röda före
rättningen. Slutkontroller: 233 testfiler/1263 tester, build, elva namn-,
katalog- och mottagarrobotar, riktad lint och arkitekturkontroll passerar.
En första full parallellkörning gav timeout i kartverktygets UI-test;
det passerade separat och därefter hela sviten med två workers, utan ändrad
timeout eller andra lättade krav.

Nästa produktionsserie registrerar HTTP-metod, om automatisk komplettering
har explicit urval, antal i urvalet och antal faktiskt tillagda namn. Inga
elev-ID:n eller namn från POST-kroppen sparas i mätartefakten. Ett nytt privat
före-hashkvitto har tagits för dagens skoladminkonto utanför Git. Kall katalog
och skopade resultathämtningar förblir separata öppna väntvägar.

### 2026-11-07: avgränsad automatisk komplettering verifierad i produktion

`0600eb4` är publicerad via GitHub/master. Sekvens deployment
`dpl_2L88VvpK2CViSBXtdhfoLn9xXg18` blev READY med rätt full SHA och alias
`matematik.ximon.se`; den verkliga webbläsaren laddade `index-BL4NiGOX.js`.
Privat före/efter-hash matchar exakt 340 tillåtna namn, även efter hela
webbläsarkörningen. Rollen är `school_admin`.

Den metodmedvetna serien fullföljdes med 24 observationer, inga API-fel och
oförändrade masteryFacts/problemLog. De två vanliga namnläsningarna var
GET på 3932 och 3853 ms. De två automatiska POST-anropen tog 4450 och
4053 ms, båda med explicit urval om åtta elever och `added: 0`.
`label-fill-profiles` tog 495 respektive 132 ms: skapandeprofiler lästes
bara för de berörda eleverna. Dessa faktiska anrop gick inte genom grenen
för en redan full namnlista; den grenen är separat verifierad lokalt.
Inga matchande fallback-varningar hittades i deploymentens loggfönster.

[Metod- och urvalsmedveten produktionsserie](evaluations/transition-latency-2026-11-05/production-labels-scoped-20261107.json).
Värden från äldre omärkta GET/POST-serier får inte användas som en ren
före/efter-jämförelse för just POST. Det belagda resultatet är avgränsat
arbete, oförändrade namn och nu separat mätt tid för kompletteringen.

Första klassvalet tog fortfarande 16571 ms, nästa 2675 och 2607 ms.
Katalogens API-anrop tog 21958 ms kallt och 2271 ms varmt; skopade resultat
1894–2655 ms. Varma övningsstarter låg på 294–440 ms och verkligt utgången
återanvändningsperiod gav 2639 ms. Dessa kvarvarande väntetider är öppna.

### Katalogsjok — lokal verifiering före publicering

Kall katalog läser fem hela profiler per MGET-svar i en serie av små
kommandon. Den lokala ändringen behåller fem profiler per svar men tillåter
högst fyra svar samtidigt, alltså högst 20 profiler under pågående hämtning.
Övriga metadataläsningar behåller sin befintliga samtidighet. Ordning och
kopplingen mellan elev-ID och kodnamn måste vara exakt; ofullständiga svar
avvisas och samtliga befintliga versions-, scope- och tombstone-skydd behålls.
Cachetid, historik, matematikregler och API-innehåll ändras inte.

Kontrollerat prov: 40 elever, åtta läsningar med 100 ms fördröjning vardera.
Den tidigare seriella vägen kräver 800 ms; två vågor med fyra läsningar
klarar 200 ms. Provet kräver fortfarande åtta läsningar, rätt elev/kodnamn,
alla elever och frånvaro av privata fält. Det blev rött för seriell
hämtning före rättningen och grönt efter. Detta är mekanismbevis, ingen
uppmätt produktionsvinst.

Slutkontroller för katalogsjoket: 233 testfiler/1264 tester, build, elva
namn-, katalog- och mottagarrobotar samt riktad lint/arkitektur passerar.
Katalogsjoket är separat lokalt arbete och inväntar publiceringsmandat för
att kunna jämföras i produktion. Hela appens övergångsmatris är inte klar.

### 2026-11-07: katalog publicerad och fler väntvägar mätta

Simon godkände publicering med ”Kör”. `a49c0d1` pushades utan konflikt till
GitHub/master. Sekvens `dpl_4gXjuGbau8cr3dsDdam7teFXG1HM` blev READY med
exakt SHA och produktionsalias `matematik.ximon.se`. Klientbygget är fortsatt
`index-BL4NiGOX.js`, eftersom ändringen endast rör API-kod. Vercels
GitHub-status är success. Det parallella talpar-arbetet berördes inte.

[Samma produktionsserie efter katalogändringen](evaluations/transition-latency-2026-11-05/production-catalog-20261107.json)
fullföljdes med 24 observationer, inga API-fel och oförändrade masteryFacts/
problemLog. Privat hashjämförelse bekräftar exakt samma 340 tillåtna namn.
Kall katalog tog 10803 ms mot 21958 ms i föregående ensamma serie; varm
katalog 1847 ms mot 2271 ms. Första klassvalet tog 4640 ms mot 16571 ms;
varma klassval 2766/2454 ms. Detta är två enskilda jämförbara körningar,
ingen statistiskt bestämd generell latensgaranti. Katalogstarten är fortfarande
för långsam. Skopade resultat tog 1986–2333 ms, namnläsning 4064/4157 ms
och automatisk komplettering 4746/4684 ms. Kompletteringarna hade explicit
urval om åtta och added=0. Varma övningsstarter tog 290–364 ms och verkligt
utgången bootstrap 2854 ms. Ingen helhetslösning påstås.

[Utökad separat produktionsserie](evaluations/transition-latency-2026-11-05/production-expanded-20261107.json)
ger 32 observationer och ytterligare material-/tabellvägar. Tabell 7 öppnades
på 46/47/47 ms med rätt tables=7; återgång till användbar startsida tog
547/481/796 ms. Materialets utkastlista tog 13547 ms, med 13303 ms på
teacher-material och 79 auth-kontroller. Ett befintligt material öppnades på
2518 ms; material-API:t tog 2004 ms. Ingen version ändrades, godkändes eller
delades ut. Träningsunderlaget var oförändrat och inga API-fel uppstod.
De fyra räknesättens knappar hittades inte av denna mätprob; dessa byten är
inte verifierade av serien. Inlämnad screening saknas fortfarande i profilen.

Materiallistans kod läser och behörighetskontrollerar varje utkast seriellt.
En separat lokal ändring överlappar högst fyra utkast, bevarar indexordningen,
kontrollerar alla historiska mottagare och källor samt gör samma avslutande
färska sessionskontroll. Nekad åtkomst döljer fortsatt hela utkastet; lagringsfel
avbryter hela svaret. Ett kontrollerat prov med åtta utkast och 75–100 ms per
läsning blev rött för tidigare samtidighet=1 och grönt med högst fyra och
högst 200 ms. Alla 16 historiska elevkontroller och privata metadatafilter
verifieras. Detta är en lokal mekanismvinst; produktionsvinst återstår att mäta
efter separat publiceringsmandat.

Materialsjokets slutkontroller: 233 testfiler/1265 tester, produktionsbuild,
riktad lint och arkitekturkontroll passerar. Materialbibliotekets robot
passerar mot produktionsbygget. Tre gransknings-/publiceringsgränsrobotar
kräver ROBOT_DEV=1 för localhost-cookiepolicyn och passerar där; de tre
överhoppade proven i den första produktionsrobotkörningen räknas inte som
godkända. Byggets befintliga varningar om Browserslist, chunkstorlek och
blandad dynamisk/statisk import kvarstår. Materialkoden är lokal och opushad.

### 2026-11-07: materiallistan publicerad

Simon gav publiceringsmandat med ”Push”. `c48613b` pushades utan konflikt
till GitHub/master. Sekvens `dpl_9bKw1vJcbobEWKcXttMDwVtE89N6` blev READY
med exakt SHA `c48613bd2f8f4ac5d11e84b0171245d82aee7d6d`, rätt
produktionsalias och Vercel-status success på GitHub. Det tidigare lokala
materialsjoket är därmed publicerat; klientkoden ändrades inte.

[Samma utökade produktionsserie efter publicering](evaluations/transition-latency-2026-11-05/production-material-after-20261107.json)
fullföljdes med 32 observationer, inga API-fel, oförändrade masteryFacts/
problemLog och fortsatt exakt privat hashparitet för 340 namn. Utkastlistan
tog 6755 ms mot 13547 ms före ändringen. Material-API:t tog 6172 ms mot
13303 ms och gjorde fortfarande 79 auth-kontroller. Ett befintligt material
öppnades på 3316 ms (API 2093 ms). Listan är förbättrad i de två körningarna
men fortfarande långsam; en generell latensgaranti eller helhetsvinst följer
inte av provet.

Serien fångade också en utgången elevbootstrap på 8357 ms mot 2457 ms i
föregående serie. me/events tog 6614 ms i webbläsaren men rapporterade
710 ms i serverns handler; följande profil tog 961 ms med 416 ms handler.
Inget extra student-session-GET gjordes. Skillnaden mellan total väntan och
uppmätt handlerarbete måste spåras vidare; kö, transport eller serverstart
är ännu inte åtskilda. Ingen orsak tillskrivs materialändringen utan belägg.

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
