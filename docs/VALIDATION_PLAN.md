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
| 4 | Multiplikation och division (skriftligt, ej tabeller) | Bank v5 och regelversion v6 i produktion; blindtest 3 klart | Modeller v7 efter Simons beslut (se nedan) |
| 5 | Decimaltal (addition, subtraktion, multiplikation) | Modeller finns delvis | Efter steg 1; bank → blindtest |
| 6 | Bråk | Modeller finns, bara enstaka granskade frågor | Bankuppgifter med struktur → blindtest |
| 7 | Procent | Modeller finns, bara enstaka granskade frågor | Som bråk |
| 8 | Räkneordning och algebra | Modeller finns delvis | Som bråk |

## Blindtest 3 (multiplikation och division, 2026-11-02)

Regelversion v6, bank v5, 12 profiler. Blind bedömning låst före facit (sha256 09996d40…).
Appen: 8 rätt, 2 delvis, 1 missad, 1 svagt missvisande; kontrollerna utan falska hypoteser.

- Delvis: ingen radförskjutning missas när eleven tar faktorerna i omvänd ordning (11·90 = 180);
  nolla i kvoten missas när den står sist (320/4 = 8, 60/3 = 2).
- Missad: minnessiffran blir alltid 1 (46·7 = 292). Modell saknas.
- Svagt missvisande: en slarvig elevs slumpvisa −1 i division blev regelkandidat (quotient_off_by_one).
- Liten lucka: sammanskrivna delprodukter i 2×2 (34·23 = 1592).

Regelversion v7 (Simon godkände 2026-11-02, "kör som du föreslår"):

- Radförskjutning och övriga radmodeller prövas med båda faktorerna överst.
- Nollan i kvoten upptäcks även sist (80 → 8).
- Ny modell mul_carry_always_one (minnessiffran blir alltid 1).
- Sammanskrivna delprodukter även i 2×2.
- quotient_off_by_one blir regelkandidat först vid minst tre träffar och fler träffar än jämförbara rätta svar.
- Generiska observationer (skalning, ofullständig inmatning, omkastade siffror, annat räknesätt)
  visas inte när en specifik regel förklarar samma svar.
- Vänster till höger (från blindtest 2): add_left_to_right och sub_left_to_right, bara där svaret skiljer
  sig från glömd minnessiffra respektive växling utan minskning; med två siffror sammanfaller de alltid.

Lokal omkörning på sparade felsvar från blindtest 1–3: Silver Äng Bro Björn får mul_carry_always_one (7),
Lila Måne Bro Varg mul_no_row_shift 8 i stället för 3, vänster till höger bara hos eleven som räknade så,
inga nya hypoteser hos kontrolleleverna.

## Bråk: blindtest 0 före bygget (2026-11-08)

Avvikelse från arbetsgången 2026-11-08 (Claude föreslog den utan att nämna
planens ordning; Simon sa ja till förslaget): bråk blindtestades
*före* bank och modeller, som inventering. Antigravity (begärd modell gemini-4-argon-high) fick bara
18 bråkuppgifter, inga repofiler. Offline mot regelversion v9, låst bedömning
sha256 d14faa24…: 2 rätt, 3 delvis, 1 missvisande, 4 missade av tio profiler;
kontrollerna utan falska hypoteser. Huvudluckor: förlängning (fem profiler),
otolkbara former (förenkla, oäkta bråk, tre termer) och sammanfall för
`fraction_keep_first_denominator`. Detaljer i
[evaluations/fractions-blind-0-2026-11-08](evaluations/fractions-blind-0-2026-11-08/README.md).
Nästa steg enligt planen: bankförslag med struktur som Simon godkänner, därefter
modeller och ett ordinarie blindtest.

## Snabbhetsträning (tabeller, dubblor, talpar, talbild)

Blindtestas inte på detta sätt; målet där är snabbhet. I stället, i denna ordning när
områdena ovan är klara: signal till läraren vid samma felsvar på samma faktum 3–4
gånger i rad, och statistik över vanligaste felsvar som grund för en tipsbank.

## Inte i planen nu

Tips i fri träning (väntar på tipsbanken), nya områden utanför dem ovan.
