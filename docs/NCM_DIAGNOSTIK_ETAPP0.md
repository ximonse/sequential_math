# NCM-diagnostik – Etapp 0: försökskontrakt och nulägesgräns

Status: **föreslaget genomförandekontrakt v0.1, 2026-09-29**. Detta dokument
beskriver nästa flöde; det är inte ett påstående om att appen redan gör detta.
Styrande beslut: [projektinriktningen](NCM_DIAGNOSTIK_PROJEKT.md),
[produktkontrakt v1.0](PRODUCT_CONTRACT.md) och
[funktionskontrakt v0.1](FUNCTION_CONTRACTS.md). Mål: M2, med P3–P9 och
F1/F3–F6; diagnostiken får inte rubba M1:s träning eller F2:s adaptivitet.

## 1. Gräns och ord

Ett **diagnostiskt uppdrag** är lärarens tilldelning av en fryst uppgiftslista
till en eller flera elever. Varje tilldelad uppgift är en **uppdragspost** som
kan finnas utan försök. Ett **försök** är en elevs arbete med en bestämd
uppgiftsversion inom en uppdragspost. Varje försök har egen stabil identitet;
flera försök på samma uppgift får aldrig kollapsa till ett svar. En
**observation** är
det eleven faktiskt gjorde: visad uppgift, inmatningshändelser, slutlig
arbetsyta, uttryckligt slutsvar och känt sammanhang. En **analys** är en senare,
versionsmärkt tolkning av observationen. **Lärargranskning** och **avslut** är
egna handlingar. Ingen av dessa betydelser får härledas från ett vanligt
`correct`-fält eller ett antal besvarade frågor.

Det första uppdraget använder endast egna heltalsuppgifter i [det gemensamma
uppgiftsmanifestet](../src/domains/arithmetic/diagnosticTasks.v1.json). De
fyra fallen är analysunderlag, inte en fast träningskö eller en ny NCM-import.
Uppgiftsmanifestet är data inom aritmetikdomänen. Framtida elevvy och
Word/PDF-renderare ska läsa samma frysta data; de får inte ha varsin frågebank.

## 2. Försökets livscykel

Livscykeln har flera oberoende tillstånd, eftersom `besvarad`, `fullständig`,
`automatiskt bedömd`, `lärargranskad` och `avslutad` inte betyder samma sak.

| Dimension | Tillstånd | Övergång och innebörd |
| --- | --- | --- |
| Tilldelning | `assigned` | Läraren tilldelar ett uppdrags-ID och en fryst manifestversion. Eleven kan ännu sakna ett försök. |
| Arbete | `not_started` → `in_progress` → `submitted` | Försök skapas vid första öppning/inmatning. Inlämning fryser en observationsrevision och registrerar att eleven lämnade ett svar; den säger inget om kvalitet. |
| Fullständighet | `unknown` → `complete` / `incomplete` / `uninterpretable` | En versionerad strukturregel kontrollerar om uppställning och uttryckligt slutsvar finns och kan läsas. Rätt slutsvar är inte kriteriet. Oklara representationer blir `uninterpretable`, inte felaktiga. |
| Mekanisk bedömning | `not_assessed` → `assessed` / `cannot_assess` | Versionerad matematik- och analysregel kan bedöma svaret och pröva hypoteser. Ett svar kan vara bedömt men ofullständigt. |
| Lärargranskning | `unreviewed` → `reviewed` | Läraren bekräftar, avvisar eller kommenterar analyser utan att ändra elevens original. Även ofullständiga försök kan granskas. |
| Avslut | `open` → `closed_reviewed` / `closed_abandoned` / `closed_invalid` | Läraren avslutar uttryckligen. Avslut är arbetsflöde, inte mastery eller säker diagnos. |

Inmatning och avbrott före inlämning behåller `in_progress`. Återupptagning
fortsätter samma `attemptId` och samma uppgiftsversion. En lärare kan öppna ett
inlämnat, ännu inte avslutat försök för en ny elevrevision; föregående revision
bevaras. Ett avslutat försök förblir historik. Om eleven ska göra om uppgiften
skapar läraren ett nytt försök under samma uppdragspost. Högst ett försök är
aktivt per elev och uppdragspost. Ett versionsbestämt `activeAttemptId` pekar
ut aktuellt försök; äldre försök visas separat i historiken, inte som ännu en
ej påbörjad uppgift. Finns inget försök är uppdragsposten `not_started`.
Tekniskt misslyckad inlämning visas som lokalt väntande och får inte visas som
serverbekräftad. Uppdragets elevstatus räknar uppdragsposter efter deras
aktuella försök: ej påbörjade, pågående och inlämnade. Lärarstatus kan också
visa granskade/avslutade uppdragsposter och ett separat antal historiska
försök.
En uppgift räknas **aldrig som diagnostiskt avklarad enbart för att ett svar
lämnats**. Ingen elevetikett `klar` skapas av sista inlämningen.

Minsta identitet: `assignmentId`, `assignmentVersion`, `assignmentItemId`,
`taskId`, `taskVersion`, `attemptId`, `observationRevisionId`, `studentId` och
`classIdAtAttempt`.
Uppgiftsversionen får inte bytas i ett pågående försök. Deduplikering använder
händelse-/revisions-ID och inte samma innehåll/tidsstämpel. Klassen vid
försöket bevaras när medlemskap senare ändras.

## 3. Oföränderlig observation och separat tolkning

Ett försök bär `diagnostic_only` som obligatorisk, oföränderlig evidensklass.
Den frysta uppgiften kopplas till uppgiftsmanifestets ID och version. Det
elevsynliga promptinnehållet bevaras eller kan återskapas exakt från den
versionen. Observationsrevisionen innehåller:

- rutnätets dimensioner, koordinatsystem och slutliga cellvärden/roller;
- append-only-händelser med stabilt `eventId`, monoton ordning, typ, före-/
  eftervärde, käll-/målruta och tidsstämpel där den är känd;
- markörflyttning, radering/ersättning, fokusförlust, paus, återupptagning och
  inlämning när sådana händelser inträffade;
- uttryckligt slutsvar separat från den tolkade uppställningen;
- tillgängligt respektive använt uppläsningsstöd, hjälp och avbrott som känd
  kontext, utan automatisk kunskapsvärdering;
- lagringsstatus: lokal registrering, väntande synk och serverbekräftelse som
  separata fakta.

Händelser och slutbild ska kunna jämföras vid återspelning. En mismatch ger
`uninterpretable`/teknisk osäkerhet, aldrig en konstruerad elevstrategi.
Rådata skrivs inte om när analysregeln ändras. Varje analysrevision anger
`analysisRuleVersion`, `observationRevisionId`, matchade hypoteser med exakta
cell-/händelsereferenser, motexempel, underlagsstyrka, alternativ och vad som
inte kan avgöras. `no_match`, `insufficient_evidence` och `matched_hypothesis`
är skilda utfall. Lärarens granskning är en separat append-only-revision som
pekar på analysrevisionen; en ny regel får ge en ny analys utan att radera den
gamla. Analys och lärargranskning pekar alltid på exakt
`observationRevisionId`; granskningen anger även `analysisRevisionId` eller
uttryckligen att ingen automatisk analys granskades. En ny elevrevision börjar
med `not_assessed`,
`unreviewed` och `open`; den ärver aldrig gammal analys, granskning eller
avslut. `closed_reviewed` kräver en lärargranskning av just den revision som
avslutas. Äldre revisioners granskningar finns kvar som historik men gäller
inte det nya underlaget.

V1 ger inget säkert påstående om elevens tankar utifrån tidsordning eller ett
ensamt slutsvar. En elev kan till exempel skriva vänstra kolumnen först efter
att ha räknat till höger i huvudet. Förloppsdata beskriver skrivordning, inte
automatiskt räkneordning.

## 4. `diagnostic_only` genom kedjan

| Gräns | Krav | Kontroll/motexempel |
| --- | --- | --- |
| F1: tilldelning och urval | Läraren väljer en fryst manifestversion och dess explicita uppgifts-ID:n. Eleven får just dessa uppgifter. Inget slumpat nivå-/skillurval, warmup eller adaptivt byte. | Gammalt NCM-filter och `targetCount` får inte avgöra nya uppgifter. |
| F3: innehåll | Varje uppgift har `diagnostic_only`, stabilt ID/version, originalkälla, matematiskt mål och oberoende facitregel. Guardian kontrollerar innan visning. | Ett saknat/okänt claim får inte falla tillbaka till `mastery_eligible`. |
| F4: observation | Försöks- och observations-ID, evidensklass, rå arbetsyta, händelser och kontext följer inlämningen. Numeriskt slutsvar får inte ersätta arbetsytan. | Samma svar två gånger är två försök med olika ID. |
| Lagring och synk | Servern är auktoritativ för verksamhetsdata. En eventuell krypterad lokal väntkö bevarar exakt råpayload och ack-status; den är ingen alternativ sanningskälla. Eventvalidering avvisar om evidensklass, uppgiftsversion eller händelseordning saknas. Retry är idempotent. | Profil-checkpoint eller merge får inte skapa om diagnostik som vanlig `problem_result`; historik kapas inte tyst. Storleks-/kvotgränser måste prövas före Etapp 1. |
| F5: mastery och F2: adaptivitet | Diagnostik ingår inte i `recentProblems`, `problemLog`, träningsstatistik, `CurrentNeed`, masteryfakta eller `adjustDifficulty`. Den styr inte nästa vanliga uppgift. | En genomförd diagnos lämnar ordinarie mastery och nästa träningsbeslut oförändrade. |
| F6: lärarvy | En separat diagnostikkälla visar arbetsyta, förlopp, analysversion, osäkerhet och lärargranskning. Sammanfattningar anger antal försök och urval. | Ett matchat mönster blir inte automatiskt en stabil elevprofil eller generell prestationssignal. |
| Export | Tom Word/PDF läser samma manifestversion. Senare genomförd export återger observationsrevision och analys separat, med kommentarsyta. Exportens metadata anger versioner och känd kontext. | Vanlig tränings-CSV får inte tyst räkna med diagnostiska försök eller kalla `submitted` för `completed`. |

Äldre NCM-resultat omklassificeras inte tyst. De har inte rutnät eller
händelseförlopp och får aldrig presenteras som om de hade det. Om en separat
migrerings-/revisionsinsats senare beslutas ska den redovisa vad den kan och
inte kan fastställa utan att ändra råhistoriken.

## 5. Gemensamt versionsmärkt uppgiftsunderlag

[`diagnosticTasks.v1.json`](../src/domains/arithmetic/diagnosticTasks.v1.json)
är Etapp 0:s konkreta innehållsutkast. `manifestId` + `manifestVersion` fryser
listan och gemensam instruktion; `taskId` + `taskVersion` fryser varje prompt,
operandpar, operation, facitregel och diagnostisk avsikt. En innehållsändring
kräver ny version; pågående försök fortsätter använda tidigare version. Det
ursprungliga manifestet sparas så länge det finns försök eller exporter som
refererar till det. `status: contract_draft` betyder att inget elevuppdrag är
aktiverat ännu.

Varje renderer får använda samma `instructionSv` och `promptSv` ordagrant.
Elevvyn visar texten som semantisk, markerbar HTML; den tillför ett redigerbart
rutnät och ett separat slutsvarsfält. Tom Word/PDF visar samma text och ett
tomt rutnät; uppgifts-ID och version följer dokumentet. Word får vara
redigerbart och PDF stabil för utskrift, men ingen renderer får ändra tal,
operation eller ordalydelse. Lärarmetadata (`intentCode`, `analysisCaseId`,
facitregel) hålls skild från elevtexten. Både slutligt facit och kontroll av
promptens operanduttryck härleds oberoende från `operation` och `operands`.
Rutornas visuella proportion följer projektplanens ungefär 5:8; faktisk
utskriftsstorlek och läsbarhet prövas vid renderingen, inte antas här.

Detta dataformat ersätter inte domänens `generate()`-gränssnitt. Etapp 1 får
ansluta manifestet som en kuraterad datakälla inne i aritmetikdomänen, med
diagnostisk uppdragsordning som eget F1-beslut. Ingen parallell generator eller
manuellt underhållen Word/PDF-frågebank införs.

## 6. Fyra egna analysfall

Alla fyra formuleringar och tal är egna. Fallen avser främst vilka
observationer en framtida regel behöver kunna skilja; ingen automatisk
hypotes implementeras eller certifieras i Etapp 0. Ett korrekt slutsvar utan
tolkningsbar arbetsyta ger `insufficient_evidence` om metoden.

| Fall | Uppgift och facit | Diagnostisk avsikt | Möjlig positiv observation | Närliggande motexempel eller `okänt` |
| --- | --- | --- | --- | --- |
| A1 | `268 + 431 = 699` | Kolumnjustering och platsvärde utan övergång. | Slutbilden placerar ental under tiotal och ett konsekvent synligt delsvar följer den placeringen; signalen pekar på cellerna. | En kort huvudräkningsnotering eller ojämn skrivplacering med korrekt slutsvar räcker inte för att säga att platsvärdet missförstås. |
| A2 | `248 + 327 = 575` | Övergång från ental till tiotal. | Synlig entalssumma 15 och tiotalssumma 6 utan tillagd etta kan stödja hypotesen ”minnessiffra användes inte”, med referenser till båda kolumnerna. | `575` utan synligt mellanled ger inget metodbelägg. En etta skriven på annan plats kan göra tolkningen osäker. |
| S1 | `764 − 231 = 533` | Operandordning och kolumnjustering utan växling. | Tydligt placerade operander och synliga delsvar kan visa om subtraktionsriktningen följdes. | Ett enskilt felaktigt slutsvar utan mellanled skiljer inte platsvärdesfel från rent räknefel. |
| S2 | `402 − 178 = 224` | Växling genom noll. | En synlig lånmarkering vid hundratalet, ändrat tiotal och ental kan pröva om båda leden i växlingen gjordes. Ett konsekvent `376` i korrekt justerade kolumner kan stödja hypotesen ”större minus mindre per kolumn”, men bara om varje delsvar syns. | Enbart `376` avslöjar inte metoden. Andra skriftliga eller mentala korrekta strategier får inte kallas felaktig lånmetod. |

För varje kommande analysregel krävs positivt fall, närliggande motexempel,
`insufficient_evidence` och återspelning efter lagring. Facitkontroll och
metodanalys är olika beslut. Läraren ser originalet även vid `no_match`.

## 7. Kodförankrad nulägeskarta: gammalt NCM-flöde

Kartlagt i denna checkout vid `7a56a2f`. Detta är en statisk kodgranskning,
inte ett test av ny funktion eller en fullständig backend-/autentiseringsaudit.

| Del | Faktisk funktion i dag | Beslut för ny diagnostik |
| --- | --- | --- |
| `src/lib/assignments.js`, `src/lib/trainingContext.js` | `kind: ncm` är kod-/förmågefilter med `targetCount`; ramen heter `ncm_assignment` men anger ingen diagnostisk evidenspolicy. | Återanvänd identitets-/tilldelningsmönster efter nytt schema; återanvänd inte `targetCount` som försöks- eller slutföranderegel. |
| `src/lib/ncmProblemBank.js`, `src/lib/ncmSkillMap.js` | Banken läser bearbetade NCM-rader, väljer slumpmässigt bland filterträffar och verifierar numeriskt facit eller fryst källrad. Den lagrar inte elevens metod. | Proveniens-, etikett- och verifieringsidéer kan granskas för återbruk. Första uppgifterna kommer från det egna manifestet. Inga originaluppgifter antas fria att publicera. |
| `src/lib/difficultyAdapter.js`, `src/components/student/session/usePracticeSetupEffects.js` | NCM-urval går genom adapterns problemval och en kö av skill tags som fylls från filter och tidigare `completedSkillTags`. | Nytt uppdrag använder fryst uppgiftslista och samma uppgiftsversion, inte adaptivt/slumpat urval eller gammal completed-kö. |
| `src/components/student/session/usePracticeCoreActions.js`, `src/components/student/session/sessionUtils.js` | Varje svar går via `addProblemResult`; `adjustDifficulty` körs för NCM när svaret inte är partiellt/nivåfokus. Svar märker skill tag avklarad utan krav på korrekthet; tom kö ger completion-overlay. | Hela numeriska svar-/completionkedjan hålls utanför nya försök. `submitted`, strukturellt `complete`, `reviewed` och `closed` får egna fält. |
| `src/lib/evidenceContract.js`, `src/lib/studentProfile.js`, `src/lib/currentNeed.js` | Evidensklass utan explicit claim blir `mastery_eligible` vid giltig skill/nivå. `addProblemResult` räknar livstidsstatistik och skriver vanlig problemlogg; mastery/current need kontrollerar evidensklass, men `adjustDifficulty` och statistik skyddas inte av den. | Varje nytt försök kräver explicit `diagnostic_only` och separat persistens. Att enbart sätta evidensklass i gamla pipelinen räcker inte. |
| `api/student/[studentId]/events.js` och pilotens synkväg | Event-API:t känner `diagnostic_only` som tillåtet värde på vanlig `problem_result`, men har ingen diagnostisk händelsetyp. Vanlig problemlogg kapas till 5 000 poster och `recentProblems` till 250. | Validera ett eget versionsmärkt diagnostiskt event/schema och dess storleksgränser; rå händelselogg får inte tyst kapas. Verifiera ack, retry och merge innan anslutning. |
| `dashboardStudentDetailNcmHelpers.js`, `NcmOverviewPanel.jsx`, `StudentDetailNcmPanel.jsx`, `teacherAnalytics.js` | Klass-/elevvyer och export visar försök, rättandel, gamla NCM-koder och completed tags, inte rutnät, händelser eller hypotesunderlag. | Återanvänd layout/exportinfrastruktur där den passar, men bygg urval och ord för diagnostik från försökskontraktet. |

Det exakta nya lagringsstället, serverbehörigheten, payloadgränsen och
synk-/mergeimplementeringen bestäms först efter en full kodgranskning i Etapp 1.
`DATALAGRING_KONTRAKT.md` kräver servern som auktoritativ källa och förbjuder
businessdata i `localStorage`. Det nuvarande event-API:t begränsar ett event
till 32 KiB och en batch till 256 KiB. Den befintliga krypterade elevkön kan
vara en transportbyggsten men är inte bevis för att stora rutnätsförlopp
säkert ryms.

## 8. Acceptansgrind inför Etapp 1

1. Samma uppdrags- och uppgiftsversion följer elevvy, lagring, analys, lärarvy
   och tom/genomförd export. Försöks-ID och `diagnostic_only` följer varje
   faktisk observation till lärarvy och genomförd export utan omtolkning;
   en tom utskrift har ännu inget elevförsök.
2. Inlämning ändrar endast `submitted`; fullständighet, matematisk bedömning,
   lärargranskning och avslut härleds eller beslutas separat.
3. En diagnostisk observation kan inte nå vanliga träningsräknare, mastery,
   CurrentNeed, adaptivt urval eller generisk NCM-completion.
4. Rå slutbild och händelseordning kan återspelas, även efter avbrott och
   serverbekräftad återläsning; annars redovisas teknisk osäkerhet.
5. Samma uppgiftsversion ger samma elevtext och tal i elevvy och tom Word/PDF.
   Den visuella utskriften granskas när renderarna faktiskt finns.

Etapp 0 kan endast godkänna **kontraktets entydighet**. Dessa körbara och
visuella bevis hör till senare etapper; inget i detta dokument kallar dem
verifierade nu.
