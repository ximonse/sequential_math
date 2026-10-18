# Fokuspunkten

Frivillig fokusuppvärmning med två lägen: **1 - FOKUS** (tryck vid grön cirkel)
och **2 - KONTROLL** (tryck vid grön cirkel, avstå vid röd cirkel eller grön fyrkant).
Menyn innehåller också [MULTI](MULTI_ACTIVITY.md), som växlar mellan form och antal.
Aktiviteten gör inga påståenden om förbättrade skolresultat och ersätter
inte en rörelsepaus.

## Åtkomst och återgång

Aktiviteten öppnas från elevens startsida och från aktivitetspauser i vanlig
träning och talbild. Ett aktivt läraruppdrag måste tillåta pausaktiviteter
(`breakGames: true`). Startsidan inväntar klasskonfiguration och upplöst
uppdrag; laddningsfel eller olöst uttryckligt uppdrag öppnar inte aktiviteten.
Från startsidan återgår eleven dit. Från paus fortsätter samma matematikpass
inom befintlig träningsram. Pong och Snake behåller sina befintliga flöden.

## Pass och signaler

Instruktionerna visas före start. Tre övningssignaler följs av en uttrycklig
start av ett 120 sekunder långt pass. KONTROLL övar alla tre signaltyperna före passet.
De första tre färdigställda signalerna i KONTROLL-passet innehåller alltid
grön cirkel, röd cirkel och grön fyrkant i blandad ordning. En signal som
avbryts genom dold flik visas igen, så garantin inte förbrukas av pausen.
Därefter väljs grön cirkel med sannolikhet 70 %, röd cirkel 15 % och
grön fyrkant 15 %. Rikttiderna är 6, 10 och 15 sekunder i passets tre
40-sekundersdelar, med oberoende slumpad variation ±2 sekunder per väntan.
Progressionen börjar om varje pass; ingen nivå sparas. Den lokala versionen
använder nya protokoll-ID:n; äldre 3–10/3–15/3–20-pass behåller sina mätregler.
Se [arkiv, versioner och nya vyer](ATTENTION_ARCHIVE_AND_VIEWS.md) för
sparpunkter under passet, obegränsat tidsarkiv och export.

Under både övning och pass visas endast en centrerad prick (14 × 14 px,
hälften av ursprungliga diametern) och en grå Avsluta-knapp. Hela skärmen
är tryckyta utom knappen; ingen rubrik, instruktion, nedräkning eller
tryckbekräftelse visas under körningen.

I FOKUS väntar den gröna signalen på svar i högst fem sekunder; i KONTROLL är svarsfönstret två sekunder. Första trycket avgör och färdigställer
utfallet direkt; pricken återställs samtidigt till en vit cirkel och nästa
väntan börjar. Tryck inom 400 ms efter ett registrerat tryck ignoreras,
så ett snabbt dubbeltryck inte blir ett för tidigt tryck. Övriga för tidiga
tryck räknas utan att flytta signalens tidpunkt. En obesvarad signal
färdigställs när dess svarstid tar slut i KONTROLL. I ett riktigt FOKUS-pass ger fem sekunder utan svar i stället frågan **Ska vi starta om?**. Försöket sparas som **Ej fullföljt**, utan miss för den obesvarade signalen. Eleven kan välja Ja, starta om eller Tillbaka. Omstart kräver att föregående försök skrivits säkert lokalt och börjar två nya minuter med nytt pass-ID; introduktionen upprepas inte. Fullföljande, svarstid och utvecklingen under passet hålls isär i lärarvyn.

När fliken döljs fryser den aktiva tiden och pågående signal kasseras utan
resultat. Redan besvarade signaler är färdiga och behålls. Eleven måste välja Fortsätt och
en ny väntetid börjar. En pågående övningssignal görs om. Avslut och
120-sekundersgränsen kasserar också ofärdiga signaler. Timers städas vid
paus, avslut och när aktiviteten lämnas.

## Resultat och gräns mot matematiken

Resultatet innehåller träffar, missade signaler, för tidiga tryck, tryck på
fel signal, korrekt avstådda signaler (KONTROLL) och medianreaktionstid för
träffar när sådana finns. Avbrutna pass märks som avbrutna. Efter Simons
godkännande 2026-10-14 sparas resultat för riktiga pass till en
separat lärarhistorik; introduktioner sparas inte. Se
[historikens lagring och verifieringsstatus](ATTENTION_HISTORY.md).

Historiken använder ett eget profilfält och den autentiserade händelse-API:n.
Ingen fokusdata skrivs till matematiklogg, mastery eller matematikstatistik.
Befintliga paushändelser kan registrera öppning/stängning från vanlig
träning, utan signaler eller resultat. Reaktionstid använder
`performance.now()`. Touch och mus registreras vid pointerdown på skärmen.
Mellanslag och Enter registrerar samma svar när tryckytan har fokus;
tangentrepetition ignoreras. Avsluta räknas aldrig som ett svar.

Väntetider och svarsfönster är produktens provningsvärden, inte
forskningsfastställda normalvärden eller diagnostiska gränser.

## Kontroller

`src/lib/focusActivity.test.js` kontrollerar signaler, tid, progression,
övning, dubbeltryck, paus, avbrott och passgräns med styrd tid/slump.
`robots/focus.robot.js` kontrollerar elevåtkomst, lärarbegränsningar,
klasskonfigurationens laddning/fel, touch och tangentbord, återgång i
båda matematikflödena och frånvaro av förändrad matematikdata. Robotens
surfplatteskärmbilder sparas som testartefakter.

Verifierat lokalt 2026-10-13: 145 testfiler/691 tester och produktionsbuild
passerar. Hela robotsviten kördes: 92 av 94 prov passerade direkt; de två
fallande befintliga proven (klassaktivering och screeninggenomgång)
passerade vid separat omkörning med en worker. Samtliga sju fokusprov
passerade också med slutlig kod i den omkörningen (9 av 9 prov).
Touchhändelser och tangentbord har provats i webbläsaren; surfplattans
instruktion, signal och resultatskärm har granskats visuellt. De fem temana
behåller svart bakgrund, vit väntpunkt, fasta signalfärger och läsbar text.
Detta är lokal webbläsarverifiering, inte provning på fysisk elevplatta.
Build har befintliga varningar om Browserslist, blandade imports och stor
bundle.

Inför publicering 2026-10-13 inväntar pausroboten uttryckligen att alla
20 matematiksvar nått testservern innan fokusaktivitetens data jämförs.
Det förhindrar att senare synkning av tidigare svar felaktigt ser ut som
matematikdata skapad av fokusaktiviteten. Verify-flödet installerar nu
Chromium eftersom projektkartans befintliga UI-test behöver en webbläsare.
Simon har godkänt produktion efter verifiering; publiceringsstatus och
verifierad revision följs i projektkartan.

## Produktion 2026-10-13

Publicerat genom GitHub `origin/master`, revision
`986c1cecd3b196389c443521c4841b38d333c9ed` (innehåller Fokuspunkten från
`d27e3a4`). [GitHub Verify](https://github.com/ximonse/sequential_math/actions/runs/38457424499)
passerade arkitektur, projektkarta, tester och build.
Vercel-projektet `sekvens` visar READY för
`dpl_71QhS1JuUzDbpiSaoSqKQ7527siW`, och
[matematik.ximon.se](https://matematik.ximon.se) pekar på den leveransen.

Den publika inloggningssidan laddades i en separat webbläsarkontext.
`/assets/index-BwIFAnsx.js` svarade HTTP 200, innehöll Fokuspunkten och
hade samma SHA256 som lokalt verifierat bygge:
`3aa9a8776095dd564bee3b565824a03c5fac9c54c9231937179a4f7d26bf615a`.
Funktionsprov med elevinloggning, touch och återgång gjordes i den isolerade
lokala robotmiljön; detta är inte ett prov av ett riktigt elevkonto i produktion.

## Lokal ändring 2026-10-14

Den rena tryckytan, halverade pricken, direkt återställning, dubbeltrycksskyddet
och de nya lägesnamnen är byggda lokalt efter Simons begäran. 145 testfiler/
692 tester, build och åtta fokusrobotprov passerar. Skärmbild i 768 × 1024
har granskats; pricken är centrerad och endast den grå Avsluta-texten syns.
Hela robotsviten passerar: 95 av 95 prov och inga regelbrott. Arkitektur,
projektkarta och lint för ändrade kodfiler passerar också.
Denna ändring är ännu inte publicerad;
produktionsbeläggen ovan gäller den tidigare versionen.

KONTROLLs signalgaranti under själva passet tillkom 2026-10-14 efter ett
robotprov som reproducerade ett pass med enbart gröna cirklar. Menyn har
nu mjukare kort och fasta färger; FOKUS/KONTROLL behåller den rena svarta
körvyn. MULTI har en separat fast palett som sidans tema inte påverkar.
Slutlig lokal verifiering av dessa ändringar: 146 testfiler/703 tester,
build och hela robotsviten (100/100, utan regelbrott) passerar. Lint,
arkitektur och projektkartans kontroll passerar. Surfplatte- och mobilbilder
har granskats. Dessa ändringar är ännu inte publicerade.

## Produktion 2026-10-14

Den rena tryckytan, halverade pricken, direkt återställning,
dubbeltrycksskyddet, KONTROLLs signalgaranti och MULTI är nu publicerade
via GitHub master, revision `ea0acea71e128e805b234bd6e9110316e8591336`.
GitHub Verify 38490758041 passerar. Vercel `sekvens`, deployment
`dpl_FM8Ab57nG3Jv7YfvfcNL5Z8ghmb6`, är READY och produktionsdomänen
visar samma revision. Levererat JavaScript matchar det lokalt verifierade
bygget exakt; se [MULTI:s publiceringsbelägg](MULTI_ACTIVITY.md).

## Lokal vidareutveckling 2026-10-16

Nya pass i alla tre aktiviteter sparar aktiv signaltid, utfall och svarstid enligt version 2. Läraren kan följa utvecklingen inom passet, även före ett avbrott; se [historikens aktuella regler](ATTENTION_HISTORY.md#utveckling-under-passet-och-fokus-svarstid-2026-10-16). Fem sekunder är en produktregel för omstart, inte belägg för att eleven har gett upp. Äldre tvåsekunderspass bevaras och blandas inte med nya FOKUS-jämförelser. Detta är lokal vidareutveckling; produktionsbeläggen ovan avser tidigare versioner.
