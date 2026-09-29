# NCM-diagnostik – levande ExecPlan

Status: aktiv arbetsplan, startad 2026-09-29. Styrande produktbeslut finns i
[projektinriktningen](NCM_DIAGNOSTIK_PROJEKT.md),
[produktkontraktet](PRODUCT_CONTRACT.md) och
[funktionskontrakten](FUNCTION_CONTRACTS.md). Denna fil är arbetsstatus, inte
ett påstående om levererad funktion.

## Mål och gräns

Bygg ett kort diagnostiskt uppdrag där elevens inmatade uppställning
och händelseförlopp bevaras, analyseras med versionsbestämda regler och visas
som spårbart, försiktigt lärarunderlag. Alla nya observationer ska vara
`diagnostic_only` och hållas utanför vanlig träningsmängd, mastery och
adaptivitet. Inga NCM-originaluppgifter byggs in utan klarlagd rätt.

## Arbetsloop

För varje etapp: läs berörda kontrakt och faktisk kod, gör ett avgränsat
arbete, verifiera elev–lagring–analys–lärarledet, uppdatera denna plan och
gör en liten lokal commit. Kodändringar verifieras med `npm run test` och
`npm run build`; logikändringar även med `npm run robots`. Publicering är
ett separat beslut.

## Etapp 0 – kontrakt och nulägesgräns (lokalt levererad)

Syfte: ge samma försök entydig betydelse i elevvy, lagring, analys,
lärarvy och export innan ett nytt elevflöde byggs.

- [x] Kartlägg gammal NCM-kod och dess faktiska dataväg, completion och evidens.
- [x] Definiera försökslivscykel från utdelning till lärargranskning, inklusive
      avbrott, återupptagning, inlämning och okänt resultat.
- [x] Definiera `diagnostic_only` i uppgiftsurval, observation, lokal/serverlagring,
      merge, mastery, adaptivitet, lärarunderlag och export.
- [x] Specificera fyra egna analysfall: två additioner och två subtraktioner.
      Varje fall anger matematisk avsikt, exempel, motexempel och okänt läge.
- [x] Definiera ett gemensamt versionsmärkt uppgiftsunderlag för elevvy samt tom
      Word/PDF. Utskriftsformaten ska läsa samma uppgiftsversion.
- [x] Granska kontraktet mot M1/M2, P3–P8, F1–F6 och den faktiska koden.

Leverans: ett granskningsbart etappkontrakt och en kodförankrad nulägeskarta.
Inga nya elevfunktioner eller utskriftsgeneratorer ingår i Etapp 0.

## Senare etapper

1. Isolerat rutnät och serialiserbart händelseförlopp; elevtest av minnessiffra
   och lån före interaktionsbeslut.
2. Deterministisk rekonstruktion och versionerad analys med matchning,
   motexempel och `okänt`.
3. Lärargranskning av original, analys och osäkerhet; utskrift av genomförd
   diagnos.
4. Liten klassrumspilot och kalibrering mot lärares granskning.
5. Lärarstyrda förslag till uppföljande uppdrag.
6. Expansion först efter nytt innehållskontrakt och nytt beslut.

## Etapp 1 – första isolerade prototypsnittet (pågår)

- [x] Dev-/QA-route `/qa/diagnostic-grid` läser de fyra uppgifterna från
  manifestet som markerbar text. Normal produktionsbuild exponerar inte routen.
- [x] Rutnät med tangentbord, pekknappar, pilar, tabulator, direkt rutval,
  radering, operatorer och en separat anteckningsposition. Två visuella placeringar av
  anteckningen kan jämföras utan att observationsformatet ändras.
- [x] Append-only-förlopp med versionsnummer, cellföre/-efter, markör,
  anteckningsläge, svar, paus/fokusförlust och inlämning. JSON-återläsning
  återskapar slutbilden eller stoppar vid mismatch.
- [x] Arbete i flera uppgifter bevaras i den öppna prototypfliken när eleven
  byter uppgift. Det är endast minnesstate, inte sparat elevunderlag.
- [ ] Prova antecknings-/låneinteraktionen med elever på avsedd iPad och välj
  sedan metod. Den nuvarande prototypen gör inget pedagogiskt metodanspråk.
- [ ] Anslut en säker serverauktoritativ försökslagring med idempotent synk,
  storleksgräns och återupptagning. Granska först hela event-/mergevägen.

Den isolerade prototypen har ingen lärartilldelning, ingen diagnostisk analys,
ingen vanlig mastery-/adaptivitetspipeline och ingen Word/PDF-renderare.
Att JSON går att återläsa i en flik bevisar ännu inte lagring efter avbrott,
serverbekräftelse eller att en elev naturligt kan skriva minnessiffra/lån.

## Beslut och öppna frågor

- Antaget: första omfattningen är flersiffrig addition och subtraktion med
  tangentbordsinmatad uppställning; diagnostik är skild från mängdträning.
- Antaget: egna uppgifter används tills rätt till originalmaterial klarlagts.
- Föreslaget i [Etapp 0-kontraktet](NCM_DIAGNOSTIK_ETAPP0.md): läraren avslutar
  ett försök uttryckligen. Detta är ännu inte ett antaget pedagogiskt beslut.
- Öppet för Etapp 1: naturlig inmatning av minnessiffra och lån avgörs genom
  elevtest, inte av Etapp 0:s datakontrakt.
- Öppet för senare etapper: vilka hypoteser som är tillräckligt säkra för
  klassöversikt respektive endast elevdetalj.

## Verifiering och status

- Etapp 0-underlag: [försökskontrakt och nulägeskarta](NCM_DIAGNOSTIK_ETAPP0.md)
  samt [uppgiftsmanifest v1](../src/domains/arithmetic/diagnosticTasks.v1.json).
- Etapp 1-prototyp: lokal QA-route utan elevkonton eller serverlagring.
  Prototypens JSON är en synlig arbetskopia, inte en säker sparfunktion.
- Verifierat lokalt efter pekknappsjusteringen: `npm run test` 110 filer/
  544 tester och `npm run build`. `npm run robots` kördes före den isolerade
  pekknappsjusteringen: 68 godkända, 0 regelbrott.
  Normal produktionsbuild innehöll ingen prototyproute. Lokalt QA-bygge prövades
  med Playwright i 768×1024 och 390×844: inmatning, anteckning, uppgiftsbyte,
  separat svar, frysning och JSON-återläsning. Senaste mobilkontrollen omfattade
  pekknappar och JSON-återläsning mellan uppgifter; skärmbilden granskades.
  Detta är webbläsarkontroll, inte
  ett test på fysisk iPad eller med elev. Bygget gav befintliga varningar om
  gammal Browserslist-data, blandad statisk/dynamisk import och stor bundle.
- Nästa steg: prova rutnät och minnessiffra/lån med elever på avsedd iPad.
  Granska därefter hela synkvägen före serveranslutning.
