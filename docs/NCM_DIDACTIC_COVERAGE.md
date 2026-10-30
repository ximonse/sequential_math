# NCM: full täckningsinventering och kodjämförelse

Datum: 2026-10-30. **Lokalt planeringsunderlag, ingen ändrad analys eller elevprocess.**

## Vad som faktiskt är täckt

Senare tillägg samma dag: [domängemensam regelgenomgång](NCM_RULE_READINESS.md)
klassificerar alla sex domäners 33 befintliga signalposter och visar de nya
offlinekandidaterna för växling genom noll. Kodjämförelsen nedan beskriver
den ursprungliga inventeringen, inte ett påstående att senare kod är oförändrad.

Hela [Claudes referens](SCREENING_SELECTION_PRINCIPLES.md), commit 08a0101, är inventerad: 11 huvudavsnitt, 30 mappningsrader, nio numrerade luckor (åtta nya kandidater och en nyans), sju begreppspunkter (den sista överlappar G4), tre nyanser och sex AG6-strategisteg. Inget av detta är ett påstående om full täckning av all matematik eller att samtliga NCM-facit lästs.

[Maskinläsbar täckningslista](NCM_DIDACTIC_COVERAGE.json) bevarar varje mappningsrads formulering, förkunskaper, källmotivering, radnummer, status och kodgranskningskommentar. Referensens SHA256 är lagrad. Även samtliga 126 rader i denna checkouts NCM-CSV är upptagna; de som inte ingår i de 30 mappningarna är uttryckligen kvar som kompletterande innehåll/förkunskaper att pröva, inte tyst bortvalda. JSON-filen är en inventering, **inte en färdig runtime-katalog att validera diagnoser mot**.

Kodjämförelsen omfattar alla sex domäners analyzeError, aritmetikens fem hypotesfiler samt screeningens observation, rutnätsregel och elevunderlag. De lästa analysfilerna är oförändrade jämfört med origin/master vid inventeringen; screeningDraft.js skiljer sig men används inte som belägg för felanalys.

## Status och källnivå

- **Delvis kodstöd:** signalen eller svarsrättningen finns. Det fastställer inte elevens metod eller en NCM-diagnos.
- **Kräver mer kontext:** en bred signal kan inte motivera den specifika slutsatsen.
- **Återstår:** inventerat innehåll som saknar tillräckligt stöd för automatisering.
- **Pilotförslag:** används i pilotdesignen; inte en implementerad automatisk process.
- **Källkontroll är en egen dimension:** referensens ”verifierat” betyder Claudes redovisade kontroll. Denna inventering har själv kontrollerat pilotlänken AS2→AG3 i lokala facit-PDF:er. Övriga pedagogiska källpåståenden är bevarade med ursprung, inte omstämplade som nygranskade.

## Samtliga 30 mappningar

| ID | Referens | NCM / sammanhang | Status | Vad koden faktiskt ger |
|---|---|---|---|---|
| M01 | [§5 rad 119](SCREENING_SELECTION_PRINCIPLES.md#L119) | AS1 | Delvis kodstöd | Addition: matchning av felsvar finns; carryCount krävs. carry_double använder +10 per övergång, inte full positionsmodell. |
| M02 | [§5 rad 120](SCREENING_SELECTION_PRINCIPLES.md#L120) | AS2 | Pilotförslag | Två åtskilda svarshypoteser finns. borrow_forget betyder specifikt noll i omöjlig kolumn. Screeningens rutnätsregel är separat och uppgiftsspecifik. |
| M03 | [§5 rad 126](SCREENING_SELECTION_PRINCIPLES.md#L126) | AG6 | Delvis kodstöd | Tabellgranne och endast entalsprodukt finns; det senare är inte i sig belägg för AG6-brist. |
| M04 | [§5 rad 127](SCREENING_SELECTION_PRINCIPLES.md#L127) | AS4 | Delvis kodstöd | Slutsvarsmotor finns; generell tolkning av delprodukter i skriftlig metod saknas. |
| M05 | [§5 rad 128](SCREENING_SELECTION_PRINCIPLES.md#L128) | AG8 | Delvis kodstöd | Fyra svarsmatchningar finns. Tabellbrist/rollförväxling kräver kontrast; en kvot ±1 fastställer inte mekanism. |
| M06 | [§5 rad 129](SCREENING_SELECTION_PRINCIPLES.md#L129) | AS5 | Återstår | Ingen generell analys av skriftlig divisionsmetod. |
| M07 | [§5 rad 141](SCREENING_SELECTION_PRINCIPLES.md#L141) | RD1 | Kräver mer kontext | Skalningssignal är inte en ordnings-/storleksjämförelse. Kan inte härleda längre-decimal-är-större från signalen. |
| M08 | [§5 rad 142](SCREENING_SELECTION_PRINCIPLES.md#L142) | RD2 | Kräver mer kontext | Bred skalningssignal; ingen säker uppdelning mellan decimalplacering, räknefel och begreppsbrist. |
| M09 | [§5 rad 143](SCREENING_SELECTION_PRINCIPLES.md#L143) | RD3 | Kräver mer kontext | Samma breda signal kan överlappa med fel nollantal eller decimalregel. |
| M10 | [§5 rad 144](SCREENING_SELECTION_PRINCIPLES.md#L144) | AS1/AS2 (add/sub-kontext) eller AS4 (mult-kontext) | Kräver mer kontext | Uppgiftens räknesätt, representation och platsvärde måste finnas; signalnamnet räcker inte. |
| M11 | [§5 rad 150](SCREENING_SELECTION_PRINCIPLES.md#L150) | RB1 | Kräver mer kontext | wrong_denominator jämför nämnaren med facit, prövar inte nämnarens begreppsliga innebörd. |
| M12 | [§5 rad 151](SCREENING_SELECTION_PRINCIPLES.md#L151) | RB2 | Kräver mer kontext | Samma signal kan inte särskilja täljarens funktion från nämnarfel. |
| M13 | [§5 rad 152](SCREENING_SELECTION_PRINCIPLES.md#L152) | RB3 | Återstår | Kräver uppgiftskontext/kontrast; ingen egen signal i referensen. |
| M14 | [§5 rad 153](SCREENING_SELECTION_PRINCIPLES.md#L153) | RB4 | Kräver mer kontext | Nämnaravvikelse räcker inte för storleksjämförelse eller likvärdighet. |
| M15 | [§5 rad 154](SCREENING_SELECTION_PRINCIPLES.md#L154) | RB5 | Återstår | Bråkmotor finns men ingen separat mekanismsignal för räkna täljare/nämnare var för sig. |
| M16 | [§5 rad 155](SCREENING_SELECTION_PRINCIPLES.md#L155) | RP1 | Kräver mer kontext | wrong_percentage ges för alla felaktiga procentsvar; ingen proportionalitetsmekanism verifieras. |
| M17 | [§5 rad 156](SCREENING_SELECTION_PRINCIPLES.md#L156) | RP3 | Kräver mer kontext | Samma generiska signal; kräver bråk-/decimal-/procentkontraster. |
| M18 | [§5 rad 157](SCREENING_SELECTION_PRINCIPLES.md#L157) | RP4 | Kräver mer kontext | Samma generiska signal; kräver preciserad procentsituation. |
| M19 | [§5 rad 163](SCREENING_SELECTION_PRINCIPLES.md#L163) | **TAu2** (uttrycks värde — beräkna ett uttryck för givet x) | Delvis kodstöd | Tre algebrasignaler finns, men added_instead_of_multiplied testar nivåstyrt 2+n/3+n; uttryckets faktiska koefficient måste kontrolleras. |
| M20 | [§5 rad 164](SCREENING_SELECTION_PRINCIPLES.md#L164) | **TAu3** (förenkling av uttryck) | Kräver mer kontext | did_not_simplify/forgot_constant/combined_unlike_terms/simplify_error finns i algebra. not_simplified kommer från bråk och är inte en algebraalias. |
| M21 | [§5 rad 165](SCREENING_SELECTION_PRINCIPLES.md#L165) | — (ingen exakt NCM-kod) | Kräver mer kontext | wrong_order_of_operations ges för alla fel i uttrycksdomänen; inte verifierad felprioritering. Ingen exakt NCM-kod tvingas fram. |
| M22 | [§5 rad 166](SCREENING_SELECTION_PRINCIPLES.md#L166) | TAe1 | Återstår | Ingen separat ekvationsfelsmotor i lästa domäner; referensens ekvationskedja hålls skild från uttryck. |
| M23 | [§5 rad 167](SCREENING_SELECTION_PRINCIPLES.md#L167) | TAe2 | Återstår | Samma; TAe1→TAe2 är i referensen en rimlig, inte explicit belagd, förkunskapslänk. |
| M24 | [§5 rad 188](SCREENING_SELECTION_PRINCIPLES.md#L188) | AS3 | Kräver mer kontext | Texttolkning, räknesättsval och skriftlig beräkning måste skiljas. operation_swap ensam bevisar inget av dem. |
| M25 | [§5 rad 189](SCREENING_SELECTION_PRINCIPLES.md#L189) | AS6 | Kräver mer kontext | Samma skillnad för multiplikation/division. |
| M26 | [§5 rad 190](SCREENING_SELECTION_PRINCIPLES.md#L190) | AS9 | Delvis kodstöd | Svarsrättning och skalningssignal finns, men inte full metodanalys för decimaluppställning. |
| M27 | [§5 rad 191](SCREENING_SELECTION_PRINCIPLES.md#L191) | AS7 | Återstår | Generell delproduktanalys saknas; inte automatiskt diagnostiserbar från slutsvar. |
| M28 | [§5 rad 192](SCREENING_SELECTION_PRINCIPLES.md#L192) | AS8 | Återstår | Tvåsiffrig divisor kräver särskilt innehåll/metodunderlag. |
| M29 | [§5 rad 193](SCREENING_SELECTION_PRINCIPLES.md#L193) | AS10 | Återstår | Saknar generell delprodukt- och decimalmetodanalys. |
| M30 | [§5 rad 194](SCREENING_SELECTION_PRINCIPLES.md#L194) | AS11 | Återstår | Saknar generell divisions- och decimalmetodanalys. |

## Alla övriga innehållsgrupper

| Grupp | Fullständigt innehåll / hantering |
|---|---|
| N1–N3 | Sifferomkastning kan vara positionssvårighet; större-minus-mindre per kolumn; arbetsminnesbelastning får inte avfärdas som slarv. Alla bevarade. N2 används i pilotförslaget. |
| G1–G3 | Sammanfogade kolumnsummor; distributiva lagen missförstådd; additionskolumner överförda till multiplikation. Ingen generell upptäckt av dessa metoder finns. |
| G4–G6 | Bråkkomponenter räknas separat; fel decimalantalsregel; fel nollantal. Befintliga nämnar-/skalningssignaler kan överlappa men inte bevisa mekanismen. |
| G7–G9 | Skutträkning; × alltid större/÷ alltid mindre; språkligt omvänd division. G7/G9 har delvis befintliga svarsmatchningar; orsakerna återstår att särskilja. |
| B1–B3 | Nämnarstorlek; två motsatta decimalstorleksregler; decimalekvivalens och täthet. Inte upptäckta genom att bara jämföra facit. B3:s två delpåståenden ska skiljas i kommande frågebank. |
| B4–B7 | Procentenheter; successiva procentändringar; procent av delar/helhet; bråkkomponentfel (samma mekanism som G4). Separata kontraster behövs. |
| T1–T6 | AG6:s ×2, ×4, ×3, ×6, ×5 och 7/8/9-steg finns som bevarad progression. Individuell uppgiftskoppling återstår. |
| Utan automatisk NCM-kod | digit_reversal, calculation_error, wrong_answer, no_answer, invalid_input. operation_swap kräver separat hantering av textuppgift kontra ren beräkning. |
| AF, AUn1–4, AUp1–5 | Kvar som uttryckliga gränser/luckor. Muntligt material, negativa tal och potenser/rötter saknar generell felmotor; algebraregeln square_as_double är bara smalt överlapp. |
| Kod utöver referensen | number_bond_not_recalled och double_not_recalled finns i talflytsdomänen. Behöver egen didaktisk källkoppling. |
| Övriga källområden | Geometri, mätning, statistik och andra katalogkoder finns kvar i CSV-inventeringen. McIntosh kap 7/22, aktiviteter och elevintervjuer/tester är enligt referensen ännu inte genomlästa. Ingen sådan täckning påstås. |

## Principer: hela referensen styr nästa steg

| Avsnitt | Beslut för fortsatt arbete |
|---|---|
| §0 | Hela ryggraden är standard. Avvikelse behöver motivering, inte en påtvingad felkod. |
| §1 | Behåll skillnaden observation / befintlig signal / tolkning. Katalogmedlemskap räcker inte; signalförankring räcker heller inte ensam för en mer specifik kausal slutsats. |
| §2 | Väg metodunderlag från räknehäfte och bredd/stabilitet från träning efter vad de faktiskt visar. Nyare relevanta motexempel och ändrad svårighet beaktas. Ingen fast ”screening slår alltid träning”-vikt. |
| §3 | Kort pilot, 3–5 frågor, högst 1–2 hypoteser. Bred översikt över flera områden kräver egen totalbudget; detta är inte ett universellt max för hela kartläggningen. |
| §4 | Kontrollera att rätt svar och modellerade felsvar skiljs åt. Undersök även kollisioner och tidiga träffar i den verkliga motorn. |
| §5 | Alla M01–M30 finns ovan med status, sammanhang och bevarad förkunskapskedja. |
| §5b | Alla N/G/B/T-poster bevarade; inga automatiska orsaksbesked utifrån en bred signal. Begreppspunkterna är inte principiellt ”omöjliga att koda”, bara inte implementerade med nödvändiga frågor idag. |
| §6 | Vid osäkerhet prövas relevant förkunskap; fastna inte i fler likadana frågor. Ingen data är okänt, inte en kunskapsbrist. |
| §7 | Befintlig fråga först när den prövar rätt sak, annars egen kontrast med kontrollerat facit. Fritext lärarbedöms. Räknehäfte väljs efter syfte. |
| §8 | Kontextberoende platsvärdesmappning, källnivå och katalogavvikelser är synliga kvarstående punkter. |
| §9 | Verkligt exempel, felmotorns träffbild, maskinläsbar katalog och servervalidering är separata steg. Låg andel fallback räcker inte som bevis på bra upptäckt: generiska eller felaktiga signaler kan dölja luckor. |

## Fynd som påverkar automatisk kartläggning

1. **NCM-diagnoskod, appsignal och missuppfattning är tre olika saker.** AS2 är ett innehållsområde/diagnos, inte en säker felorsak. place_value_error kan inte ensam motivera dec_longer_is_larger. Samma förankrade breda signal kan stödja en fråga men inte en mer specifik diagnos.
2. **Tre generiska etiketter är särskilt riskabla:** wrong_percentage ges för alla fel i procentdomänen; wrong_order_of_operations för alla felaktiga numeriska uttryckssvar; wrong_denominator jämför bara nämnaren med facit. Inga av dem särskiljer de begrepp som referensen räknar upp.
3. **Träning och screening har olika analysytor.** Träningens patterns sparas i elevunderlaget. Screeningexporten sätter för närvarande interpretation.patterns till tom lista. Rutnätsregeln större-minus-mindre gäller bara exakt 402−178 och kodas larger_digit_minus_smaller_per_column. Den är inte generellt tillgänglig som träningsmotorns smaller_minus_larger. Samma supportRef-regel kan därför inte bara återanvändas oförändrad mellan källorna.
4. **Konkret falsk specificitet:** 13−8 med elevsvar 2 får place_value_error eftersom kvoten 0,4 passerar en bred tolerans runt 0,1/0,01. Det är inte en faktisk ×10/÷10-förskjutning. [Syntetiskt funktionsprov](evaluations/ncm-didactic-2026-10-30/synthetic-probes.json) bevarar reproduktionen. Ingen appkod har rättats inom inventeringen. Automatisk kausal förgrening på denna signal är inte klar.
5. **Rätt svar garanterar inte rätt metod.** Motorn returnerar direkt vid rätt slutsvar och analyserar inte felaktig metod bakom ett råkat rätt svar. Därför behövs särskiljande uppgift och ibland synlig uträkning.
6. **Begränsade delmodeller:** carry_double räknar +10 per övergång oberoende av position; borrow_forget modellerar specifikt noll i en kolumn. Algebraregelns nivåheuristik kan inte ersätta kontroll av det faktiska uttrycket. Alla signaler kräver domän- och representativitetskontroll före användning som automatiska beslut.
7. **Källredovisningen behöver skärpas:** CSV:n är prefixheuristisk, inte en facitgranskad felkatalog. AF saknas i denna version. Referensen innehåller en äldre formulering i §6 om ännu ej verifierade decimal-/bråkkedjor trots uppdateringen i §8; hela källan bevaras men motsägelsen får inte styra regler. Uppgifterna om 127 facit och 28 aritmetikfacit behöver versions-/antalskontroll. Prevalenssiffror från McIntosh används inte som automatiska individtrösklar.

## Leverans och nästa konkreta steg

[Förslag till första pilot](NCM_ADAPTIVE_SCREENING_PILOT.md): skriftlig subtraktion, AS2 med AG3 som förkunskapskontroll. Valt för att sparat arbete och befintliga kontrastuppgifter finns, inte för att resten av katalogen väljs bort.

En **fristående syntetisk beslutsprototyp** för pilotens gren-/stoppregler finns nu i `scripts/prototypes/`, med [redovisade körningar](evaluations/ncm-didactic-2026-10-30/decision-prototype.md). Nästa steg är ett uttryckligt valt verkligt elevunderlag och didaktisk avstämning före bredare automation. Ingen verklig elevdata har lästs, inget material delats ut och inget publicerats i inventeringen eller prototypen.
