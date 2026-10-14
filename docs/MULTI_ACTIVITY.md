# MULTI

En frivillig aktivitet för att växla mellan två regler. Den nås som **MULTI**
i Fokuspunkten-menyn på elevens startsida och vid tillåtna aktivitetspauser.
Samma uppdragsvillkor (`breakGames: true`) gäller för samtliga aktiviteter.

## Regler och upplägg

En romb eller fyrkant innehåller två eller tre prickar. Positionen bestämmer
vilken regel som gäller:

- Figuren i **övre rutan – FORM**: romb besvaras till vänster, fyrkant till
  höger. Eleven bortser från antalet prickar.
- Figuren i **nedre rutan – ANTAL**: två prickar besvaras till vänster, tre
  till höger. Eleven bortser från figurens form.

Instruktionskorten är ordnade som rutorna på skärmen och betonar först
positionen, därefter regeln. Övre/nedre ruta namnges också under passet.

Introduktionen ger fyra formuppgifter, fyra antalsuppgifter och åtta blandade
uppgifter. Den innehåller samtliga figurkombinationer och både upprepade
och bytta regler. Svensk återkoppling och svarsmappningen visas under
introduktionen; den påverkar inte resultatet från själva passet.

Eleven startar sedan ett tvåminuterspass. Uppgifterna blandas i block som
innehåller lika många av båda reglerna och samtliga kombinationer av form
och antal. Inledningen garanterar både en upprepad regel och ett regelbyte.
Eleven har fyra sekunder per uppgift. Vid feltryck visas figuren kvar i sin
ruta med regelpåminnelse och rätt trycksida i 1,8 sekunder. Extra tryck under
denna återkoppling ignoreras. Missad uppgift får också en påminnelse (1,2
sekunder i introduktionen, 1,8 i passet). Rätt svar behåller sin korta
återkoppling. Återkopplingen ingår i passets 120 aktiva sekunder; ingen
extra strafftid läggs till. Nästa uppgift börjar efter vanlig väntan.

Vänster/höger skärmhalva är stora tryckytor; piltangenterna ger samma svar.
Det första svaret färdigställer uppgiften direkt. Nära dubbeltryck och
tangentrepetition räknas inte som nya svar. Avsluta ligger utanför tryckytorna.

När fliken döljs fryser den aktiva tiden. En obesvarad uppgift kasseras utan
resultat och visas igen efter uttryckligt Fortsätt. En redan besvarad uppgift
behålls även om fliken döljs under dess återkoppling. Vid 120 aktiva sekunder
avslutas passet; en ofärdig uppgift räknas inte. Eleven kan avbryta tidigare.

## Resultat och data

Resultatet visar rätt, fel, missade uppgifter och rättandel. Upprepade och
bytta regler redovisas separat med antal rätt/antal färdiga och medianen
för rätta svar. Första uppgiften saknar föregående regel och ingår inte i
någon av jämförelsegrupperna. Klassningen beräknas från faktiskt föregående
färdigställda uppgift, även när den besvarades fel eller fick timeout.

Efter Simons godkännande 2026-10-14 sparas sammanfattningen för riktiga pass
till [lärarhistoriken](ATTENTION_HISTORY.md). Introduktioner och enskilda
uppgiftssvar sparas inte. Befintlig händelse-API återanvänds utan ny
profilschemamigrering; matematiklogg och mastery påverkas inte. Normal registrering
av öppnad/stängd aktivitetspaus återanvänds utan MULTI-resultat.

## Utformning och verifiering

Egna SVG-figurer med rundade hörn, rundade ytor och dämpad mint/blå palett.
Alla synliga instruktioner och resultattexter är svenska. CSS är avgränsad
till `.focus-activity` och använder fasta färger, utan sidtemats variabler
eller temamappade färgklasser. FOKUS/KONTROLLs körvy behåller sin svarta
bakgrund och fasta signaler.

Modelltester täcker båda reglerna, motstridiga ledtrådar, 4+4+8-introduktion,
balans, faktisk växling, dubbeltryck, fel/timeout, paus och passgräns.
Webbläsarrobotar täcker touch, tangentbord, svenska texter, resultat,
oförändrad matematikdata, återgång till samma läraruppdrag och fasta färger
i samtliga fem sidteman. Surfplattebilder har granskats visuellt.

Byggt lokalt 2026-10-14. 146 testfiler/703 tester och build passerar.
Hela robotsviten passerar: 100 av 100 prov, utan regelbrott. Lint för
ändrade kodfiler, arkitektur och projektkartans kontroll passerar också.
Touchhändelser har verifierats i webbläsaren; ingen fysisk elevplatta har
provats.

## Produktion 2026-10-14

Publicerat via GitHub master, revision `ea0acea71e128e805b234bd6e9110316e8591336`.
[GitHub Verify](https://github.com/ximonse/sequential_math/actions/runs/38490758041)
passerar. Vercel-projektet `sekvens`, deployment
`dpl_FM8Ab57nG3Jv7YfvfcNL5Z8ghmb6`, är READY och äger
[matematik.ximon.se](https://matematik.ximon.se) för denna revision.
Den publika inloggningssidan laddades i isolerad webbläsarkontext.
`/assets/index-80MHqhxg.js` svarar HTTP 200, innehåller MULTI och båda
fokuslägena och matchar det lokalt testade byggets SHA256:
`b30f97891290f63cc6d7f5bb79521ae31b191ecaf738eb96673101437bfd1682`.
Elevflödena provades med lokala robotkonton; inget riktigt elevkonto
provades i produktion. Publiceringsbeläggen sparas i en lokal dokumentationscommit.

## Lokal ändring: tydligare regler och felpåminnelse 2026-10-14

Instruktionerna betonar övre ruta/form och nedre ruta/antal med placerade
instruktionskort och större etiketter även under passet. Feltryck håller
figuren kvar i rätt ruta med regelpåminnelse och rätt trycksida i 1,8 sekunder.

148 testfiler/713 tester, build, riktad lint, arkitektur och projektkarta
passerar. Full robotsvit gav 103/105 direkt; det befintliga screeningprovet
fick timeout vid sparande och den nya bildrobotens klocka hann räkna en extra
missad uppgift under bildarbete. Bildroboten använder nu uttryckligt pausad
klocka med styrd progression. Separat omkörning av screening och samtliga
fem MULTI-prov gav 6/6, utan regelbrott. Surfplatteinstruktion, felpåminnelse
och mobilbild 390 × 667 har granskats; påminnelsen ryms inom rätt ruta.
Denna ändring är lokalt verifierad och ännu inte publicerad.
