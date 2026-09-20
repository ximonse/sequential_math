# Granskningsunderlag för produktkontraktet

Status: **utkast 2026-09-20**. Hör till [produktkontrakt v0.1](PRODUCT_CONTRACT.md).
Underlag: Simons mål i denna arbetsdialog, befintliga dokument nedan samt föregående kodgranskning av lokal commit `88ac8ce`. Dokumentjämförelsen är gjord nu; inga nya körtester eller klassobservationer ingår. Det är inte en fullständig kartläggning av kod eller publiceringsstatus.

## 1. Riktning att bevara

Simon har i dialogen bekräftat att arbetet ska börja uppifrån: adaptiv, progressiv mängdträning och användbar läraranalys ska styra underordnade funktioner och buggfixar. Han har beställt förslag och scenarier före kodarbete. Det innebär inte att alla nya formuleringar eller avvägningar i v0.1 redan är antagna.

| Källa | Avsikt att bevara | Motsägelse, begränsning eller öppen fråga |
| --- | --- | --- |
| [Projektkonstitution](../.agent-instructions.md) | Enkel elevträning och lärarens insyn är en helhet; domäner äger innehåll; rådata skiljs från tolkning. | Statusdelen säger att domänrefaktorering återstår och bråk är framtida, medan registret innehåller flera domäner. Cirka 85 % rätt behöver skiljas från masteryregeln. |
| [Arkitektur](../ARCHITECTURE.md) | Gemensamt domängränssnitt och integration med elev- och lärarvy. | Checklistan kräver registrering på flera ställen; det motsäger ambitionen att en ny domän är självständig. Beskrivet progressionsflöde visar inte hela samspelet mellan mastery och nivåval. |
| [Didaktisk blueprint](DIDAKTISK_BLUEPRINT_V2.md) | Rik intern analys bakom enkel elevnavigation; tempo är inte kunskap; stöd för representationsvariation. | Är uttryckligen en plan, inte leveransbevis. Nya menyer, transfermått och exakta underlagsgränser är inte automatiskt antagna här. |
| [Plan för adaptiv grund](ADAPTIVE_TRAINING_FOUNDATION_PLAN.md) | Gemensamt urval, separata kompetenssignaler, fullständiga svar och begreppsorienterat bråkarbete. | Avsnitt märkta ”Utfört” räcker inte som bevis för hela kedjan. Granskningen fann återtolkning av decimalevidens och tabellsvar som fortfarande kan räknas till nivåmastery. |
| [Progressionsguide](PROGRESSION_LOGIC.md) | Förklarar anpassning, träning och mastery. | Blandar fem respektive sex försök och beskriver äldre urval. Ska senare länka till en beslutad regeldefinition. |
| [Pedagogisk reflektion](reflektion.md) | Analys som beslutsstöd, kontext och triangulering med lärarobservation. | Anger 80 % för mastery medan `operations.js` anger 85 %. Skillnaden registreras; ingen ny tröskel väljs i förslaget. |
| [Dokumentationsrutin](DOKUMENTATIONSRUTIN.md) | Ändringar ska följas av dokumentation. | ”Kod är alltid facit” behöver avgränsas till beskrivning av nuläge. Det får inte göra produktens avsikt underordnad en bugg. |
| [Utvärdering](../app_utvardering.md) | Trygg träning, begriplig progression, elevens nästa steg och lärarens underlag. | Äldre positiva omdömen och daterade testresultat bevisar inte dagens sammanhängande beteende. |
| [Dataflöde](data-flow.md), [lärarlogik](LARARDASHBOARD_LOGIK.md) | Synlig kedja från svar till analys och tydliga tolkningsregler. | Dokumentens runtimepåståenden behöver senare jämföras med respektive faktisk väg; de är inte auktoritet för ny pedagogisk policy. |
| [Tillförlitlighet](RELIABILITY_CONTRACTS.md), [verifieringsplan](RELIABILITY_PLAN.md), [rollscenarier](ROLE_PERSONA_ACCEPTANCE.md) | Kontinuitet, åtkomstgränser, verkliga användarflöden och uttalade verifieringsgränser. | Teknisk tillförlitlighet och matematisk/pedagogisk riktighet kräver olika bevis. Äldre verifieringar överförs inte automatiskt till nya versioner. |

## 2. Tre beslut för Simon

Rekommendationerna nedan är öppna för ändring. Ingen genomförs i appen i detta steg.

| ID | Avvägning | Rekommenderat förslag | Alternativ och konsekvens |
| --- | --- | --- | --- |
| D1 | Automatisk anpassning kontra elevens val | Appen anpassar uppgifterna inom aktuellt steg; när underlaget talar för att gå vidare till ett nytt steg får eleven ett begripligt val att gå vidare eller befästa mer. Valet ska påverka urvalet. Exakt skillnad mellan utmaningsuppgift och stegbyte preciseras före kod. | Helt automatisk avancering ger färre avbrott men mindre uttrycklig kontroll. Ett ja före varje svårare uppgift ger mer kontroll men stör mängdträningen. |
| D2 | Historiska framsteg kontra aktuella svårigheter | Bevara vad som tidigare belagts och visa aktuellt repetitions-/stödbehov separat. Historiska framsteg hindrar inte anpassning nedåt. | En enda nivå som höjs/sänks är enklare men blandar historiskt kunnande med dagsform och aktuellt behov. |
| D3 | Lärarens låsning kontra adaptiv återhämtning | Respektera ett uttryckligen låst innehåll/nivå. Om eleven fastnar erbjuds tillgängligt stöd eller paus och läraren får en signal; appen byter inte tyst uppdrag. I adaptiva uppdrag tillåts återhämtning inom angiven ram. | Automatiskt gå utanför ramen kan ge lättare träning men förändrar lärarens uppdrag och gör dess resultat svårare att tolka. |

Det som redan är tydligt från målet — exempelvis att elevsvar och lärarunderlag måste avse samma kompetens — behöver inte bli en ny fråga om varje gång. Exakta antal svar, nivåfördelningar och tidsgränser lämnas till underkontrakt, motiverade scenarier och senare kalibrering.

## 3. Godkännande och nästa arbete

Vid granskning avgör Simon om M1/M2 uttrycker rätt löfte, om P1–P9 är rätt vägledning och hur D1–D3 ska avgöras. Därefter kan v0.1 revideras och uttryckligen antas, med datum. Först då ändras dokumentens produktmässiga rangordning och äldre överlappande riktlinjer märks som ersatta eller hänvisande.

Nästa leverans är en kartläggning av F1–F6: krav-ID → berörda flöden → kodägare → nuvarande avvikelse → verifiering → prioritet. Det är ett senare steg, inte färdigställt genom dessa dokument. De redan funna buggarna ska användas som konkreta motexempel; de ska inte definiera hela produktens mål.

## 4. Genomförd kontroll av detta dokumentpaket

- Produktens syfte, tekniska förslag och aktuell verifieringsstatus är åtskilda.
- Alla föreslagna principer används i minst ett scenario; varje scenario berör både elev och lärare.
- Klassobservation är en separat evidenskälla med tom observationsmall, inte påhittat utfall.
- Inga nya appfunktioner, tester, datamigreringar eller produktionsåtgärder ingår.
