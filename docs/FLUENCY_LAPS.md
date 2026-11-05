# Talpar och Talbild

## Talpar

Vanlig fokuserad Talpar-träning börjar varje gång på nivå 1, även om eleven
tidigare klarat alla nivåer. Sparade resultat och tidigare kunskapsbelägg
behålls. Ett uttryckligt nivåval respektive lärarens nivåintervall respekteras.
Lärarens antal uppgifter är fortfarande ett tak; det förlängs inte automatiskt.

Omgången stiger en nivå efter tre rätt i följd. Nivå 1–4 gäller
10-kompisar, 5–8 gäller 15-kompisar och 9–12 gäller 20-kompisar.
Nya nivå 13 blandar dessa tre måltal i slumpade rotationer och väljer
talparet och den saknade termens position genom slumpade rotationer.
För att slutföra blandnivån behövs tre rätt i följd och minst ett korrekt
svar för vart och ett av de tre måltalen under nivån.

Efter den högsta nivån erbjuds eleven att börja om eller sluta.
Omstart börjar samma omgång från dess lägsta nivå. Fri Talpar-träning
saknar uppgiftstak; pauserna finns kvar. Lärarens nya Talpar-förval
omfattar nivå 1–13. Äldre uttryckliga nivåintervall ändras inte.

Nivå 13 tillhör bara Talpar. Andra kompetensers nivågränser är oförändrade.
Dubblors första omgång ändras inte. Vanliga blandade träningspass får ingen
omgångsreset.

## Talbild

En svårare bildlayout kräver fem korrekta svar i följd, där varje svar
har en giltig svarstid på högst fyra sekunder. Ett långsammare svar kan
inte vägas upp av fyra mycket snabba svar. Tidigare krävdes högst
2,6 sekunder i genomsnitt. Befintlig nedväxling vid långsamma eller
felpräglade svarsfönster och lärarens uppgiftstak behålls.

## Lokal verifiering

`robots/fluency-lap.robot.js` använder en syntetisk elev med belägg för
alla tolv tidigare nivåer, kontrollerar start på nivå 1, hela klättringen,
blandnivåns tre måltal, omstartsvalet och startnivån vid ett nytt besök.
`robots/fluency.robot.js` kontrollerar befintliga länkuppdrag och Talbild.
Enhetstester täcker fyrasekundersgränsen, felaktiga tider, blandgeneratorn,
omgångsprogression och länkkodning av nivå 13.

Detta dokument beskriver lokal kod. Publicering kräver separat mandat.
