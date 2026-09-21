# Elev–lärarscenarier och klassobservation

Status: **acceptansunderlag till produktkontrakt v1.0, 2026-09-20; S3/F6 delvis återspelat lokalt med syntetisk elev 2026-09-21**.
Scenarierna konkretiserar [produktkontraktet inklusive beslut D1–D3](PRODUCT_CONTRACT.md); beslutens bakgrund finns i [granskningsunderlaget](PRODUCT_CONTRACT_REVIEW.md).
De beskriver önskat beteende. Exakta trösklar fastställs senare i underkontrakt.

## 1. Gemensamma acceptansscenarier

| ID / koppling | Situation och händelser | Vad eleven ska möta | Vad läraren ska kunna förstå | Vad som måste visas vid verifiering |
| --- | --- | --- | --- | --- |
| S1 Ny elev — M1/M2, P1/P3/P7/P9, F1/F2/F6 | Eleven väljer tillåtet område utan tidigare underlag och lämnar sina första svar. | Begriplig start och försiktig anpassning; möjlighet att komma vidare från för lätt innehåll. | Skillnaden mellan ännu okänt kunnande och observerad svårighet. | Inga starka kunskapsomdömen utan relevant underlag; första urval och uppföljning kan förklaras. |
| S2 Stabilt kunnande — P1/P2/P3/P7, F2/F3/F5 | Eleven löser varierade uppgifter inom samma kompetens över en sammanhängande följd. | Automatiskt meningsfullt större utmaning, även vid långsam men säker lösning. Inget val om avancering eller förhandsbudskap om svårare uppgifter. Eventuell gratulation kommer efter belagt kunnande. | Vad som belagts och vilket innehåll som nu tränas. | Avancering påverkar faktiskt följande uppgifter utan elevens godkännande. Eventuell gratulation följer evidenskriterier för just nivån/området, inte enbart en svit, och är inget omdöme om allmän förmåga. |
| S3 Eleven fastnar — P2/P4/P9, F2/F4/F6 | Återkommande fel fortsätter även efter ett lättare steg. | Fortsatt återhämtning eller tillgängligt stöd; inte en ändlös serie på samma för svåra innehåll. | Återkommande svårighet, vilken anpassning som provats och behov av uppföljning. | En längre svarsföljd visar fungerande återhämtning och återgång; ett enstaka rätt får inte ensamt belägga att svårigheten är löst. |
| S4 Återkomst — P2/P3/P8, F2/F5/F6 | Eleven återvänder efter uppehåll med tidigare belagt kunnande. | Rimlig återintroduktion och anpassning till aktuella svar. | Historisk prestation och aktuellt behov som skilda uppgifter, enligt D2. | Historik bevaras; tillfällig repetition hindras inte av gammal mastery och ger inte automatiskt ett påstående om förlorad kunskap. |
| S5 Felhypotes — P3/P4/P6/P9, F3/F4/F6 | Samma felmönster återkommer i olika relevanta uppgifter; jämför med ett enstaka felslag och ett avbrott. | Saklig återkoppling utan etikett om elevens förmåga eller uppmärksamhet. | En möjlig felmodell med exempel, omfattning och osäkerhet; möjlighet till elevsamtal. | Felmönstrets belägg går att följa till svaren. Hypotesen presenteras inte som säker diagnos. |
| S6 Progression trots fler fel — P1/P5/P6, F2/F5/F6 | Eleven går från lätta till svårare uppgifter; andelen rätt sjunker. | Utmaning och vid behov anpassning inom rätt innehåll. | Att rå rättprocent inte ensam avgör om utvecklingen varit negativ. | Urval, period och svårighet finns i tolkningen; elevdetalj och sammanfattning är förenliga. |
| S7 Träningsfokus och läraruppdrag — P2/P7, F1/F2/F6 | Eleven väljer ett tillåtet fokus; i andra pass ger läraren ett låst respektive adaptivt uppdrag. Eleven visar stabilt kunnande eller fastnar. | Automatisk anpassning inom ramen, inte ett val att stanna/gå vidare. Vid låsning och svårighet erbjuds tillgängligt stöd eller paus utan tyst byte av uppdrag, enligt D3. | Vad som var tilldelat, vilket läge som användes och en signal när eleven fastnar. | Följande uppgifter följer rätt ram även när automatisk progression annars vore motiverad. Avslutat uppdrag är inte automatiskt belagt kunnande. |
| S8 Samma svar efter återläsning — P3/P5/P8, F4/F5/F6 | En följd av svar sparas, sessionen avbryts, återupptas och sammanställs. | Bekräftade framsteg finns kvar; tekniska problem får begriplig status. | Samma observationer för samma urval, eller uttryckligt ofullständigt underlag. | Ingen tyst förlust, dubblering eller ändrad kompetens. Samma historik och regelversion ger samma kunskapstolkning före/efter återläsning. |
| S9 Kompetensgränser — P1/P3/P5, F3/F4/F5/F6 | Eleven arbetar med heltal, decimaler och tabellflyt under enkla synliga rubriker. | Sammanhängande träning och begripliga rubriker. | Resultat för exakt den kompetens som prövats. | Hela kedjan uppgift → registrering → återläsning → progression → lärarvy bevarar kompetens och steg. |
| S10 Innehåll och fullständighet — P1/P3/P4/P9, F3/F4/F5/F6 | Många uppgifter genereras på ett steg; eleven ger rätt, fel och formmässigt ofullständiga svar. | Besvarbara, varierade uppgifter och konsekvent begriplig bedömning. | Vad steget faktiskt prövar och vilken evidens som räknas. | Oberoende facitkontroll, relevant variation och samma bedömningspolicy genom kedjan. Olika frågetext bevisar inte olika matematisk utmaning. |

M1 och M2 gäller samtliga scenarier. P8 gäller även fel i underlaget för övriga scenarier.

### Körda verifieringsposter

| Scenario | Kontrakt/appversion | Miljö och händelser | Faktiskt utfall | Begränsning |
| --- | --- | --- | --- | --- |
| S3, lärarsignalen i F6 | Produktkontrakt 1.0 / `2e6e2a4` | Lokal Vite dev, `/qa/adaptive?reset=1`, syntetisk tvåteckenselev, lokal lagring. Sex felaktiga svar (`99`) på addition nivå 1; därefter lärarens `Statistik & stöd`. | Elevvyn registrerade sex svar och visade lokal lagringsstatus. Lärarvyn behöll belagd nivå som okänd (`–`) och visade en prioriteringssignal: fortsatta fel i addition nivå 1, 0 av 6, samt alla sex frågor med elevsvar och rätt svar. Visuellt kontrollerat. Full testsvit: 74 filer/339 tester; produktionsbuild passerade. | Bevisar inte återhämtning och återgång i hela S3. Kör inte pilotens autentiserade cookie/event/vault-väg, molnsynk, omladdning, iPad, verklig elev eller produktion. De medvetet orimliga svaren prövar inte en specifik felhypotes enligt S5. |

## 2. Bevis som kompletterar varandra

| Metod | Kan visa | Kan inte ensam visa |
| --- | --- | --- |
| Kod-/kontraktsgranskning | Ansvar, motsägelser och konkreta felvägar. | Hur appen faktiskt fungerar i ett klassrum. |
| Återspelbara syntetiska elevförlopp | Att samma sekvens ger avsedd bedömning, anpassning och lärarbild, även efter återläsning. | Verklig förståelse, motivation eller användbarhet. |
| Innehållsgranskning och oberoende matematiska kontroller | Facit, svarskrav, variation och koppling till innehållsmål. | Att hela appflödet fungerar. |
| Gränssnittsgranskning | Att eleven kan svara och förstå återkoppling och läraren kan hitta underlaget. | Att osynliga datavägar är korrekta. |
| Klassobservation och elevsamtal | Verkliga hinder, rimlig utmaning och lärarens möjlighet att använda signalerna. | Generell lärandeeffekt eller statistisk kalibrering från ett enda pass. |

Ett fel kan falsifiera ett löfte även om övriga kontroller passerar. En lyckad observation ska beskrivas med sin omfattning, inte generaliseras till alla elever och lägen.

## 3. Underlag för veckans klasspass

Simon har erbjudit ett verkligt klasspass. Detta är ett förslag för observation av ordinarie användning; ingen ny insamling, export eller instrumentering har aktiverats. Appen är inte förklarad felfri eller färdig för release genom detta dokument.

Före passet: notera datum, ungefärlig tid, använd version om känd, enhet och träningsläge/uppdrag. Om versionen är okänd, skriv det. De tidigare identifierade riskerna med decimal-/tabellmastery och uppgiftsinnehåll kvarstår tills en fix faktiskt verifierats och publicerats; berörda nivåmarkeringar kan därför inte ensamma styrka kunnande.

Följ några naturligt uppkomna situationer: en elev som tycker att det är lätt, en som fastnar och en som arbetar stabilt. Försök inte framkalla misslyckanden eller tekniska avbrott i verkliga elevkonton. Simulerade felsvar, återspelnings- och avbrottstester hör hemma i syntetisk testmiljö.

Observera kort:

- Vad eleven försökte träna, vad appen gav och om eleven kom igång.
- En konkret uppgift, svaret, återkopplingen och de närmast följande uppgifterna om något verkar fel.
- Elevens egen korta beskrivning: ”för lätt”, ”för svårt”, ”förstod inte vad jag skulle skriva” eller annat, skilt från lärarens tolkning.
- Vad lärarvyn visade för samma innehåll och period; om signalen hjälpte dig välja ett undervisningssteg eller blev missvisande.
- Om något annat än matematiken påverkade: inmatning, avbrott, hjälp eller tekniskt problem. Skriv okänt när det är okänt.

Använd neutrala observationsetiketter som ”Elev A” i material som delas här. Namn, inloggningskort och identifierande skärmbilder behövs inte för denna mall. Observationerna behöver inte läggas i Git. Ingen export av elevhistorik ingår i uppdraget.

### Tom observationsmall

| Fält | Anteckning |
| --- | --- |
| Datum/tid, version eller okänd, enhet | |
| Neutral elevetikett, träningsläge och avsett innehåll | |
| Scenario S1–S10, eller ny situation | |
| Vad eleven faktiskt såg/gjorde; uppgift, svar, feedback, nästa uppgift | |
| Hjälp/avbrott/inmatningsproblem eller okänt | |
| Elevens egen upplevelse, om tillgänglig | |
| Vad lärarvyn visade, med vald period | |
| Lärarens tolkning och möjliga undervisningsåtgärd | |
| Förväntat enligt kontraktet; avvikelse eller stöd | |
| Vad behöver kontrolleras vidare? | |

## 4. Efter passet

Koppla observationerna till scenario och princip. Skilj mellan innehållsfel, fel i anpassning, data-/analysfel, gränssnittshinder och en otillräcklig produktregel; flera kan samverka. Skilj observerat händelseförlopp från antagen orsak.

En tydlig avvikelse blir ett konkret acceptansfall i syntetisk miljö. En pedagogisk tveksamhet blir en beslutspunkt för Simon. Ett fungerande förlopp blir daterat underlag med angiven omfattning. Ändra inte trösklar eller produktmål automatiskt utifrån ett enda pass.

## 5. Tom verifieringspost för kommande arbete

`Scenario-ID | kontraktsversion | appversion | miljö/metod | förutsättningar och händelser | förväntat elevutfall | förväntat lärarutfall | faktiskt utfall | begränsning | datum`

Inga godkända utfall är förifyllda. Framtida rapporter ska länka till faktiskt underlag.
