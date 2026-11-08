# Bråk: blindtest 0 (inventering före bygget), 2026-11-08

**Avvikelse från [valideringsplanen](../../VALIDATION_PLAN.md), godkänd av Simon
2026-11-08 ("Kör").** Planen blindtestar ett område först när bank och modeller
finns. Detta test körs i stället *före* bråkpaketet för att se vilka
bråkfelförståelser regelmotorn redan känner igen och vilka som saknas. Resultatet
är underlag för steg 1–2 (inventering och bankförslag), inte ett betyg på ett
färdigt område. Ett blindtest efter bygget enligt planen återstår.

## Upplägg

- **Antigravity** (`agy -p … --model gemini-4-argon-high`) kördes i en tom mapp
  utanför repot och fick bara [prompten](prompt.txt): 18 bråkuppgifter i appens
  format (nivå 1–12 i `src/domains/fractions/generate.js`). Ingen källkod,
  modellista eller elevdata skickades.
- Gemini valde fritt 12 påhittade elever: 10 med felförståelse, 2 kontroller.
  Svaren och facit kom i samma svar; facit skildes ut till fil utan att läsas.
- **Offline, inte genom appen:** svaren kördes direkt genom
  `fractionCandidates` (regelversion `predictable-errors-v9`) med
  [assess.mjs](assess.mjs). Sammanfattningsregel: modellträff på minst två
  uppgifter = hypotes, en uppgift = svag signal.
- Bedömningen låstes före facit: [assessment.locked.json](assessment.locked.json)
  sha256 `d14faa24…63e7`. Facit: [facit.json](facit.json) sha256 `eb5ea27d…c687`.
  En första körning hade ett utskriftsfel i sammanfattningen (modellnamn som
  objekt); den rättades och kördes om före facit.
- Stickprov av Geminis felsvar (E06, E08, E09, E11) är kontrollräknade och följer
  av respektive profil.

## Resultat

| Elev | Facit (Gemini) | Regelmotorn | Utfall |
|---|---|---|---|
| E01 | Förlänger genom att dubblera täljaren och ta största befintliga nämnaren; halverar bara en gång vid förenkling | Fel utan förklaring | Missad |
| E02 | Hittar MGN men förlänger inte täljarna | `fraction_keep_first_denominator` (T07, T08) | Delvis: samma svar i två uppgifter, fel förklaring |
| E03 | Korsmultiplicerar; inverterar oäkta bråk (15/5 → 1/3) | `fraction_integer_in_denominator` (T13, T14) | Delvis: heltalsfallen sammanfaller, bråk × bråk missas |
| E04 | Kontroll, tre slarvfel | Fel utan förklaring | Rätt: ingen falsk hypotes |
| E05 | Komponentvis när ingen nämnare är gemensam | `fraction_components_separately` (4 av 9) | Rätt |
| E06 | Förlänger rätt men adderar även nämnarna | Svag signal `fraction_components_separately` (T01) | Delvis: rätt familj, efter förlängning missas |
| E07 | Additiv förlängning (bevarar differensen) | `fraction_keep_first_denominator` (T05, T06) | **Missvisande:** svaren råkar bli 1 = 2/2 |
| E08 | Förlängningsfaktorn blir ny täljare | Fel utan förklaring | Missad |
| E09 | Förlänger vid multiplikation (2/3 × 6 = 12/18) | Fel utan förklaring | Missad |
| E10 | Kontroll, ett slarvfel i T18 | Inga fel i tolkbara uppgifter | Rätt: ingen falsk hypotes |
| E11 | Multiplicerar täljaren med bråkets egen nämnare | Fel utan förklaring | Missad |
| E12 | Komponentvis vid olika nämnare | `fraction_components_separately` (8 av 9) | Rätt |

**Sammanfattning:** av tio felprofiler hittades 2 helt, 3 delvis, 1 missvisande
och 4 missades. Båda kontrollerna fick inga falska hypoteser. Som jämförelse gav
aritmetikens blindtest 1–3 8–9 rätt av 12.

## Fynd till bråkpaketet

1. **Fyra uppgiftsformer går inte att tolka alls:** förenkla (T03), oäkta bråk
   till heltal (T04) och tre termer (T17, T18). Regelmotorn läser bara
   `a/b op c(/d)`. Där syns bland annat E01 (12/18 → 6/9), E03 (15/5 → 1/3)
   och E07 (12/18 → 1/7), och de flesta felprofiler felar i T17–T18.
2. **Förlängning är huvudluckan.** Fem profiler felar i *hur* bråk förlängs
   (E01, E02, E07, E08, E11), och ingen befintlig modell beskriver förlängning.
   Flera av dem ger rätt svar när bara stambråk förlängs; särskiljande frågor
   behöver täljare större än 1.
3. **Sammanfall som kontrastfrågorna måste skilja:** `fraction_keep_first_denominator`
   sammanfaller med "förlänger inte täljaren" (E02) och med additiv förlängning
   när svaret blir 1 (E07). `fraction_integer_in_denominator` sammanfaller med
   korsmultiplikation för heltal (E03). Svar som förenklas till 1 bör inte ensamma
   ge en hypotes.
4. **Multiplikation:** korsmultiplikation (E03) och förlängning i stället för
   multiplikation (E09) saknas som modeller.
5. **Addition efter förlängning** (E06: 1/2 + 1/4 → 2/4 + 1/4 = 3/8) är samma
   familj som komponentvis addition men i ett senare steg; modellen räknar bara
   på de ursprungliga talen.

Gemini-elever gör ofta tydliga läroboksfel. Testet visar om kända mönster känns
igen, inte hur riktiga elever räknar.
