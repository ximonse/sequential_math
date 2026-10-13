# Fokuspunkten

Frivillig fokusuppvärmning med två lägen: Upptäck (tryck vid grön cirkel)
och Välj (tryck vid grön cirkel, avstå vid röd cirkel eller grön fyrkant).
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

Tre övningssignaler med instruktion följs av en uttrycklig start av ett
120 sekunder långt pass. Välj övar alla tre signaltyperna före passet.
Under passet väljs grön cirkel med sannolikhet 70 %, röd cirkel 15 % och
grön fyrkant 15 %. Slumpade väntetider är 3–10 sekunder under första
40 sekunderna, 3–15 under nästa 40 och 3–20 under sista 40. Progressionen
börjar om varje pass; ingen nivå sparas.

Signalen visas i två sekunder. Första trycket avgör utfallet; fler tryck
under samma signal ignoreras. För tidiga tryck räknas utan att flytta
signalens tidpunkt. Bekräftelsen säger endast
att ett tryck registrerats. Signalutfallet färdigställs vid signalens slut.

När fliken döljs fryser den aktiva tiden och pågående signal kasseras utan
resultat, även om eleven redan tryckt. Eleven måste välja Fortsätt och
en ny väntetid börjar. En pågående övningssignal görs om. Avslut och
120-sekundersgränsen kasserar också ofärdiga signaler. Timers städas vid
paus, avslut och när aktiviteten lämnas.

## Resultat och gräns mot matematiken

Resultatet innehåller träffar, missade signaler, för tidiga tryck, tryck på
fel signal, korrekt avstådda signaler (Välj) och medianreaktionstid för
träffar när sådana finns. Avbrutna pass märks som avbrutna. Resultaten
finns endast i komponentens minne och försvinner när aktiviteten lämnas.

Ingen fokusdata skrivs till elevprofil, matematiklogg, mastery eller API.
Befintliga paushändelser kan registrera öppning/stängning från vanlig
träning, utan signaler eller resultat. Reaktionstid använder
`performance.now()`. Touch, mus och tangentbord aktiverar samma knapp.

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
