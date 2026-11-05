# Talpar och Talbild

## Talpar

Vanlig fokuserad Talpar-träning börjar varje gång på nivå 1, även om eleven
tidigare klarat alla nivåer. Sparade resultat och tidigare kunskapsbelägg
behålls. Ett uttryckligt nivåval respektive lärarens nivåintervall respekteras.
Lärarens antal uppgifter är fortfarande ett tak; det förlängs inte automatiskt.

Omgången stiger en nivå efter tre rätt i följd. Ett fel nollställer följden,
men sänker inte omgångsnivån. Själva omgångens nivåbyte har inget tidskrav.

| Nivåer | Innehåll |
| --- | --- |
| 1–3 | 10-kompisar |
| 4–6 | 15-kompisar |
| 7–9 | 20-kompisar |
| 10–12 | Blandade 10-, 15- och 20-kompisar |

Blandnivåerna använder slumpade rotationer för måltal, talpar och den
saknade termens position. För att gå vidare från en blandnivå behövs både
tre rätt i följd och minst ett korrekt svar för vart och ett av måltalen
under nivån. Inom varje grupp har uppgifterna samma innehåll; ingen ytterligare
svårighetsökning styr omgången mellan gruppens tre nivåer.

Den separata kunskapsbedömningen kräver minst fem korrekta giltiga tidsprov
och en median på högst 10, 4 respektive 2 sekunder inom varje trestegsgrupp.
Dessa tidsmål styr mastery, inte omgångens tre-svarsregel.

Efter den högsta nivån erbjuds eleven att börja om eller sluta.
Omstart börjar samma omgång från dess lägsta nivå. Fri Talpar-träning
saknar uppgiftstak; pauserna finns kvar. Alla kompetenser har högst tolv
nivåer. Dubblors första omgång ändras inte. Vanliga blandade träningspass
får ingen omgångsreset.

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
omgångsprogression och att länkar håller sig inom tolv nivåer.

Detta dokument beskriver lokal kod. Publicering kräver separat mandat.
