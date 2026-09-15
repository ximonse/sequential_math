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


## Utfört: steg 2, gemensamt domänurval

- `allowedTypes` tolkas nu som en validerad lista av registrerade skills.
- Motorn slår upp domänen via registret, väljer en skill inom scope och respekterar `levelRange` och låst nivå för alla domäner.
- Blandade uppdrag roterar från senast relevanta skill; de kan inte längre av misstag generera en aritmetisk uppgift när scope består av andra domäner.
- Aritmetik behåller tills vidare sin beprövade generator och metadata, men får sitt skill- och nivåbeslut från samma scope-kontrakt som de andra domänerna.
- Öppen begränsning till steg 3: återhämtning, warmup och prestation är ännu inte beräknade per skill för samtliga domäner.
## Utfört: steg 3, signaler per färdighet

- Korrekthetskvot, felrad och korrekt-svit för svårighetsjustering avgränsas nu till den senast besvarade skillen.
- `skill` är den utbyggbara kontraktsnyckeln i elevhistoriken; nya registrerade skills behöver inte läggas till i en central hårdkodad lista för att få egen signal.
- Global `currentDifficulty` finns kvar som kompatibel passindikator, men scoped träning väljer inte längre en annan skills nivå från den.
- Återhämtning efter tre fel och warmup efter uppehåll finns i den gemensamma urvalspolicyn. Nästa steg är att separera tabellflyt och dold decimal-/positionsvärde-evidens från operationsmastery.
## Utfört: tabellflyt som separat evidens

- En avslutad tabellövning sparar enbart `tableDrill.completions`; den skapar inte längre mastery för en nivå i multiplikation.
- Vid inläsning återkallas enbart äldre fakta med den tidigare tabellsignaturen: `multiplication`, samma tabell, `1/1` och en matchande completion nära i tid. Reparationen är idempotent och lämnar alla osäkra eller riktiga nivåfakta orörda.
- Decimal-/positionsvärde-evidens är nästa separata delområde. Det blir internt först enligt beslutet ovan och behöver ett tydligt template-kontrakt innan något elevval syns.

## Utfört: dold decimal-evidens

- Decimalmallar får den interna evidensnyckeln positions_decimal. Den används i historik och mastery, men visar inget nytt elevval.
- Heltalsräkning och decimalräkning får därmed separata progressionsspår; nästa arbete är en explicit nivåmatris och lärarpresentation för det dolda spåret.

- Decimalspåret har sex interna steg: 1dp utan växling, 1dp med växling, 1dp med större heltalsdel utan/med växling samt 2dp utan/med växling. De mappar från de äldre aritmetiknivåerna 4, 5, 7, 8, 10 och 12.


## Utfört: mastery kräver fullt svar

- Delvis korrekta svar lagras och återkopplas fortfarande, men räknas inte som korrekt evidens i mastery. Det gäller generellt, bland annat oförenklade bråk när förenklad form är målet.

- I vanlig addition/subtraktion på relevanta nivåer injiceras decimalträning med 25 % sannolikhet. Om decimalspåret ligger efter höjs den till 50 %. Nivåfokus och låsta uppdrag påverkas inte.

- Dold decimal-evidens behåller samtidigt sin föräldra-skill (addition eller subtraktion) för passrotation. Den räknas dock som positions_decimal för adaptiv signal och mastery.
