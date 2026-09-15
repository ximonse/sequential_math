# Stabil grund för adaptiv matematikträning

> Arbetsplan och steg 1, 2026-09-15. Koden är facit för nuvarande beteende.

## Målarkitektur

Samma domänagnostiska urval ska gälla för fri träning, fokusträning, nivåfokus och uppdrag. Varje urvalsrequest anger tillåtna skills, nivåintervall/låst nivå, mastery-golv, recovery och variationshistorik. Motorn väljer domän via registret och får aldrig falla till aritmetik när flera domäner är valda.

Progression och senaste prestation ska beräknas per `domain + skill`. Global data får styra paus och passrytm men aldrig ändra nivån i ett annat område. Domänens `skillTag` ska koppla template, felanalys, mastery och lärarsignal.

Mastery ska uttryckligen välja mellan sakriktighet och delvis godkänt svar. En form som är del av målet, till exempel förenklat bråk, måste kunna vara ett krav för mastery.

## Ordning

1. **Aritmetikens nivåkontrakt:** kodverifiera nivåerna och synliggör blandningar/luckor. Pågår nedan.
2. **Gemensamt domänurval:** ersätt specialgrenar i adaptiveEngine med registerdrivet urval som respekterar skill, nivåintervall, mastery-golv, warmup, recovery och blandade skill-listor.
3. **Separata adaptiva signaler:** flytta nivåjustering från global femsvarslogik till aktuell skill. Behåll global signal för passrytm.
4. **Aritmetik på gemensam motor:** mappa templates till nivåkontraktet; separera tabellövning och decimal/positionsvärde från vanlig operationsmastery.
5. **Övriga domäner:** bråk, positionssystem/decimaltal, procent, algebra. Varje domän kräver nivåmatris, generatorvariation, felanalys, partial-policy, lärardata och kontraktstester innan fri blandad träning.

Kvalitetsspärrar: migration vid läsning, kontraktstester för blandning/nivåintervall/recovery/mastery, säkra fallbacks för äldre data och test + build efter varje sammanhängande kodsteg.

## Steg 1: faktisk nivåmatris för aritmetik

Mastery räknas idag per `operation + nivå`, inte per template eller delmoment. Det är därför otillräckligt när en nivå innehåller mer än en matematisk idé.

| Område | Nuvarande trappa | Kodverifierade avvikelser/risker |
| --- | --- | --- |
| Addition | L1--2 ental utan/med tiotalsövergång; L3--4 1+2; L5--6 2+2; L7--8 1+3; L9--10 2+3; L11--12 3+3, parvis utan/med övergång. | Decimaluppgifter ligger parallellt på L4/5, L7/8 och L10/12. Heltal och decimaler kan därför ge samma mastery. |
| Subtraktion | L1 utan lån; L2 första lån; L3--4 2-1; L5--6 2-2; L7--8 3-1; L9--10 3-2; L11--12 3-3, parvis utan/med lån. | L2 beskrivs som 1-1 men använder faktiskt 11--18 minus ental. Decimaler ligger parallellt på L4/5, L7/8 och L10/12. |
| Multiplikation | L1--4 tabellfakta; L5--6 1x2 siffror; L7--9 2x2; L10 1x3; L11--12 2x3. | Decimaler delar flera nivåer. 10--12-tabeller finns bara i separat tabellövning. Tabellövning skriver idag mastery-faktum för multiplikationsnivå med samma tal som tabellen, trots bara en avslutad övning. |
| Division | L1--3 exakta tabellfakta; L4--5 2/1 siffror; L6--7 3/1; L8--9 3/2; L10--11 4/2; L12 4/3. | L1--3 metadata säger ensiffrig dividend fast constraints tillåter tvåsiffriga tal. “Guidad” L8/L10 är bara en label. Rest, decimal/bråk, representations- och textuppgifter saknas avsiktligt. |

### Kontrakt som ska gälla efter steg 4

- En nivå kan ha flera templates bara när de testar samma uttryckliga kompetens. Annars ska de ha egna delmoment och egen evidens.
- Decimaler/positionsvärde och tabellflyt ska ha egen evidensmodell innan de påverkar aritmetikens nivåöversikt.
- Nästa kodsteg flyttar urval och evidensmodell; templates skrivs inte om i förväg.

## Fastställt beslut

Decimaler blir först ett dolt delområde under positionssystem. De får egen intern evidens och progression, men inget nytt synligt val i elevmenyn förrän den didaktiska nivåkartan och lärarflödet är redo.

