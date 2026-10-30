# Syntetisk AS2-prototyp: beslutsspår

Datum: 2026-10-30. Regelversion: synthetic-as2-v1. Alla observationer är uppfunna. Ingen appintegration, elevutdelning eller realdata.

| Fall | Nya frågor | Utfall | Beslutets motivering |
|---|---:|---|---|
| Ingen historik: baslinje, två kontraster, sedan stopp | 3 | Stöd för prövat delmoment | Två olika särskiljande frågor ger förenligt stöd för just detta delmoment. Avsluta här. |
| Relevant tidigare arbete: en ny bekräftelse räcker | 1 | Stöd för prövat delmoment | Två olika särskiljande frågor ger förenligt stöd för just detta delmoment. Avsluta här. |
| Modellförenligt felsvar: AG3-kontroll och annan skriftlig kontrast | 4 | Lärargranskning | Förkunskapskontroll och skriftligt resultat skiljer sig. Följ upp växling/metod; fastställ ingen missuppfattning automatiskt. |
| Noll i omöjlig kolumn: ingen automatisk orsaksdiagnos | 4 | Lärargranskning | Förkunskapskontroll och skriftligt resultat skiljer sig. Följ upp växling/metod; fastställ ingen missuppfattning automatiskt. |
| Osäker AG3: pröva förkunskap utan att följa place_value_error | 4 | Lärargranskning | Även förkunskapskontrollen är osäker. Lämna frågor och svar till läraren, utan orsaksdiagnos. |
| Rätt slutsvar men felaktigt granskat resonemang | 1 | Lärargranskning | Slutsvar och granskat arbete motsäger varandra; lärargranskning behövs. |
| Sparat arbete utan slutsvar ger inget kunskapsbesked | 1 | Otillräckligt underlag | Obesvarat eller avbrutet är inte en kunskapsbrist. Bevara arbetet för uppföljning. |
| Avbrott: inget nästa diagnostiskt steg | 1 | Otillräckligt underlag | Obesvarat eller avbrutet är inte en kunskapsbrist. Bevara arbetet för uppföljning. |
| Sparbekräftelse saknas: håll kvar frågan | 1 | Invänta sparande | Invänta sparbekräftelse; bevara arbetet och samma fråga. |
| Två rätta kontraster utan metodgranskning är inte säker förståelse | 3 | Lärargranskning | Slutsvaren räcker inte för metodbedömning. Granska arbetet i stället för att ge fler likadana frågor. |
| Genom noll har eget delmoment och egen bekräftelse | 1 | Stöd för prövat delmoment | Två olika särskiljande frågor ger förenligt stöd för just detta delmoment. Avsluta här. |

## Vad redovisningen visar

Relevant granskad historik kan ersätta hela baslinjevägen: en ny särskiljande fråga ger stopp. Utan historik blir det tre frågor när allt är förenligt. Vid modellförenliga fel följer förkunskapskontroll och vid behov en parallell skriftlig kontrast. AG3-fel styr inte via motorns place_value_error. Konflikter mellan svar och metod lämnas till granskning. Blank inmatning/avbrott blir inte kunskapsbrist; saknad sparbekräftelse ger väntan.

De elva körningarna kontrolleras dessutom av 23 riktade tester, inklusive frågebudgetens femfrågegräns, dubbletter, motexempel, inmatningsfel och slut på granskade kontrastfrågor. Budgetgränsen är en egen gränskontroll; de vanliga syntetiska vägarna använder som mest fyra nya frågor.

## Vad som ännu inte är visat

- Metodbedömning och att historiken är aktuell/jämförbar anges av en simulerad granskare. Detta är inte en helautomatisk bild-/metodanalys.
- Två olika exempel och femfrågegränsen är föreslagna pilotregler, inte forskningsvaliderade individtrösklar.
- Ett olöst fel eller en metodkonflikt försvinner inte automatiskt efter två rätt. Läraren behöver bedöma om motsägelsen är löst. Enbart två rätta slutsvar utan metodgranskning ger inget säkert metodbesked.
- Endast M02/N2 används här. Hela [NCM-täckningslistan](../../NCM_DIDACTIC_COVERAGE.md) ligger kvar för nästa områden.
- Appens riktiga serverbekräftelser och navigering är inte inkopplade. saved-fältet prövar bara beslutsdelens spärr.
- Ingen faktisk lärandeeffekt, psykometrisk validitet eller fysisk elevprovning är verifierad.

[Fullständigt syntetiskt beslutsspår](decision-prototype.json) innehåller frågor, belägg, ignorerad historik och alla mellansteg. [Pilotdesign](../../NCM_ADAPTIVE_SCREENING_PILOT.md).
