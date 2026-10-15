# Historik för fokusaktiviteter

Simon godkände sparad lärarhistorik för FOKUS, KONTROLL och MULTI 2026-10-14,
efter den första produktionsversionen med tillfälliga resultat.

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

- FOKUS/KONTROLL: upptäckta gröna signaler = träffar / (träffar + missade).
  KONTROLL visar också rätt avstådda stopp / (rätt avstådda + feltryck på
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
  Fälten har liggande innehåll, 44 px minsta tryckhöjd och 128 px bredd;
  tabellen växer efter innehållet. Tätare celler och mindre kringmarginaler
  håller översikten kompakt utan att minska textstorleken.
- **Punktdiagram:** FOKUS visar tidiga tryck per aktiv minut mot upptäckta
  signaler; KONTROLL visar upptäckta signaler mot rätt avstådda stopp; MULTI
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

Historik hämtas endast när modulen öppnas, via befintligt
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
Rött och orange är därför **avstängda**. Inga färger hävdar att eleven ligger
över/under genomsnittet. Gul, grön och blå beskriver elevens egna träffmönster
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
passdetaljer. De påverkar inte färgen. Före en framtida aktivering av rött och
orange behöver jämförelsereferens, jämförbar övningsversion, osäkerhet och
gränser för återkommande stora avvikelser bedömas separat.

Denna färguppdatering är lokal och ännu inte publicerad. Verifierat 2026-10-16:
151 testfiler/729 tester, produktionsbuild och hela robotsviten 110/110
godkända i en körning med 0 regelbrott. Riktad ESLint, arkitektur och
projektkarta godkända. Sex nya modelltester täcker minimiunderlag, Stockholm-dagar,
dagviktning, separat färg per moment och försiktiga pilar. Robot testar alla
fyra aktiva färger, oförändrad färg vid gruppbyte, dolda procenttal, touch,
Enter, tillgängliga detaljer och oförändrade elevprofiler. Skärmbilder på dator
och surfplatta granskade. Detaljer finns i projektkartans `attention-group-module`.

## Lagringskontrakt

- `attention_result` använder befintlig autentiserad `/api/me/events` med
  cookie, betrodd origin och CSRF. Elev-ID hämtas från sessionen.
- Resultatet har ett stabilt UUID, version 1, läge, start/sluttid, aktiv
  tid, avbrottsflagga och validerad sammanfattning. Råa tryck, figurer och
  enskilda svar sparas inte. Endast de senaste 500 passen per elev behålls.
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
