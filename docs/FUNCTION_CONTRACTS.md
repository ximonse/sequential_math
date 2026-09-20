# Funktionskontrakt F1–F6

Status: **aktiv teknisk baslinje v0.1, 2026-09-20**. Kontraktet preciserar [produktkontrakt v1.0](PRODUCT_CONTRACT.md) utan att införa nya pedagogiska trösklar.

Detta dokument beskriver vad implementationen ska bevara genom hela elev–lärarkedjan. Det är inte ett påstående om att nuvarande kod uppfyller kraven. Kända avvikelser och införandeordning finns i [funktionskartan](PRODUCT_FRAMEWORK_MAP.md).

## 1. Normativ ordning och ansvar

Orden **ska**, **får inte** och **bör** är normativa. Ett ansvar får ha flera tekniska moduler, men ett beslut får bara ha en auktoritativ ägare.

| Ansvar | Auktoritativt beslut | Producent | Konsumenter |
| --- | --- | --- | --- |
| F1 Träningsram | Vad sessionen tillåter: läge, fokus, kompetenser, nivåram och lärarbegränsning. | En gemensam ramupplösare. | F2, F3, F4, elevvy, lärarvy. |
| F2 Träningsbeslut | Vilken kompetens, vilket steg och vilket syfte nästa uppgift har. | En gemensam beslutsmotor. | F3, elevens återkoppling, F6. |
| F3 Uppgiftsinnehåll | Vilket matematiskt innehåll uppgiften faktiskt prövar och hur den bedöms. | Registrerad domän/kompetens. | F4 och oberoende innehållskontroll. |
| F4 Observation | Vad eleven mötte och svarade samt regelstyrd bedömning och felhypotes. | Svarspipelinen. | F5, F6 och lagring. |
| F5 Kunskapsläge | Historiskt belagt kunnande och aktuellt träningsbehov som två skilda tillstånd. | En ren, versionsbestämd härledning. | F2, elevens bekräftelse och F6. |
| F6 Lärarsignal | Vilket undervisningsrelevant påstående underlaget stödjer, med omfattning och osäkerhet. | En gemensam analyspipeline. | Lärarlista, elevdetalj, uppdrag och export. |

UI-komponenter får presentera beslut men inte skapa egna progressions-, mastery- eller evidensregler. Generatorer får skapa innehåll men inte besluta vad eleven behöver träna. Läsfunktioner får härleda vyer men inte skapa nya historiska kunskapsfakta som bieffekt.

## 2. F1 — träningsram

En `TrainingFrame` är en logisk, versionsbestämd ögonblicksbild för sessionen. Fältnamnen nedan anger betydelse, inte slutligt lagringsformat:

- `frameId`, `frameVersion` och `mode`.
- tillåtna kompetenser och deras nivåintervall;
- källa: elevens fokus, läraruppdrag eller systemets fria träning;
- uppdrags-ID och lärarbegränsning när sådana finns;
- evidenspolicy för läget;
- känd konflikt eller ofullständighet.

### Lägesmatris

| Läge | F2 får göra | F2 får inte göra | Evidens |
| --- | --- | --- | --- |
| Fri adaptiv träning | Rotera mellan aktiverade kompetenser och anpassa inom deras innehållskontrakt. | Välja en avstängd kompetens eller likställa nivånummer mellan områden. | Kan belägga den kompetens som varje uppgift faktiskt prövar. |
| Områdesfokus | Anpassa inom valt område/kompetens. | Lämna fokus tyst. | Kan belägga uppgiftens uttryckliga evidenskompetens. |
| Lärarens adaptiva uppdrag | Anpassa inom tilldelade kompetenser och nivågränser. | Gå utanför ramen för återhämtning eller utmaning. | Kan belägga uppgiftens kompetens; uppdragskontext ska följa observationen. |
| Låst nivå/fokus | Variera giltiga uppgifter på exakt tilldelat steg och erbjuda stöd eller paus. | Avancera eller backa utanför låsningen. | Kan belägga steget när innehålls- och underlagskrav är uppfyllda. Avslutat uppdrag är inte i sig kunnande. |
| Tabellträning | Träna och följa flyt för valda tabeller. | Göra tabellsvar till generell nivåmastery i multiplikation. | `practice_only` för generell multiplikationsmastery; separat tabellflyt får härledas enligt eget kontrakt. |
| Diagnostiskt/NCM-uppdrag | Följa uppdragets uttryckliga kod/förmåga och slutföranderegel. | Automatiskt behandla slutförande som vanlig adaptiv träning eller mastery. | Kräver uttrycklig mappning till kompetens; annars diagnostiskt underlag separat från mastery. |
| Ticket/start-/exitfråga | Registrera svar i det uttalade ticket-sammanhanget. | Räkna svaret som vanlig träning utan särskilt beslut. | `practice_only` för träningsmastery; kan användas i ticketens egen sammanställning. |

Ett giltigt läraruppdrag har företräde framför elevens manuella fokus och fria träning. En explicit uppdragslänk som inte kan lösas får inte tyst bli fri träning. Motstridiga parametrar ska ge en identifierbar konflikt och ett begripligt stopp eller en säker väg tillbaka. Exakt nivå som eleven frivilligt återbesöker behandlas som låst fokus för den sessionen; detta är ett fokusval, inte ett val om huruvida appen får avancera i adaptiv träning.

## 3. F2 — nästa träningsbeslut

F2 tar emot F1, F5:s aktuella träningsbehov och relevant nylig evidens. Det returnerar ett `TrainingDecision` med:

- kompetens och målsteg;
- syfte: `introduce`, `consolidate`, `challenge`, `recover` eller `support`;
- regelversion och begripliga reason codes;
- ramens ID samt vilken evidens som användes;
- eventuellt stödbehov, utan säker diagnos av orsaken.

F2 ska följa dessa regler:

1. Historiskt belagt kunnande är ett ankare för vad som uppnåtts, inte ett golv som förbjuder repetition.
2. Aktuella svar kan flytta träningsbehovet uppåt eller nedåt utan att radera historiska fakta.
3. Stabil relevant evidens leder automatiskt till meningsfull utmaning inom F1. Eleven tillfrågas inte om avancering och förvarnas inte om att nästa uppgift är svårare.
4. Svarstid får bidra till beskrivning men är inte ett generellt krav för avancering. Avbrottsmärkt tid ska inte påverka kunskapsbedömning.
5. Ihållande svårighet ska kunna ge mer än ett enstaka lättare problem. Ett ensamt rätt svar avslutar inte automatiskt återhämtning.
6. Om giltig återhämtning inom ramen inte räcker returnerar F2 `support`. UI erbjuder tillgängligt stöd eller paus och F6 kan skapa en spårbar signal. F2 lämnar inte lärarens ram.
7. Slump får variera likvärdiga uppgifter, men får inte vara ensam förklaring till ett pedagogiskt stegbyte.

Trösklar, observationsfönster och återhämtningslängd ska ligga i ett namngivet, versionsbestämt `DecisionRuleSet`. V0.1 väljer inga nya värden. Befintliga värden betraktas som legacy tills de samlats i och motiverats för regeluppsättningen.

En gratulation är följden av en ny F5-prestation, aldrig dess orsak. Den ska namnge avgränsat innehåll, komma efter belägget och inte kräva ett val för att träningen ska fortsätta.

## 4. F3 — uppgiftsinnehåll

Varje genererad uppgift ska bära ett `ContentClaim`:

- domän och innehållskompetens;
- evidenskompetens och evidenssteg;
- innehållskontraktets version;
- uppgiftstyp/variant, svarstyp och fullständighetskrav;
- besluts-ID och ram-ID;
- om uppgiften får ingå i mastery, endast i lägesspecifik analys eller inte alls.

Innehållskompetens beskriver var uppgiften hör hemma. Evidenskompetens beskriver vad svaret får belägga. De kan skilja sig, exempelvis när en aritmetikuppgift särskilt prövar decimalers positionssystem. Den skillnaden ska bevaras explicit; den får inte senare härledas från rubrik eller textprefix.

F3 ska säkerställa att uppgiften är besvarbar, att facit och accepterade svarsformer är matematiskt riktiga och att faktisk uppgift motsvarar etiketten. En fallback får inte generera innehåll från ett annat steg och behålla den begärda nivåetiketten. Variation ska bedömas i matematiskt innehåll, representation, tal och nödvändig strategi; olika frågetext ensam räcker inte.

## 5. F4 — observation och bedömning

Ett svar ska bli en oföränderlig `Observation` med ett stabilt `observationId`. Minsta betydelse är:

- problem-ID, `ContentClaim`, ram-ID och beslut-ID;
- visad fråga/facitregel, elevens råa och normaliserade svar;
- `correct`, `incorrect`, `partial` eller `invalid_input`, med fullständighetskod där relevant;
- tidpunkt och känt sammanhang: träningsläge, uppdrag, hjälp, paus/avbrott och tidskvalitet;
- felhypoteser som separata tolkningar med analysversion;
- evidensklass: `mastery_eligible`, `practice_only`, `diagnostic_only` eller `invalid`;
- bedömnings-, innehålls- och evidensregelversion.

Felanalys är en hypotes. En observation får därför säga att ett mönster matchade, men inte lagra "eleven kan inte" eller en säker orsak. Ett ogiltigt/obesvarbart problem får aldrig bli `mastery_eligible`. Partiellt rätt får inte räknas som full mastery men ska bevaras som just partiellt, inte som ett odifferentierat fel.

Samma observation ska ha samma kompetens- och nivåbetydelse lokalt, på servern, efter merge, i F5 och i F6. Deduplikering ska utgå från stabil identitet, inte från att två svar råkar ha samma text och tid.

## 6. F5 — kunskapsläge och kontinuitet

F5 består av två separata modeller:

- `Attainment`: historiskt belagt kunnande per evidenskompetens/steg, med regelversion, datum och observationernas ID.
- `CurrentNeed`: ett föränderligt träningsförslag med kompetens, steg/intervall, orsakskoder, underlag och uppdateringstid.

Ett attainment-faktum skapas bara av den auktoritativa skrivpipelinen när ett versionsbestämt regelverk passerar. Läsning och visning får inte skapa fakta. Fakta är append-only och kan ersättas/återkallas genom en spårbar händelse; de skrivs inte om av dagsform.

CurrentNeed får röra sig under historiskt uppnått steg. Det betyder repetition eller stöd nu, inte automatiskt förlorad kunskap. Ett senare F2-beslut kan återgå till utmaning när aktuell evidens stödjer det.

Legacyobservationer får användas för mängd/aktivitet när deras grundfält är giltiga. De får bara användas för kompetens-/stegmastery om evidenskompetens, steg och relevant regelversion kan fastställas utan gissning. Annars visas underlaget som legacy/okänt och inga retroaktiva attainment-fakta skapas. En framtida migrering kräver separat plan, verifiering och uttryckligt genomförande.

Lokal lagring, väntande synk och serverbekräftelse är olika leveransstatusar. Bekräftad lokal registrering får inte kallas serversynkad. Vid okänd synkstatus fortsätter inte systemet att presentera molnkontinuitet som säker.

## 7. F6 — lärarunderlag

En `TeacherSignal` ska innehålla:

- signaltyp: aktivitet, aktuell prestation, historiskt belagt, återkommande felhypotes, uppdragsföljsamhet eller teknisk/osäker status;
- avgränsad kompetens, steg/intervall och träningsläge;
- period enligt Stockholms kalenderdagar där dagar används;
- antal observationer, giltiga evidensklasser och svårighets-/urvalskontext;
- konkret orsak till signalen, osäkerhet och länkbar underlagsmängd;
- möjlig undervisningsuppföljning formulerad som förslag, inte diagnos.

Okänt/ej tränat visas som okänt, inte nivå noll. Nivåer i olika kompetenser får inte summeras till en generell matematiknivå eller användas i ett jämförande klassnitt. Rättandel över blandade svårigheter får beskriva svaren men får inte ensam kallas utveckling eller regression. Mindre än sex svar behåller nuvarande neutrala markering; det är en försiktighetsgräns, inte ett generellt statistiskt beviskrav.

Lärarlista, elevdetalj och export ska använda samma urval, tidsgränser, kompetensidentitet och signaldefinition när de påstår samma sak. En sammanfattning får vara kortare men måste bära tillräcklig osäkerhets- och omfattningsinformation för att inte ändra innebörden.

## 8. Kontrollpunkter och felsäkert beteende

| Kontrollpunkt | Kontrollerar | Vid kontraktsbrott |
| --- | --- | --- |
| Ramkontroll | Giltig kombination av läge, uppdrag, kompetens och nivå. | Stoppa/förklara konflikten; inte fri fallback. |
| Problemkontroll | F3-form, kompetens, steg, version, facit och tillåten ram. | Kassera uppgiften och försök begränsat med ny giltig kandidat; därefter begripligt stopp. |
| Observationskontroll | Fullständig F4-identitet och förenliga versioner. | Bevara diagnostisk felpost där säkert, men räkna inte som giltig kunskapsevidens. |
| Kontinuitetskontroll | Deduplikering, ordning, lokal/serverstatus och oförändrad semantik. | Markera väntande/ofullständigt; skapa inte nya fakta ur oklar historik. |
| Analyskontroll | F6 använder rätt urval och skiljer observation, hypotes och kunnande. | Visa begränsat/okänt i stället för stark signal. |
| Leveransgrind | Återspelbara förlopp, innehållskontroll, test/build och relevant UI-QA. | Ingen status som verifierad eller publiceringsklar. |

Dessa kontroller utgör guardian-funktionen. De ska i första hand vara rena validerare och återspelbara tester nära respektive gräns, inte en ny central komponent som duplicerar hela appens logik.

## 9. Verifieringsmatris

| Kontrakt | Primära scenarier | Minsta körbara bevis |
| --- | --- | --- |
| F1 | S1, S7, S9 | Tabellstyrda fall för varje läge, läraruppdragets företräde och ogiltig konflikt. |
| F2 | S1–S4, S7 | Deterministiskt återspelade svarsföljder som visar introduktion, utmaning, flerledad återhämtning och support. |
| F3 | S9, S10 | Generativ kontroll per steg plus oberoende facit/svarskrav och explicit fallbackfel. |
| F4 | S5, S8–S10 | Samma observation före/efter serialisering, inklusive decimal, tabell, partiellt och avbrott. |
| F5 | S2, S4, S8, S9 | Historiskt attainment består medan CurrentNeed ändras; läsning är bieffektsfri; retry ger en observation. |
| F6 | S5, S6, S8, S9 | Samma urval ger förenlig lista/detalj/export; okänt är inte noll; svårare urval misstolkas inte som regression. |

Varje verifieringspost ska ange kontraktsversion, appcommit, metod/miljö, förutsättningar, utfall och begränsning. Ett passerat enhetstest bevisar inte browser-, lagrings- eller klassrumsflödet.

## 10. Införande och öppna parametrar

Första vertikala införandet (E2) omfattar kompetensidentitet och evidensklass för vanliga aritmetikuppgifter, dold decimalträning och tabellträning genom F3 → F4 → F5 → F6 samt serialisering/återläsning. Befintliga elevdata ändras inte i den leveransen utan en separat verifierad migreringsregel.

Följande behöver senare preciseras men blockerar inte E2:s struktur:

- masterytröskel och observationsfönster per innehållskontrakt;
- när och hur länge `recover` består innan `support`;
- vilket elevstöd som finns per uppgiftstyp;
- ordalydelse och frekvens för gratulation;
- vilka äldre observationer som säkert kan klassificeras om.

Sådana värden ska motiveras mot produktkontraktet, versionssättas och verifieras. De får inte spridas som fristående magic numbers i UI, generatorer och analyser.
