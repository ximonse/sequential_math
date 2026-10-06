# Skriftlig addition och subtraktion – eget diagnospaket

Lokalt innehållssnitt 2026-10-06. Paketet är egna uppgifter för diagnostisk
provning, inte ett NCM-originalprov eller ett validerat diagnosinstrument.
Vanlig träning, mastery och adaptivitet påverkas inte.

## Granskning av den äldre banken

`NMC/processed/IMPORT_LOG.md` beskriver PDF-extraktion, facitkällor och
tolkningssäkerhet. `safe_batch_as_expressions.json` innehåller fem AS1- och
fem AS2-poster med original-PDF som källa och hög extraktionssäkerhet.
Det dokumenterar att text och facit kunde läsas, inte tillstånd att
återpublicera materialet. Ingen sådan dokumentation hittades i granskade
importfiler. Den äldre banken ändras inte eller ansluts till räknehäftet.

Strukturen skriftlig addition/subtraktion återanvänds som ämnesavgränsning.
Uppgifterna nedan är egna. Paketet har inga AS1-/AS2-etiketter som skulle
antyda att eleverna genomfört ett originalprov från NCM.

## Urval och ordning

Admin väljer **Skriftlig addition · 6 uppgifter**, **Skriftlig subtraktion ·
6 uppgifter** eller **Addition och subtraktion · 12 uppgifter**. Paketvalet
ersätter det synliga urvalet; enskilda kryssrutor kan därefter ändra det till
eget urval. Inget paket aktiveras automatiskt. Urvalet kan tilldelas en elev
eller hela klassen enligt befintlig admin- och klassbehörighet.

| Ordning i delpaketet | Addition | Facit | Avsikt |
| --- | --- | --- | --- |
| 1 | 268 + 431 | 699 | Utan minnessiffra |
| 2 | 352 + 426 | 778 | Utan minnessiffra, andra siffror |
| 3 | 248 + 327 | 575 | Minnessiffra från ental |
| 4 | 283 + 462 | 745 | Minnessiffra från tiotal |
| 5 | 357 + 268 | 625 | Två minnessiffror i följd |
| 6 | 587 + 246 | 833 | Två minnessiffror i följd, andra siffror |

| Ordning i delpaketet | Subtraktion | Facit | Avsikt |
| --- | --- | --- | --- |
| 1 | 764 − 231 | 533 | Utan växling |
| 2 | 986 − 452 | 534 | Utan växling, andra siffror |
| 3 | 642 − 217 | 425 | En växling från tiotal till ental |
| 4 | 753 − 428 | 325 | En växling, andra siffror |
| 5 | 402 − 178 | 224 | Växling genom noll |
| 6 | 503 − 267 | 236 | Växling genom noll, andra siffror |

Det kombinerade paketet följer additionspaketet och sedan subtraktionspaketet.
Två liknande uppgifter ger mer underlag än ett enstaka svar men bevisar inte
en stabil elevförmåga eller felorsak. Det finns ingen tidsgräns eller
gränspoäng som gör paketet till ett standardiserat prov.

## Lärarstöd och analysgräns

Utdelningsvyn visar syfte och en intervjufråga för valda uppgifter. När ett
sparat försök öppnas visas samma typ av stöd bredvid originalunderlaget.
Frågorna är för lärarens granskning, inte analys av just den elevens metod.
Granska hur eleven hanterar positioner och växlingar och be eleven förklara.

Alla tolv uppgifter kan få faktasammanfattning av slutsvar, inlämning,
kolumnplacering och, där representationen är entydig, synligt resultat.
Automatiska påståenden om glömd minnessiffra eller felaktigt lån ingår inte.
Den befintliga hypotesen ”större siffra minus mindre i varje kolumn” gäller
fortfarande endast det ursprungliga analysfallet 402 − 178. Den utvidgas
inte till 503 − 267 genom att uppgifterna har liknande didaktiskt syfte.
Oklar uppställning ska fortsatt ge okänt resultat.

## Version och verifiering

Uppgiftsmanifestets format är fortsatt v1, innehållets `manifestVersion` är
nu 2. De ursprungliga fyra uppgifternas ID, tal och `taskVersion: 1` behålls.
Åtta nya uppgifter har egna ID:n. Varje tilldelning fryser uppgiftslista,
ordning och uppgiftsinnehåll; gamla uppdrag utökas inte i efterhand.
Paketdefinition och manuella lärarfrågor ligger separat i
`diagnosticTaskPacks.v1.json` och används för explicit urval och lärarstöd.

Kontrollerna täcker samtliga facit via observationsfunktionen, paketens
ordning och räknesätt, tidigare uppgiftsidentiteter och att nya uppgifter
inte automatiskt får den gamla metodhypotesen. Webbläsarkontrollen delar ut
additionspaketet till två syntetiska elever och kontrollerar exakt sex
additioner samt att en annan klass inte får dem. Pedagogisk elevprövning
och kalibrering mot lärares bedömningar återstår.
