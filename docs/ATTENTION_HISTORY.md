# Historik för fokusaktiviteter

Simon godkände sparad lärarhistorik för FOKUS, KONTROLL och MULTI 2026-10-14,
efter den första produktionsversionen med tillfälliga resultat.

## Resultatåtkomst 2026-10-18

Endast huvudadmin (`super_admin`) får läsa sparade fokusresultat i personalens
vyer. Det gäller både Fokusövningar och fokuspanelen i elevprofilen, även när
huvudadmin arbetar i vanlig lärarvy. Vanliga lärare och skoladmin får inte
`attentionHistory` via lärarprofilens GET eller äldre profil-GET/POST-svar.
Servern kontrollerar aktuellt autentiserat konto; att ändra vy ger ingen rätt.
Elevens egen återkoppling och befintliga spar-/synkflöde ändras inte.

**Projektminne för framtiden:** Simon kan senare vilja ge särskilt utvalda
lärare uttrycklig läsrätt. Det är dokumenterat men inte aktiverat; varken
lärarroll, skoladminroll eller klasstillhörighet räcker idag. Vid framtida
utökning behövs serverkontrollerad tilldelning/återkallelse och elevavgränsning.

Se [förslaget om pedagogiska uppföljningssignaler](ATTENTION_MEASUREMENT_PROPOSAL.md).
Mätförslaget är inte implementerat. Äldre text om läraråtkomst längre ned är
historik och ersätts i denna punkt av begränsningen ovan. Ändringen är lokal,
inte publicerad.

Lokalt verifierat 2026-10-18: 154 testfiler/746 tester, build, riktad ESLint,
arkitektur och projektkarta passerar. Hela robotsviten 115/115 godkänd med
0 regelbrott. Nya åtkomstroboten var röd före rättningen och verifierar nu
nekad visning för vanlig lärare via meny, elevprofil och direktlänk, båda
profil-API:ernas filtrering av fokusfältet samt huvudadmins åtkomst i vanlig lärarvy.
API-test täcker också skoladmin och äldre profil-POST-svar. Elevens sparade
historik bevaras. Ett inledande historiksparfel kunde inte reproduceras i
isolerad omkörning 5/5 eller i den gröna fullsviten; orsaken är inte fastställd.
Positiva färg-/historikrobotar använder nu huvudadmin med isolerade syntetiska
jämförelsegrupper; säkerhetsroboten använder ofiltrerade profil-API:er.
Bygget har befintliga Browserslist/import-/bundlestorleksvarningar.
Ingen push eller publicering har gjorts.

## Utveckling under passet och FOKUS-svarstid 2026-10-16

Aktuell lokal vidareutveckling ersätter tidigare FOKUS-färg baserad på träffandel.
Den är ännu inte publicerad. Tidigare verifierings-/produktionsbelägg längre ned
avser de uttryckligen daterade äldre revisionerna.

- **FOKUS:** grönt inväntar svar i högst fem sekunder. Utan svar avslutas försöket
  som **Ej fullföljt**, utan miss för signalen, och eleven får **Ska vi starta om?**.
  Ja börjar två nya minuter utan ny introduktion, efter säker lokal skrivning.
  Det gamla försöket behåller sitt ID och det nya får ett eget. KONTROLL behåller
  tvåsekundersfönstret; MULTI behåller fyra sekunder och sin felpåminnelse.
- **Alla tre övningar:** nya version-2-resultat innehåller `completionReason`
  (`completed`, `ended`, eller enbart FOKUS `no_response`) och `trials`.
  Varje färdig signal sparar `at` (aktiv tid vid signalstart), `kind`, `outcome`
  och `responseMs` (null vid uteblivet svar/korrekt avstående). Inga skärmkoordinater,
  figurer, praktiksignaler eller råa upprepade tryck sparas. Dold tid räknas bort;
  ofärdiga signaler vid paus, manuellt avslut och 120 s kasseras.
  No-response-tidpunkten i FOKUS fås av aktiv sluttid minus fem sekunder.
- **Individ → Utveckling under passet:** välj ett sparat pass, även ej fullföljda.
  Diagrammet visar svar för svar från 0 till 120 aktiva sekunder: rätt, fel,
  uteblivet svar och korrekt avstående. MULTI skiljer bytt/upprepad regel.
  En tangentbordsåtkomlig tabell visar samma signaler. Äldre pass säger uttryckligen
  att tidpunkter saknas; de rekonstrueras aldrig från en passmedian.
- **Beskrivande uthållighet:** första 30 s jämförs med senare 30-sekundersdelar
  inom samma signaltyp (bara rätta svar). Minst tre startsvar och minst två svar
  i vardera av två följande delar behövs. Båda delarnas median måste vara minst
  50 % och 300 ms längre än starten för texten ”Längre svar från cirka …”.
  För få jämförbara svar anges uttryckligen. Minst två följande missade
  svarssignaler ger en separat tidpunkt; avstå-signaler räknas aldrig som miss.
  FOKUS femsekundersavbrott visas separat. Tiderna är beskrivande provningsregler,
  inte en uppskattning av när eleven gav upp eller en diagnos om intresse/fokus.
- **FOKUS-färg:** endast fullföljda nya femsekunderspass. Senaste fullföljda pass
  med minst fyra träffar per Stockholm-dag är dagens representant. Tre sådana
  dagar och totalt 20 träffar behövs för grönt; medianen av dessa passmedianer
  minst 1 s ger gult. Detta är inte en gemensam median av alla reaktioner.
  Blått kräver minst fem dagar/40 träffar och under 600 ms varje dag.
  Senaste ofullföljda försök visas vitt som Ej fullföljt/Avbrutet och sänker
  inte prestationen. Äldre version-1-FOKUS finns kvar bara i historiken.
- **Lokal FOKUS-jämförelse:** samma lärarunderlag och minst åtta andra elever.
  Varje elev bidrar med medianen av senaste upp till fem representativa dagars
  passmedianer (minst tre dagar/20 svar). Orange kräver minst 1 s, minst 500 ms
  och 1,5 standardavvikelser över andras genomsnitt; elevens median och minst
  80 % av dagarna ska passera gränsen. Rött kräver minst 1,5 s, minst 750 ms och
  två standardavvikelser över genomsnittet alla fem dagarna, med minst 40 svar.
  Detta är generösa lokala designgränser, ingen åldersnorm eller signifikanstest.
  KONTROLL/MULTI behåller nedanstående träffregler. En elevs tidigare fullföljda
  pass kan bidra till referensen även om senaste försöket inte fullföljdes.

Version 1 bevaras oförändrad. Version 2 validerar exakt schema, tidsordning,
svarsfönster, antal och medianer mot signallistan på både klient och server.
Samma krypterade kö, autentiserade API, idempotenta merge och 500-passgräns används.
Ingen ny API-route eller matematikdata införs. Lagringsformatet utökas uttryckligen
för tidsförloppet; inga äldre resultat skrivs om.

Lokal slutverifiering 2026-10-16: 154 testfiler/745 tester, build, riktad
ESLint, arkitektur och projektkarta passerar. Full robotsvit: 112/113;
en screeninggenomgång fastnade vid en inaktiverad sparknapp. Separat körning
med en worker av screeninggenomgången och fokusmodul/elevflöden: 18/18 godkända,
inklusive ny kontroll av orange/rött för giltiga FOKUS-svar och signaldiagram
för alla tre lägen. Efter sista täthets-/avrundningsjusteringen: 2/2 riktade
bild-/touchrobotar godkända, 0 regelbrott. Samtliga 114 aktuella kontroller har
därmed passerat över dessa körningar; ingen helt grön fullsvit i en enda körning
påstås. Dator-/768-px surfplattebilder granskade, inklusive ökande svarstider
efter 60 s, ej fullföljt försök, tät matris och kompakt signaltabell. Tangentbord,
touch, dold flik, säker omstart, krypterad kö, lärarbehörighet och oförändrad
matematikdata täcks. Inte verifierat på fysisk elevplatta och inte publicerat.
Build har befintliga Browserslist/import-/bundlestorleksvarningar.

## Elev och lärare

Före aktivitetens start får eleven veta att passets resultat sparas till
läraren. Introduktioner sparas inte. Efter ett riktigt pass sparas en
sammanfattning automatiskt, även när eleven avbryter eller ingen signal
hinner färdigställas. Dolda flikar påverkar inte den aktiva tiden och
ofärdiga signaler ingår inte.

Resultatsidan skiljer mellan sparat till servern, sparat på enheten i väntan
på synkning och misslyckat sparande. Återförsök använder samma pass-ID.
Den lokala skrivningen färdigställs innan Tillbaka aktiveras; eleven kan
sedan lämna resultatsidan medan nätanropet slutförs. Nätfel kan
synkas genom återförsök eller nästa inloggning/omladdning med anslutning.
Vid lokal lagringsbrist visas fel och eleven kan försöka igen.
Ett pass som lämnas genom omladdning eller stängning innan resultatsidan
visas har ännu ingen sparad sammanfattning.

Lärarens **Elevprofil → Fokusaktiviteter** visar en översikt över färdiga
tvåminuterspass och en separat passhistorik. Aktivitetsfilter och tidsperiod
(all sparad historik, senaste 7 eller 30 dygnen) gäller båda. Visa fler ändrar
bara hur många historikrader som syns; översikten använder hela urvalet.
Avbrutna pass kan döljas i historiken och ingår aldrig i översiktens mått.
Varje pass visar datum/tid i Stockholm, aktiv tid och klart/avbrutet.

### Jämförbara mått

- KONTROLL: upptäckta gröna signaler = träffar / (träffar + missade).
  Övningen visar också rätt avstådda stopp / (rätt avstådda + feltryck på
  stoppsignaler). Stoppsignaler är röda cirklar och gröna fyrkanter.
- För tidiga tryck redovisas per aktiv minut med totalt antal synligt.
  Aktiv tid används, inte väggtid inklusive dold flik. Vid noll aktiv tid
  visas – i stället för en påhittad frekvens.
- MULTI: rätta svar / alla färdiga uppgifter, inklusive fel och missade.
  Upprepad och bytt regel har egna andelar och synliga nämnare. Första
  uppgiften ingår bara i passets total, eftersom den saknar föregående regel.
- Översiktens andelar använder summerade täljare och nämnare från färdiga
  pass, inte medelvärdet av passens procenttal. Aktiviteter blandas inte.
- Svarstider är medianer för rätta svar inom samma pass med antal rätta
  svar synligt. Ingen gemensam median räknas ur sparade passmedianer.
  MULTI visar skillnaden mellan bytt och upprepad regels median i samma
  pass när båda finns. Plus betyder längre svarstid vid byte.

Alla andelar visar procent och antal, till exempel 75 % (3 av 4).
Saknat underlag visas som – med förklaring; observerade noll rätt visas som
0 %. Avbrutna pass märks att de inte ingår i översikten. Måttförklaringar
finns under Så läser du måtten. Ingen norm, klassrankning, diagnos,
matematikjämförelse eller sammanvägt fokusbetyg införs. Slumpade signaler
och ändrat aktivitetsupplägg begränsar jämförbarheten; inga råa historiska
svar återskapas eller äldre protokollversioner gissas fram.

Statistikförtydligandet är lokalt verifierat 2026-10-15: 149 testfiler/719
tester, build och hela robotsviten 106/106 passerar utan regelbrott. Riktad
lint, arkitektur och projektkarta passerar. Robotverifiering täcker korrekta
nämnare, viktning, ofullständiga pass, tomt underlag, tidsskillnad, period- och
aktivitetsfilter samt oberoende av pagination. Lärarbilder på dator/surfplatta
har granskats. Befintlig historik, matematikdata och lagringskontrakt ändras
inte. Statistikförtydligandet publicerades 2026-10-15 genom GitHub som
`a9904569229b03ab31d5804aaca11342c5dd8cf9`; GitHub Verify 38806010490 godkänd,
Vercel `sekvens` READY med samma revision på `matematik.ximon.se`.

## Fristående fokusmodul i lärarvyn

Arbetsläget **Fokusövningar** har en egen adress `/teacher/focus`. Samma
klass-/gruppurval och lärarbehörigheter gäller som i övriga lärarvyn.
Modulen ligger i `src/components/teacher/attention/` och behöver inte en
vald elevprofil för att visa gruppen. Den tidigare historiken i elevprofilen
finns kvar. Matematikstatistik och elevövningarnas upplägg ändras inte.

- **Matris:** en rad per elev, med separata färgfält för Upptäcka i FOKUS,
  Upptäcka i KONTROLL, Hejda i KONTROLL och Växla i MULTI. Inga procenttal
  visas i grundvyn. Text och symbol kompletterar färgen. Underlag nås via
  hovring eller val av elev och Färg och underlag. Även elever utan pass
  syns. Hämtningsfel visas uttryckligen, inte som tom historik.
  Fälten har liggande innehåll och 128 px bredd. Höjden följer texten, utan
  fast minhöjd, med 1 px padding ovanför/under innehållet och 1 px vertikal
  cellpadding. Tätare celler och mindre kringmarginaler håller översikten
  kompakt utan att minska textstorleken. Detta ersätter tidigare 44-px-minhöjd.
- **Punktdiagram:** FOKUS visar senaste fullföljda femsekunderspassets medianreaktionstid mot tidiga tryck per aktiv minut i samma pass; KONTROLL visar upptäckta signaler mot rätt avstådda stopp; MULTI
  visar rätt vid upprepad mot bytt regel. Diagrammet använder summerade
  svar; matrisens färger använder dagsmönster enligt reglerna nedan.
  Inga elever med saknat axelunderlag ritas som noll. Identiska
  positioner samlas med antal, och varje individ är valbar via namnknappar
  med båda axelvärdena. Procentaxlarna är alltid 0–100.
- **Individens tidslinje:** välj elev från matris, diagrammets namnlista
  eller elevlista. Varje punkt är ett färdigt pass, med proportionell tid på
  x-axeln. Växla mellan andelar och medianreaktionstid per pass. MULTI håller
  upprepad/bytt regel åtskilda. Avbrutna pass finns i passdetaljerna. Ingen
  gemensam reaktionsmedian räknas ut. Passdetaljerna visar råa sammanfattningar
  och underlag även för tidslinjens värden.

Perioden (all sparad historik, 7 eller 30 dygn) gäller matris, punktdiagram
och individ. Inga normer, rangordning, matematikjämförelser eller samlat
fokusbetyg införs. Få signaler och ändrat övningsupplägg begränsar tolkningen.
Det sparade version-1-kontraktet innehåller inga råa enskilda svar eller
protokollhistorik att rekonstruera.

Historik hämtas när modulen öppnas, vid ändrad behörig elevlista eller när
läraren uttryckligen väljer Uppdatera fokusresultat, via befintligt
`GET /api/teacher-students/:studentId`, högst fyra samtidiga läsningar.
Endast fokusfältet används i modulen. Sena svar från ett tidigare gruppurval
ignoreras och fler läsningar slutar schemaläggas. Uppdatera fokusresultat
gör nya läsningar; ingen elevdata skrivs och inget nytt API eller schema införs.

Gruppmodulen är ny lokal kod och har ännu inte publicerats. Lokalt godkända:
150 testfiler/723 tester, produktionsbuild, riktad ESLint, arkitektur och
projektkarta. Dator-/surfplattebilder har granskats, browser-touch och Enter
provats. Robotar verifierar gruppbyten, omladdning, diagram, hämtningsfel och
återförsök, inloggning, nekad elevåtkomst och oförändrade elevprofiler.
Bred robotsvit: 107/108 godkända; en timeout före elevinloggning under samtidig
ombyggnad i delad robotbyggmapp. Separat omkörning av den kontrollen och tre
modulrobotar: 4/4 godkända. Alla 109 aktuella kontroller har därmed passerat,
men ingen helt grön fullsvit i en enda körning påstås. Ingen procenträkningskod
ändrades. Detaljer finns i projektkartans `attention-group-module`.

### Beskrivande färgmatris, lokal uppdatering 2026-10-16

Det finns ännu ingen utprövad referens för samma ålder och övningsversion.
Först hölls rött/orange avstängda. Simon har därefter uttryckligen valt en
preliminär lokal jämförelse från sitt elevunderlag (se nästa avsnitt).
Gul, grön och blå beskriver elevens egna träffmönster
med fasta, uttryckligen preliminära designvärden. Andra elevers resultat eller
ett annat klass-/gruppurval kan aldrig flytta gränserna. Periodvalet kan ändra
elevens underlag och därmed färgen. Ingen ny lagring eller API införs.

Regler i `attentionSignals.js`, `descriptive-v1`:

- Endast färdiga pass räknas. Stockholm-datum delar in passen i dagar.
  Varje informativ dags andel väger lika i färgregeln; flera pass samma dag
  ersätter inte flera dagar. Dagen behöver fyra svar, eller två stoppsignaler.
- **Vit/streckad:** färre än tre informativa dagar eller totalt färre än
  20 svar från dessa dagar (12 för Hejda). Noll rätt med tillräckligt många
  svar skiljs från inga svar. Även äldre profiler utan historik visas vitt.
- **Grön – Oftast träff:** minst 60 procent träffar under minst två tredjedelar
  av de informativa dagarna och medianen av dagsandelarna minst 60 procent.
  Annars **gul – Färre träffar**. Gult är inte en under-genomsnittet-markering.
- **Blå – Stabilt träffsäker:** minst fem informativa dagar, minst 40 svar,
  minst 90 procent varje informativ dag och en dagmedian på minst 95 procent.
- **Pil:** sex informativa dagar behövs. De tre senaste jämförs med de tre
  föregående. Dagmedianerna ska skilja minst 15 procentenheter, och samtliga
  senaste dagar ska ligga högre/lägre än samtliga tidigare. Annars ingen
  tydlig riktning. Pilarna är beskrivningar, inte signifikanstest eller
  säkerställd förändring. Saknat underlag markeras särskilt.

Färgen för Växla bygger på rätt vid bytt regel, inte skillnad mellan
passmedianer. Svarstid, upprepad regel och tidiga tryck finns i diagram och
passdetaljer. De påverkar inte färgen. Orange/röd uppföljning är en separat,
preliminär lokal jämförelse enligt nästa avsnitt.

Denna färguppdatering är lokal och ännu inte publicerad. Verifierat 2026-10-16:
151 testfiler/729 tester, produktionsbuild och hela robotsviten 110/110
godkända i en körning med 0 regelbrott. Riktad ESLint, arkitektur och
projektkarta godkända. Sex nya modelltester täcker minimiunderlag, Stockholm-dagar,
dagviktning, separat färg per moment och försiktiga pilar. Robot testar alla
fyra aktiva färger, oförändrad färg vid gruppbyte, dolda procenttal, touch,
Enter, tillgängliga detaljer och oförändrade elevprofiler. Skärmbilder på dator
och surfplatta granskade. Detaljer finns i projektkartans `attention-group-module`.

### Preliminär lokal jämförelse, vald av Simon 2026-10-16

Simon valde uttryckligen hela sitt elevunderlag som lokal jämförelse.
`local-pilot-v1` använder hela den inloggade lärarens behöriga elevlista,
inte den visade klassen/gruppen. Samma periodfilter gäller elev och referens.
Varje bidragande elev väger lika med medianen av sina senaste upp till fem
informativa dagars träffandelar. Aktuell elev tas bort från sin egen referens.
Tre informativa dagar och minst 20 svar behövs (12 för Hejda) i detta senaste
dagsfönster. Äldre svar får inte fylla ut ett glest senaste dagsfönster.
Ingen blandning sker mellan de fyra momenten.

Minst åtta **andra** behöriga elever med tillräckligt underlag behövs för
jämförelse. Deras genomsnitt och stickprovsstandardavvikelse används:

- **Orange – Återkommande lägre:** elevens dagmedian och minst 80 procent av
  de senaste upp till fem informativa dagarna ligger minst 20 procentenheter
  **och** 1,5 standardavvikelser under genomsnittet.
- **Röd – Följ upp:** samtliga fem senaste informativa dagar ligger minst
  30 procentenheter **och** två standardavvikelser under genomsnittet, med
  minst 40 svar under dessa dagar. En enstaka svag dag ger inte rött.
- Utan en sådan uppföljningssignal används de beskrivande färgreglerna ovan.
  Vitt för otillräckligt elevunderlag kan aldrig ersättas med en varningsfärg.

Genomsnittet är medelvärdet av elevernas dagmedianer, inte ett svarsviktat
medel som låter elever med många pass dominera. Spridningskravet gör gränsen
vidare när elevunderlaget varierar mycket. Detta är konservativa designregler
för lokal provning, inte en validerad norm eller ett signifikanstest. Ålder
och historisk övningsversion kan inte matchas med befintlig data. Texten i
modulen, färgförklaringen och elevens detaljer anger begränsningarna.

`useAttentionCohort` fryser hela referensens roster och lästa historik vid
modulstart. Automatisk dashboardpoll och byte av visad grupp kan inte ändra
referensen. Uttrycklig Uppdatera fokusresultat, omladdning av modulen eller
ändrad behörig elevlista hämtar ett nytt underlag. Tid och antal elever visas.
Alla profiler måste hämtas utan fel innan referensen används. Ett fel hos en
dold jämförelseelev stänger också av orange/rött; beskrivande färger kvarstår.
Inga profilscheman, API-routes, matematiksvar eller lagrade färger införs.

Lokal jämförelse är ny lokal kod, inte publicerad. Verifierat 2026-10-16:
152 testfiler/735 tester, build och hela robotsviten 111/111 passerar med
0 regelbrott. Riktad ESLint, arkitektur och projektkarta godkända. Sex nya
modelltester granskar viktning, egen elev exkluderad, minimiunderlag, spridning
och upprepning. Ny robot använder 16 testelever i två klasser och verifierar
stabila röda/orange signaler vid gruppbyte, kompletta detaljer, dolda läsfel,
återförsök samt oförändrade elevprofiler. Dator-/surfplattebilder granskade;
44-px-layouten kvar. Inga riktiga produktionselever analyserades. Detaljer
finns i projektkartans `attention-group-module`.

## Lagringskontrakt

- `attention_result` använder befintlig autentiserad `/api/me/events` med
  cookie, betrodd origin och CSRF. Elev-ID hämtas från sessionen.
- Resultatet har ett stabilt UUID, läge, start/sluttid, aktiv tid, avbrottsflagga och validerad sammanfattning. Version 1 har endast sammanfattning; nya version 2 har även avbrottsorsak och färdiga signalers tidsförlopp enligt avsnittet ovan. Skärmkoordinater och figurer sparas inte. Endast de senaste 500 passen per elev behålls.
- Den befintliga krypterade IndexedDB-vaulten skriver snapshot och händelse
  atomärt innan nätanrop. Återförsök kontrollerar redan köad/kvitterad
  händelse i stället för att försöka skapa en dubbel lokal post.
- Servern skriver `attentionHistory` via befintlig CAS för elevprofilen.
  Samma pass-ID räknas en gång även om event-ID ändras vid återförsök.
  Ogiltiga typer, summeringar och tider avvisas utan partiell skrivning.
- Historiken är valfri i äldre profiler. Profilmerge förenar giltiga pass
  utan att skriva över en redan sparad version. Checkpoints saknar fältet
  och äldre profil-POST får inte ändra det: endast resultathändelser äger det.
- Befintlig behörighetskontroll för lärarens fulla elevprofil gäller även
  historiken. Listprofiler behöver inte bära resultathistorik. Elevradering
  följer befintlig profillivscykel.

Resultathändelsen ändrar inga matematiksvar, stats, mastery, adaptiva beslut
eller uppdragsprogression. Befintliga paushändelser är separata.

## Verifieringsstatus

Byggt lokalt. Kontroller omfattar validering, idempotens, merge/äldre
profiler, behörigheter, krypterad kö, nätfel, återförsök och oförändrade
matematikdata. Slutlig lokal verifiering 2026-10-14: 148 testfiler/712 tester
och hela robotsviten 104/104 passerar, utan regelbrott. Lint för nya och
ändrade historikfiler passerar; StudentHome har två befintliga hookvarningar.
Arkitektur och projektkarta passerar. Lärarhistorikens skärmbild har granskats.
Touch och tangentbord har provats i lokal webbläsare, inte fysisk elevplatta.
Produktionspublicering följer Simons begäran att publicera när allt är testat
och färdigt.

## Produktion 2026-10-14

Publicerat genom GitHub `origin/master`, revision
`ff9262550b569d1275cbcd8147ca368b974ad18d`.
[GitHub Verify](https://github.com/ximonse/sequential_math/actions/runs/38521583255)
passerar arkitektur, projektkarta, tester och build. Vercel-projektet
`sekvens`, deployment `dpl_CWVySp7wNDQmxCKMyN6AJFdErxEs`, är READY och
[matematik.ximon.se](https://matematik.ximon.se) visar samma revision.

Den publika inloggningssidan laddades i isolerad webbläsarkontext.
`/assets/index-RJ6kpL6g.js` svarar HTTP 200 och innehåller lärarhistoriken,
resultathändelsen och sparbekräftelsen. SHA256 matchar lokalt testat bygge:
`f5fba3b71028a6a8292c43eb7801fe93d10cba3bbfc73d13dbd7235dc71f01b0`.
Ett oinloggat POST till `/api/me/events` nekas med HTTP 401.
Fulla elev–lärarflöden verifierades i lokal robotmiljö; inga riktiga elevkonton
eller nya historikposter användes för produktionskontrollen.
Publiceringsbeläggen sparas i en lokal dokumentationscommit.
