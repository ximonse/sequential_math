# Funktionsramverk — kartläggning och genomförandeplan

Status: **kartläggning v0.4, 2026-09-20; E1 kontrakterat och två vertikala E2-snitt lokalt implementerade**.
Styrande riktning: [produktkontrakt v1.0](PRODUCT_CONTRACT.md), inklusive D1–D3.
Acceptansfall: [S1–S10](PRODUCT_SCENARIOS.md).
Funktionsregler: [funktionskontrakt F1–F6](FUNCTION_CONTRACTS.md).
Kodbas: lokal commit `1465615a7ad8dddeb710db99f12c6086ab5ab8ba`.

## 1. Slutsats och granskningsgräns

Appen saknar inte alla byggstenar: domängränssnitt, körbara formkontroller, gemensamma masteryfunktioner, historiska masteryfakta, händelselagring och försiktigt utformad dagstrend finns. Problemet är att ansvar och betydelse inte är konsekventa mellan byggstenarna. En korrekt lokal beräkning kan därför användas för fel kompetens, styra fel nästa steg eller bli en missvisande lärarsignal.

Det behövs ett sammanhängande funktionellt ramverk ovanpå och genom befintlig kod, inte ett nytt UI-/databasramverk eller en fristående guardian som ensam försöker korrigera allt i efterhand.

Det ursprungliga kartläggningsunderlaget var en statisk granskning av de namngivna funktionerna och deras anropsvägar. E2-snitten nedan har därefter verifierats lokalt med tester och build, men inga servrar, elevkonton, nätverksanrop eller produktionskontroller har körts. Alla generatorer, exportvägar och verklig browser-/iPad-användning är inte fullständigt granskade. Därför är helhetsfunktionen **inte verifierad**. Äldre dokument och testnamn räknas inte som aktuella testresultat.

## 2. Ansvarskarta uppifrån och ned

Alla krav nedan tjänar både M1 och M2. Krav-ID:n identifierar nästa underkontrakt; de är inte påståenden om färdig funktion. Kodägare betyder ansvarig modul, inte en namngiven person.

| Krav / ansvar | Avsett kontrakt | Nuvarande kodägare / flöde | Avvikelse eller kvarstående kontroll | Acceptans |
| --- | --- | --- | --- | --- |
| F1.1 Träningsram — P1/P7, D3 | Ett entydigt läge, fokus, tillåten nivåram och uppdragsidentitet följer sessionen. Konflikter avgörs uttryckligt. | `usePracticeSetupEffects` → `getSessionRules` → `resolveScopedSelection` | Ramkontroll finns, men URL-läge/tabeller rensar uppdrag före tilldelning; prioritet och ogiltiga kombinationer behöver ett gemensamt kontrakt. NCM/tabell/fri träning har separata vägar. | S1/S7/S9: lägesmatris, även konflikt mellan uppdrag och URL. |
| F2.1 Nästa träningsbeslut — P2/P3/P9, D1/D2 | Ett ansvar fattar nästa beslut från aktuellt behov inom F1. Historiskt belagt kunnande är separat. | `scopedSelection`, `adaptiveEngine`, `difficultyAdapter`, sessionsregler | Nivågolv från mastery och separat förmågeskattning konkurrerar. Scoped urval läser inte skattningen. Återhämtning begränsas till golv minus ett utanför warmup. | S2/S3/S4/S7: långa förlopp, långsamma rätt, ihållande fel och återkomst. |
| F2.2 Avancering och bekräftelse — P3/P7, D1 | Automatisk progression; eventuell gratulation efter belagt kunnande, utan elevval. | `shouldOfferSteadyAdvance`, `usePracticeCoreActions`, `usePracticeBreakActions`, `AdvancePromptOverlay` | Nuvarande erbjudande och ja/nej-flöde motsäger D1. Att bara ta bort dialogen löser inte F2.1 eller evidensreglerna. | S2/S7: nästa uppgifter och bekräftelse följer samma beslut, även efter omladdning. |
| F3.1 Uppgiftskontrakt — P1/P3/P5 | Innehållsmål, kompetens, steg, svarskrav och relevant variation är uttryckliga och överlever hela kedjan. | domänregistret/generatorer, `contracts`, `createTableProblem`, `hiddenDecimalPolicy` | Formkontrakt finns men kontrollerar inte matematiskt facit, evidensidentitet eller avsedd variation. Tabellkön genererar utanför motorns vanliga genereringsväg. | S9/S10: oberoende facit, innehållsvariation och alla ingångar. |
| F4.1 Svarshändelse — P3/P4/P5/P9 | Bedömning och rå observation hålls åtskilda, med tillräckligt sammanhang för senare tolkning. | `addProblemResult`, domänens evaluate/analyzeError, `usePracticeCoreActions`, `trainingContext` | Observationen bär nu versionsmärkt kompetens- och träningskontext genom båda lagringsvägarna. Partiellt rätt finns, men kvarvarande summeringar måste fortfarande granskas mot etiketten. Lägesprioritet och konfliktbeslut hör till F1/E3 och är ännu inte ändrade. | S5/S8/S9/S10: samma svar och kontext genom alla konsumenter. |
| F5.1 Kunskapsläge — P3/P5/P8, D2 | Historiskt belagt kunnande och aktuellt behov härleds enligt versionsbestämda regler från identifierbart underlag. | `masteryCalculation`, `studentProfile`, `teacherSummary` | Delad modul finns, men tavlor och masteryöversikt använder olika nivåfält/faktakällor. Läsberäkningar kan skriva nya masteryfakta. Fakta saknar regelversion och referenser till belägg. | S4/S8/S9: återspelning ger samma innebörd, läsning skapar inte oavsiktligt nya beslut. |
| F5.2 Kontinuitet — P5/P8 | Bekräftad observation bevaras en gång med samma innebörd; fel/äldre underlag får uttrycklig status. | `pilotStudentRuntime`/store → event-API; äldre `saveProfile`/WAL; server → lärarprofil | Kö och ack finns. Eventgränsen validerar inte hela pedagogiska kontraktet. Hela merge-/återläsningskedjan återstår att verifiera; detta är ingen konstaterad generell dataförlust. | S8/S9: båda vägarna, retry, avbrott, äldre profil, ofullständig historik. |
| F6.1 Lärarsignal — P1/P3/P4/P5/P6 | Innehåll, period, omfattning, svårighet, osäkerhet och möjlig uppföljning följer signalen. | `teacherSummary`, `dashboardAssignmentRiskHelpers`, mastery-/detaljpaneler, `studentDailyTrend` | Nivåsnitt blandar olika kompetenser och okänt med noll. Risksignal använder samlad rättandel utan svårighetskontext. Dagstrenden är en användbar försiktig byggsten att behålla. | S5/S6/S8/S9: ökad svårighet, små urval, otränade områden och samma urval i detalj/lista/export. |

## 3. Konkreta belägg och konsekvenser

### A1 — Träningsval och kunskapsskattning har olika auktoritet

[resolveScopedSelection](../src/engine/scopedSelection.js) väljer lägsta omastrade nivå. [sampleTrainingLevel](../src/engine/adaptiveEngine.js) väljer warmup, annars golv minus ett vid minst tre fel, annars ett slumpat närliggande steg. [handleSubmit](../src/components/student/session/usePracticeCoreActions.js) uppdaterar samtidigt `adjustDifficulty` utanför tabell-/nivåfokus. Den uppdaterade förmågeskattningen används inte av scoped nivåval. Efter ett rätt svar upphör sammanhängande felsvit att hålla kvar återhämtningen. **Konsekvens:** enbart finjusterad `adjustDifficulty` reparerar inte detta urval.

### A2 — Decimalers betydelse ändras vid registrering

[resolveProblemOperation](../src/lib/mathUtils.js) prioriterar `metadata.evidenceSkill` på den genererade uppgiften. [addProblemResult](../src/lib/studentProfile.js) sparar detta som `operation` men behåller förälderns `skill` och sparar inte `evidenceSkill`. Vid ny upplösning godtas inte `positions_decimal` i den explicita operationslistan; förälderns `skill` används i stället. `evidenceLevel` finns däremot kvar. **Konsekvens:** decimalunderlag kan räknas till förälderns heltalskompetens på decimalens interna nivå. Därför måste rättningen täcka registrering, återläsning, mastery och lärarbild tillsammans.

### A3 — Tabellträning kan bli belägg för generell multiplikationsnivå

[createTableProblem](../src/components/student/session/sessionUtils.js) märker tabelluppgifterna med konceptuell nivå 4. Alla svar går genom `addProblemResult`, vars masteryberäkning saknar lägesundantag. Att sessionen hoppar över `adjustDifficulty` för tabellträning hindrar inte denna masteryregistrering. **Konsekvens:** tabellflyt behöver ett uttryckligt evidenskontrakt; en separat tabellavslutningsmarkering räcker inte.

### A4 — Gemensam fil innebär inte gemensam semantik

I [masteryCalculation](../src/lib/masteryCalculation.js) använder grupperingen `evidenceLevel` före konceptuell nivå. `computeOperationMasteryBoards` använder däremot konceptuell nivå. Översikt/effektiva nivåer tar hänsyn till historiska fakta; tavlorna beräknar status från svarsfönster. `computeMasteryOverview` och `computeEffectiveLevels` kan dessutom registrera fakta vid läsning. **Konsekvens:** samma underlag kan ge olika besked. D2 kräver tydliga begrepp för historiskt belagt och aktuell prestation, inte att alla vyer visar samma siffra.

### A5 — Gränssnittet bär fortfarande en egen progressionsregel

[AdvancePromptOverlay](../src/components/student/AdvancePromptOverlay.jsx) frågar om eleven vill prova nästa nivå. [handleAdvanceDecision](../src/components/student/session/usePracticeBreakActions.js) ändrar förmågeskattning vid ja. [shouldOfferSteadyAdvance](../src/lib/difficultyAdapter.js) har egen urvals-/tröskellogik, medan mastery räknas före erbjudandet. Detta är både en D1-avvikelse och ett ytterligare beslutsställe. Ny bekräftelse ska konsumera ett redan fattat kunskapsbeslut, inte själv avgöra nästa svårighet.

### A6 — Lärarbilden kan överdriva vad siffrorna betyder

[buildClassMasteryRows](../src/components/teacher/sections/dashboardClassMasteryHelpers.js) sätter saknade nivåer till noll och beräknar snitt över alla operationskolumner. [ClassMasteryLevelPanel](../src/components/teacher/sections/ClassMasteryLevelPanel.jsx) använder snittet som standardsortering. Detta är inte ett jämförbart mått på matematisk förmåga enligt P1/P3. [buildRiskSignals](../src/components/teacher/sections/dashboardAssignmentRiskHelpers.js) skiljer åt aktivitet och prestationssignal men utgår för prestation från samlad vecko-/dagsrättandel utan svårighetskontext. Signalen är därför inte bevis för kunskapsförlust. [studentDailyTrend](../src/lib/studentDailyTrend.js) har däremot neutrala små urval, Stockholmsdagar och ofullständighetsmarkering utan automatiskt utvecklingsomdöme; bevara detta.

### A7 — Befintliga kontroller skyddar främst form, inte hela betydelsen

[assertProblemContract](../src/domains/contracts.js) kontrollerar bland annat nivåfält och att ett facitfält finns, men inte att facit är matematiskt rätt eller att kompetensen överlever lagring. [generatorVariety.test](../src/domains/generatorVariety.test.js) räknar bland annat unika bråkfrågetexter; det bevisar inte varierade svar eller strategier. [bråkgeneratorn](../src/domains/fractions/generate.js) har dessutom en fallback till nivå 1 efter misslyckade försök, men märker returuppgiften med begärd nivå. Det är en latent felväg, inte ett observerat klassrumsutfall.

### A8 — Lagringsskydd och pedagogisk validering är olika saker

[pilotStudentRuntime](../src/lib/pilotStudentRuntime.js) anropar lokal snapshot-/eventlagring före nätverk och kräver ack för skickad batch. [event-API:ts validEntry/applyWalEntry](../api/student/%5BstudentId%5D/events.js) kontrollerar bland annat ID/tid/rättboolean för svar och operation/nivå för mastery, men inte hela innehålls-/evidensrelationen. `handleSubmit` väntar på `persistEvent` men hanterar inte dess `{ ok: false }` i den granskade svarsvägen; återkoppling sätts tidigare. **Fortsatt kontroll:** precisera och verifiera lokalt sparat kontra serversynkat i gränssnittet. Inget påstående här om att den lokala kön tappar svaret eller att andra UI-vägar saknar status.

## 4. Genomförandeordning — sammanhängande leveranser

P0 = förutsättning för pålitlig evidens; P1 = nödvändig produktfunktion. Detta är inte en lista där P1 kan utelämnas när P0 är klart.

| Etapp | Leverans och gräns | Beroende / prioritet | Klart först när |
| --- | --- | --- | --- |
| E1 Gemensamma funktionskontrakt — **kontrakterat 2026-09-20** | F1–F6 har preciserats i ett sammanhängande underkontrakt med ägare för varje beslut, lägesmatris, evidensklasser och versionspolicy. Inga nya pedagogiska trösklar har valts. | Klart som dokumenterad baslinje; implementering mäts i E2–E5. | [Funktionskontraktet](FUNCTION_CONTRACTS.md) kopplar A1–A8 till ansvar och acceptansfall utan att påstå verifierad funktion. |
| E2 Tillförlitlig evidenskedja — **pågår** | En representation av vad som tränats och observerats, med kompetens, nivå, läge, ID och regelversion. De två första snitten bevarar kompetensidentitet, klassar tabellträning separat, gör mastery-läsning bieffektsfri och låter träningsram/uppdragskontext följa observationen genom båda lagringsvägarna. | E1, P0 | Kvar: synkstatus i UI, samlad återspelning av S8/S9/S10 och kartläggning av äldre klassificerbar kontra osäker historik. |
| E3 Ett adaptivt beslutsflöde | Skilj historiskt kunnande från aktuellt behov. Samla beslut om start, befästande, utmaning, återhämtning och stöd inom uppdragsram. Avveckla elevens ja/nej-avancering; låt eventuell gratulation följa belagt kunnande. | E2, P1 | S1–S4/S7 körs som långa återspelbara förlopp, inklusive långsamma rätt och fortsatt fel på lättare innehåll. Nästa uppgift styrs faktiskt av beslutet. |
| E4 Tolkningsbar lärarbild | Separera historik, aktuell prestation, aktivitet och hypoteser. Rätta nivåsnitt/okänt-noll och ge prestationssignaler innehålls-/svårighetskontext. Kontrollera lista, detalj och export för samma urval. | E2; slutverifiering med E3, P1 | S5/S6/S8/S9 visar konsekventa besked och försiktiga slutsatser. Lärare kan hitta underlag och välja uppföljning. |
| E5 Innehåll och samlad kvalitetsgrind | Granska progression per domän, matematiskt facit, relevant variation, svarskrav och fallbackbeteende. Utöka befintliga kontraktskontroller och återspelningsfall; verifiera hela elev–lärarkedjan. | Börjar med motexempel i E1/E2, avslutas efter E3/E4; innehållsfel P0 | S1–S10 har daterat resultat och begränsningar. Tester/build samt relevanta browser-/iPad-flöden är kontrollerade. Ingen automatisk publicering. |

E2 ska leverera en tunn men komplett vertikal kedja, inte en total omskrivning innan något kan verifieras. Varje etapp behåller befintliga fungerande delar och kompletterar dem med regressionsfall. Generatorproblemen som redan noterats blir motexempel i E5, inte nya fristående småfixprojekt.

## 5. Guardian som kontrollansvar, inte ny pedagogisk auktoritet

- **Före visning:** kontrollera uppgift mot innehållsmål och träningsram. En fallback får inte byta innehåll men behålla fel etikett. Vid fel: begripligt stopp/ny giltig uppgift enligt fastställd policy, inte falsk evidens.
- **Vid registrering/återläsning:** validera samma kompetens-, nivå- och versionsbetydelse. Okänt/äldre underlag markeras och får inte tyst bli bevis för en annan kompetens.
- **Före leverans:** återspela elevförlopp genom riktiga produktionsfunktioner och jämför både nästa uppgift och lärarbild med oberoende förväntningar. Enbart ögonblicksbilder av vald nivå räcker inte.
- **Vid användning:** skilj lokalt sparat, väntande synk, begränsat underlag och pedagogiskt stödbehov. Klassobservationer prövar upplevelsen och signalernas nytta; de ändrar inte regler automatiskt.

Detta är föreslagna kontrollpunkter, inte en implementerad tjänst. Återanvänd befintliga validerare och lagringsskydd där de passar. En guardian ska upptäcka kontraktsbrott, inte själv hitta på svårighetsregler eller analysera elever med en ny AI-tjänst.

## 6. Äldre data, dokument och verifieringsbevis

Historiska felaktiga masteryfakta får inte bara raderas eller omtolkas. E2 måste först avgöra vad sparade observationer faktiskt kan belägga, vad som går att räkna om och vad som måste märkas osäkert. Schema-/regelversion och ursprungligt underlag ska hållas isär. Ingen elevdatamigrering är auktoriserad eller utförd här.

Äldre överlappande dokument ska därefter hänvisa till rätt auktoritet: `PROGRESSION_LOGIC.md` för F2, `data-flow.md` för F1/F4/F5, `LARARDASHBOARD_LOGIK.md` för F6 och `ARCHITECTURE.md` för teknisk ansvarsfördelning. Historiska utvärderingar behåller datum och får inte bli leveransbevis. Projektkonstitutionens kategoriska felorsaker och äldre nivåerbjudande ska anpassas till P4/D1 i samma dokumentationsetapp.

För varje etapp sparas: krav-ID → scenario → app-/regelversion → miljö → metod → faktiskt resultat → begränsning. Befintliga tester är kandidater att återanvända, inte redan godkända resultat för det nya kontraktet. Efter kodändringar krävs repoets test/build-kontroller; UI-flöden verifieras separat. Klasspasset använder [observationsmallen](PRODUCT_SCENARIOS.md) utan att framkalla fel eller samla nya personuppgifter.

**Nästa avgränsade arbete: slutför E2.** Nästa snitt gör leveransstatus synlig och tolkningsbar, återspelar S8/S9/S10 genom event- och helprofilvägen och redovisar vilken äldre historik som kan klassificeras respektive måste förbli osäker. Simon behöver bara avgöra nya pedagogiska avvägningar; modulplacering, spårbarhet och relevanta regressionsfall är implementationens ansvar. Publicering kräver separat begäran.

### E2 — lokalt verifierat första snitt 2026-09-20

- Aritmetikuppgifter bär ett versionsmärkt evidence claim; sparade observationer bevarar innehållskompetens, evidenskompetens/-steg, evidensklass och stabilt observations-ID.
- Dold decimalevidens överlever serialisering och räknas till `positions_decimal`, inte förälderns heltalsnivå.
- Tabellträning, inklusive igenkännbar legacyform, är `practice_only` för generell multiplikationsmastery men finns kvar för tabellernas egna analyser.
- Masteryöversikt och lärartavlor använder samma evidenssteg. Läsning av översikter skapar inte längre masteryfakta; nya fakta skapas i svarspipelinen med regelversion och observationsreferenser.
- Constraint-fallback från aritmetikgeneratorn märks `invalid` som kunskapsevidens. Visningsstopp/ny kandidat enligt guardian-kontraktet återstår.
- Elevhändelse-API:t validerar de nya evidensfälten, deduplicerar stabilt observations-ID när det finns och bevarar masteryfaktats regelversion/referenser.

### E2 — lokalt verifierat andra snitt 2026-09-20

- Varje nytt svar bär en validerad, versionsmärkt träningsram: fri adaptiv träning, områdesfokus, nivåfokus, adaptivt eller låst läraruppdrag, NCM-uppdrag eller tabellträning.
- Ramen innehåller sessions-ID, källa, uppdrags-ID/-typ, tillåtna kompetenser, nivåintervall, tabellurval och progressionsläge. Den beskriver det faktiskt validerade körläget; en okänd URL-parameter märks inte som ett giltigt fokus.
- Samma kontext bevaras i lokalt resultat, elevhändelse/API och helprofilens merge. Eventgränsen avvisar okända lägen eller ofullständiga kontrakt.
- Legacyobservationer med igenkännbar kompetens/nivå kan fortfarande klassificeras. Oklassificerbara poster blir `invalid` och får inte tyst räknas som masteryunderlag.
- Ingen prioritet mellan konkurrerande uppdrag/URL-lägen ändrades i detta snitt; det beslutet hör till F1/E3.

Verifiering: `npm run test` passerade 60 testfiler/287 tester och `npm run build` passerade med varningar om åtta månader gammal browserslist-data och en bundle över 700 kB. Avgränsad ESLint för alla ändrade kod- och testfiler passerade. Repoets fulla `npm run lint` är blockerad av 15 redan incheckade fel och 3 varningar i orelaterade filer; de är inte åtgärdade eller dolda i detta snitt. Ingen browser-, iPad-, live- eller produktionsverifiering är gjord.
