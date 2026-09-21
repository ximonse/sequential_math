# Funktionsramverk — kartläggning och genomförandeplan

Status: **kartläggning v0.6, 2026-09-21; E1 kontrakterat, E2 lokalt implementerat och E3:s automatiska masteryövergång implementerad**.
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
| F2.1 Nästa träningsbeslut — P2/P3/P9, D1/D2 | Ett ansvar fattar nästa beslut från aktuellt behov inom F1. Historiskt belagt kunnande är separat. | `currentNeed`, `scopedSelection`, `adaptiveEngine`, `difficultyAdapter`, sessionsregler | Scoped urval läser nu ett versionsmärkt behov för befästande, utmaning och flerledad återhämtning. Start/warmup och `support` ägs ännu av äldre separata regler; förmågeskattningen finns parallellt kvar. | S2/S3/S4/S7: långa förlopp, långsamma rätt, ihållande fel och återkomst. |
| F2.2 Avancering och bekräftelse — P3/P7, D1 | Automatisk progression; eventuell gratulation efter belagt kunnande, utan elevval. | `adaptationDecision`, `addProblemResult`, `usePracticeCoreActions`, `ProgressionMilestoneOverlay` | Masteryövergången har nu en versionsmärkt ägare och ja/nej-flödet är borttaget. Start, återhämtning och support ligger ännu i andra beslutsställen och hör till F2.1/E3:s fortsättning. | S2/S7: nästa uppgifter och bekräftelse följer samma beslut, även efter omladdning. |
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

### A5 — UI-regeln är avvecklad i E3:s första snitt

[adaptationDecision](../src/lib/adaptationDecision.js) skapar nu ett versionsmärkt beslut exakt när svarspipelinen skapar ett nytt masteryfaktum. Beslutet bevarar ram, evidensreferenser, syfte och reason codes och synkas som egen idempotent händelse. [ProgressionMilestoneOverlay](../src/components/student/ProgressionMilestoneOverlay.jsx) presenterar beslutet efter belägget och har endast `Fortsätt`; tidigare erbjudande-, avböjnings- och bannerflöden är borttagna. Lärarlåst ram blir `hold_frame`, inte ett tyst avancemang. Kvarstående A1 innebär fortfarande att start, återhämtning och support inte ännu har samma ägare.

### A6 — Lärarbilden kan överdriva vad siffrorna betyder

[buildClassMasteryRows](../src/components/teacher/sections/dashboardClassMasteryHelpers.js) sätter saknade nivåer till noll och beräknar snitt över alla operationskolumner. [ClassMasteryLevelPanel](../src/components/teacher/sections/ClassMasteryLevelPanel.jsx) använder snittet som standardsortering. Detta är inte ett jämförbart mått på matematisk förmåga enligt P1/P3. [buildRiskSignals](../src/components/teacher/sections/dashboardAssignmentRiskHelpers.js) skiljer åt aktivitet och prestationssignal men utgår för prestation från samlad vecko-/dagsrättandel utan svårighetskontext. Signalen är därför inte bevis för kunskapsförlust. [studentDailyTrend](../src/lib/studentDailyTrend.js) har däremot neutrala små urval, Stockholmsdagar och ofullständighetsmarkering utan automatiskt utvecklingsomdöme; bevara detta.

### A7 — Befintliga kontroller skyddar främst form, inte hela betydelsen

[assertProblemContract](../src/domains/contracts.js) kontrollerar bland annat nivåfält och att ett facitfält finns, men inte att facit är matematiskt rätt eller att kompetensen överlever lagring. [generatorVariety.test](../src/domains/generatorVariety.test.js) räknar bland annat unika bråkfrågetexter; det bevisar inte varierade svar eller strategier. [bråkgeneratorn](../src/domains/fractions/generate.js) har dessutom en fallback till nivå 1 efter misslyckade försök, men märker returuppgiften med begärd nivå. Det är en latent felväg, inte ett observerat klassrumsutfall.

### A8 — Lagringsskydd och pedagogisk validering är olika saker

[pilotStudentRuntime](../src/lib/pilotStudentRuntime.js) anropar lokal snapshot-/eventlagring före nätverk och kräver ack för skickad batch. [event-API:ts validEntry/applyWalEntry](../api/student/%5BstudentId%5D/events.js) validerar observationens identitet, evidensfält och träningsram. Elevvyn skiljer nu lokal lagring, väntande synk, pågående synk, serverbekräftelse och lokalt lagringsfel. Lärarvyn visar sin egen datakällestatus separat. Detta är komponent- och kontraktsverifierat; autentiserad browserkontroll återstår.

## 4. Genomförandeordning — sammanhängande leveranser

P0 = förutsättning för pålitlig evidens; P1 = nödvändig produktfunktion. Detta är inte en lista där P1 kan utelämnas när P0 är klart.

| Etapp | Leverans och gräns | Beroende / prioritet | Klart först när |
| --- | --- | --- | --- |
| E1 Gemensamma funktionskontrakt — **kontrakterat 2026-09-20** | F1–F6 har preciserats i ett sammanhängande underkontrakt med ägare för varje beslut, lägesmatris, evidensklasser och versionspolicy. Inga nya pedagogiska trösklar har valts. | Klart som dokumenterad baslinje; implementering mäts i E2–E5. | [Funktionskontraktet](FUNCTION_CONTRACTS.md) kopplar A1–A8 till ansvar och acceptansfall utan att påstå verifierad funktion. |
| E2 Tillförlitlig evidenskedja — **lokalt implementerad 2026-09-21** | En representation av vad som tränats och observerats, med kompetens, nivå, läge, ID och regelversion. Kompetensidentitet, evidensklass, träningsram och leveransstatus följer kedjan; äldre underlag delas i kontraktsmärkt, säkert klassificerbart och okänt. | E1, P0 | Kod-/kontraktsgrind passerad. Autentiserad browser-/iPad-kontroll och verkligt avbrottsnät återstår till E5:s samlade leveransgrind. |
| E3 Ett adaptivt beslutsflöde — **första snitt lokalt implementerat 2026-09-21** | Skilj historiskt kunnande från aktuellt behov. Masteryövergång har nu ett versionsmärkt beslut; elevens ja/nej-avancering är avvecklad och gratulation följer belagt kunnande. Start, flerledad återhämtning, support och separat `CurrentNeed` återstår att samla. | E2, P1 | Första snittet täcker automatisk advance/complete/hold och beständighet. E3 är klart först när S1–S4/S7 också täcker långsamma rätt, fortsatt fel och faktisk nästa uppgift genom hela beslutsmodellen. |
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

**Nästa avgränsade arbete: E3:s start- och supportbeslut.** Samla warmup/start och gränsen från ihållande `recover` till `support` i samma regelverk. Exakt när appen ska gå från fortsatt återhämtning till stöd/paus/lärarsignal är en ny pedagogisk avvägning som Simon behöver fastställa; struktur, spårbarhet och regressionsfall gör inte det. Därefter kan den parallella förmågeskattningens roll förenklas. Publicering kräver separat begäran.

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

### E2 — lokalt verifierat tredje snitt 2026-09-21

- Elevens status skiljer nu `local_only`, `pending`, `syncing`, `synced` och lokalt lagringsfel. Väntande nätverkssynk beskrivs uttryckligen som lokalt sparad, inte serverbekräftad.
- Pilotens krypterade eventkö och den äldre helprofil-/WAL-vägen publicerar samma elevspecifika statusövergångar utan att synkfel stoppar fortsatt lokalt arbete.
- Lärarens befintliga datakällepanel är inkopplad och hålls skild från elevens leveransstatus.
- Lärarens datakvalitetsvy summerar kontraktsmärkt, säkert legacyklassificerat och okänt underlag. Okänt underlag blir inte masterybevis.
- Ett återspelningstest kör samma observation genom event-API och helprofilmerge och jämför observations-ID, evidens, träningsram och lärarsammanfattning.

Verifiering: `npm run test` passerade 64 testfiler/295 tester och `npm run build` passerade med oförändrade varningar om browserslist-data och stor bundle. Alla ändrade filer passerade avgränsad ESLint och komponenternas statusbudskap renderades i tester. Full `npm run lint` återstår blockerad av 7 äldre fel och 3 varningar i orelaterade filer. Localhost öppnades, men statusytorna är autentiserade och ingen testfixture finns; ingen riktig elev-/lärarinloggning, iPad-, live- eller produktionsverifiering gjordes.

### E3 — lokalt verifierat första snitt 2026-09-21

- Ett nytt masteryfaktum skapar nu exakt ett `adaptation_decision` enligt regelversion 1. Beslutet bär stabilt ID, syfte, reason codes, operation, från-/nästanivå, träningsram och observationsreferenser.
- Beslutet kan `advance`, `complete_domain` eller `hold_frame`. Ett låst läraruppdrag och taket i ett adaptivt läraruppdrag lämnas inte.
- Händelsen lagras idempotent i elevprofilen, event-API:t och helprofilens adaptiva merge. Okända träningslägen avvisas vid eventgränsen.
- Elevens erbjudande-/ja-/nej-flöde, avböjningshistorik och efterföljande bannerknapp är borttagna. Samma gratulationsyta används efter belagt kunnande och har endast `Fortsätt`.
- I nivåfokus öppnar `Fortsätt` det redan beslutade nästa steget. I sekventiell områdesträning visar ett deterministiskt återspelningstest att nästa kärnuppgift flyttas från nivå 2 till 3 när nivå 1–2 är belagda. Motorns avsiktliga repetitionsmix kan fortfarande lägga in en närliggande lättare uppgift.
- Start, flerledad återhämtning, support och ett separat uttryckligt `CurrentNeed` är inte klara; E3 som helhet är därför fortfarande pågående.

Verifiering: `npm run test` passerade 66 testfiler/301 tester och `npm run build` passerade med de befintliga varningarna om åtta månader gammal Browserslist-data och en bundle över 700 kB. Avgränsad ESLint för samtliga ändrade kod- och testfiler passerade. Full `npm run lint` har oförändrat 7 äldre fel och 3 varningar i orelaterade filer. Ingen autentiserad browser-, iPad-, live- eller produktionsverifiering gjordes i detta snitt.

### E3 — lokalt verifierat andra snitt 2026-09-21

- `CurrentNeed` skiljer nu aktuellt träningsbehov från append-only masteryfakta per kompetens. Tillståndet är versionsmärkt, idempotent, begränsat till 100 historikposter och bevaras genom event-API och helprofilmerge.
- Tre befintliga fel i följd aktiverar `recover`. Till skillnad från tidigare avslutar inte ett ensamt rätt svar återhämtningen; två fullständigt rätta svar krävs innan återgång till `consolidate` på mastery-golvet.
- Scoped urval konsumerar målnivån. Besluts-ID och syfte följer den genererade uppgiften och sparas på nästa observation.
- Återhämtning klampas inom lärarens nivåintervall. Ett låst nivåuppdrag kan därför markeras `recover` utan att appen lämnar ramen.
- `support` och ett gemensamt start/warmupbeslut återstår och kräver nästa avgränsade beslutssnitt.

Verifiering: `npm run test` passerade 67 testfiler/304 tester, `npm run build` passerade med de befintliga Browserslist-/bundlevarningarna och avgränsad ESLint passerade. Den deterministiska sekvensen täcker tre fel, ett rätt, två rätt samt lärarlåst nivå. Ingen autentiserad browser-, iPad-, live- eller produktionsverifiering gjordes.
