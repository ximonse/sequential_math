# Plan: validera felanalysen område för område

Beslutad ordning 2026-11-01 (Simon). Vi följer den; avvikelser beslutas och
skrivs in här. Status per steg finns på projektkartans kort `validation-plan`.

## Samma arbetsgång för varje område

1. **Inventering:** vilka felmodeller, elevappsetiketter, bankuppgifter och NCM-koder som finns.
2. **Bankförslag:** kontrastuppgifter med tal (så att regelmotorn kan läsa dem), räknade
   modellsvar och undvikna sammanfall. Simon godkänner listan.
3. **Modeller och kontraster** som saknas byggs i regelmotorn, med tester.
4. **Blindtest:** Antigravity väljer felprofiler för påhittade elever i en egen testklass
   och håller facit dolt.
5. **Blind bedömning** låses med kontrollsumma innan facit öppnas; sedan jämförelse.
6. **Rättningar och publicering** efter Simons beslut.

Ett område blindtestas först när bank och modeller finns; annars visar testet bara
det vi redan vet.

## Vem gör vad

| Uppgift | Vem | Skäl |
|---|---|---|
| Inventering, utredning, bankförslag, utkast till tester | Antigravity i skrivskyddat läge (`agy --print … --mode plan`), startad av Claude | Spar Claude. Gemini CLI är nedlagd för privatkonton (2026-11-01) |
| Låtsaselever och dolt facit | Antigravity (startskript i `teacher-data-out/blindtest`) | Neutralitet |
| Kodändringar i regelmotor och appen, kontroll av siffror, robotar, karta | Claude | Kräver repots helhet och verifiering |
| Godkännande av bankuppgifter, publicering, didaktiska avvägningar | Simon | Beslut |

## Ordning

| # | Område | Läge | Vad som görs |
|---|---|---|---|
| 0 | Publicera regelversion v4 | Klar lokalt | Push efter Simons beslut |
| 1 | Dolda decimaluppgifter i fri träning | Fynd från blindtestet | Utred varför Subtraktion gav ca 25 % decimaluppgifter; rätta om det bryter R1 |
| 2 | Skriftlig addition och subtraktion | Modeller finns, bank v3 | Lägg in de 9 bankförslagen (Simon godkänner) → blindtest 2 med räknehäften |
| 3 | Riktad uppföljning steg 4 | Steg 1–3 i produktion | Resultatvy: vilken förklaring varje svar stämmer med, signal, tankefel, hopfällda samtalsingångar |
| 4 | Multiplikation och division (skriftligt, ej tabeller) | Modeller finns delvis, ingen bank | Bankuppgifter med tal → blindtest |
| 5 | Decimaltal (addition, subtraktion, multiplikation) | Modeller finns delvis | Efter steg 1; bank → blindtest |
| 6 | Bråk | Modeller finns, bara enstaka granskade frågor | Bankuppgifter med struktur → blindtest |
| 7 | Procent | Modeller finns, bara enstaka granskade frågor | Som bråk |
| 8 | Räkneordning och algebra | Modeller finns delvis | Som bråk |

## Snabbhetsträning (tabeller, dubblor, talpar, talbild)

Blindtestas inte på detta sätt; målet där är snabbhet. I stället, i denna ordning när
områdena ovan är klara: signal till läraren vid samma felsvar på samma faktum 3–4
gånger i rad, och statistik över vanligaste felsvar som grund för en tipsbank.

## Inte i planen nu

Tips i fri träning (väntar på tipsbanken), nya områden utanför dem ovan.
