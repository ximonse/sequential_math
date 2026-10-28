# Lärarvyns arbetsflöden

## Gemensam riktning

Simon godkände 2026-10-28 en kompakt arbetsvy med konsekvent åtskillnad mellan
visningsurval, innehåll och mottagare. Samma handling ska ha samma betydelse,
val ska överleva tillbakagång och sökning, och verkställande ska ge ett kvitto.
Framstegssidans överblick behålls. Stora vertikala paddings undviks; metadata
delar rad med namn när utrymmet räcker. Den generella planeringsskillen finns
i `C:/Users/ximon/.codex/skills/ui-planering/SKILL.md`.

Efter återkoppling samma dag balanseras tätheten med luft mellan sektionerna,
tydliga kategorirubriker och mjuk markering av valda mottagare/aktivt steg.
Kompakta kontroller ska inte göra vyn till en platt, hoptryckt lista.

Arkitekturavvägning: DashboardLayout är fortfarande över 600 rader, men ändringen
är begränsad till inkoppling, navigering och skydd av osparat arbete. Nytt
flöde, urval, listning, datahämtning och utdelningskvitto ligger i separata
komponenter/hookar; ingen ny verksamhetslogik läggs i dashboardskalet.

## Screening: dela ut

`ScreeningDispatchPanel` skiljer nu mellan översikt och utdelningsflöde.
Översikten läser tillgängliga klassers screeningar, grupperar befintliga
utdelningar med `groupCollections` och visar status, antal, mottagare och
vägar till återanvändning respektive resultat/avslut. Sök, statusfilter och
sortering gäller översikten. Ett separat visningsurval kan begränsa listan;
det väljer aldrig mottagare för en ny utdelning.

Utdelning börjar med Återanvänd eller Skapa ny. Därefter:

1. Innehåll: namn, befintligt material eller valda/egna frågor.
2. Mottagare: sökbart flerval av klasser, grupper och enskilda elever.
3. Kontroll: frågor/arbetsytor, valda mottagarobjekt och exakta berörda elever.
4. Explicit utdelning och kvitto per klass, med säker återkörning av obekräftade klasser.

Bild- och skrivfrågeredigerarna hålls monterade mellan stegen, så även ännu
inte tillagda frågeutkast finns kvar vid tillbakagång. Bara tillagda frågor
ingår i utdelningen. Ett nytt utdelningsflöde börjar med tomt mottagarurval.
Ett pågående innehållsutkast varnar innan det ersätts eller lärarvyn lämnas.

Produktionens privata, versionshanterade screeningutkast ingår också i
innehållssteget. Halvfärdiga bild- och skrivfrågor sparas, återställs och
versionsväxlas tillsammans med samlingen. Sparning delar inte ut något och
ändrar inte mottagare. Kontrollerade redigerare accepterar funktionella
tillståndsuppdateringar, så efterföljande ändringar bevarar tidigare fält.
Den befintliga hanteringen av parallella ändringar och förlorad sparrespons
behålls. Bara tillagda frågor skickas i en utdelning.

`recipientSelection.js` löser urvalet mot tillgängliga elever och klasser.
Varje elev placeras i en enda klass även om eleven ingår i flera valda
klasser/grupper. Kontroll och POST använder explicita elev-ID-listor, inte
en dynamisk helklassbegäran. Okända mottagare, saknad klass och serverns
testbegränsning visas och spärrar utdelning; inget tyst delurval görs.
Servern kontrollerar behörighet, klassmedlemskap och tombstones som tidigare.

Ett `requestId` fryses med innehåll och mottagare vid utdelning. API:t härleder
ett ID per lärare/klass/försök samt ett fingeravtryck av innehållet. Det befintliga
atomära skapandet garanterar en post. Vid förlorad kvittens kan samma försök
bekräfta den sparade posten; annan payload för samma försök ger 409. Ändrad
mottagarlista eller borttagna elever återställs inte av ett återförsök.
Lyckade klasser skickas inte igen av kvittovyn. Äldre API-anrop utan requestId
behåller tidigare beteende. Ett nytt avsiktligt flöde får ett nytt försöks-ID.

Screening är fortsatt `diagnostic_only`. Ingen vanlig träningslogg, mastery,
adaptiv progression eller befintligt elevsvar ändras av det nya flödet.
Resultat- och avslutsflödet behåller sina befintliga behörigheter och regler.

## Ursprunglig lokal verifiering 2026-10-28

- 191 testfiler / 945 enhetstester, produktionsbuild, riktad lint, arkitektur
  och projektkarta passerar. Bygget har befintliga varningar om paketstorlek,
  delad dynamisk import och åldrad Browserslist-data.
- Ny flödesrobot var röd före implementation. Den kontrollerar flera klasser,
  överlappande grupp, en enskild elev, sökning utan träff, bevarat frågeutkast,
  förlorad lyckad respons, återförsök utan dubblett, mottagarlistor, sök/status/
  sortering, automatisk resultatöppning, avslut och återanvändning med tomma
  nya mottagare. En separat navigeringsrobot var röd för kvarhängande varning
  efter avsiktligt lämnat utkast och är grön efter rättning.
- Den breda produktionslika robotkörningen gav 158 passerade, fyra fall och
  fyra miljöberoende överhoppade fall. Räknehäftets och bildbibliotekets gamla
  ingångskontroller anpassades till nya flödet och passerade. Nivåfallet
  passerade seriellt. Fokusprovet föll även i en seriell blandad körning, men
  passerade därefter ensamt både på oförändrad HEAD 0d248f2 i en isolerad
  baskopia och i den ändrade appen. Det är inte en obruten grön fullkörning.
- Slutbyggets nya flödes- och navigeringsrobot passerar tillsammans även
  efter den visuella balanseringen. Fyllda liggande/stående vyer har renderats
  och visuellt granskats. Bara syntetisk minnesdatabas; ingen fysisk iPad,
  riktig elevdata, push eller produktionspublicering i denna leverans.

## Avgränsad publiceringsgren 2026-10-28

Publiceringsgrenen utgår från produktionsbasen `7fede25` och innehåller inte
det separata analys-/MCP-/materialarbetet i PR 22. Produktionens privata
screeningutkast behålls. Tooltips för Fokus och Värm/Värm upp ingår också.

- 176 testfiler / 882 enhetstester passerar på denna mindre kodbas.
- Tio berörda produktionslika webbläsartester passerar tillsammans seriellt:
  blandade mottagare och säkra återförsök, navigering, privata versionsutkast,
  frysta facit/elevsvar/resultat, bildbank/uppladdning/integritet,
  återanvändning och resultat för grupper över flera klasser.
- Testerna fångade först en integrationsmiss med funktionella
  redigeraruppdateringar. Den rättades före den gröna omkörningen.
- Fyllda mottagarvyer och utkastgranskning i liggande och stående läge har
  renderats och visuellt granskats. Tester använder syntetisk minnes-KV.
- Riktad lint, arkitekturkontroll och projektkarta passerar. GitHub-kontroller
  och produktionsverifiering redovisas separat i projektkartan efter publicering.

## Fortsatt harmonisering

Ovan beskriver kod för screening. Överföring till Uppdrag/tickets,
omstrukturering av bildfrågeredigeraren och gemensam tillgänglig hjälp är
separata etapper i projektkartan. Denna leverans påstår inte att de är byggda.
