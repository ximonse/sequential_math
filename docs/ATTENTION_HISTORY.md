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
inte. Ändringen är ännu inte pushad eller publicerad.

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
