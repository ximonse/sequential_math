# NCM-diagnostik – levande ExecPlan

Status: aktiv arbetsplan, startad 2026-09-29. Styrande produktbeslut finns i
[projektinriktningen](NCM_DIAGNOSTIK_PROJEKT.md),
[produktkontraktet](PRODUCT_CONTRACT.md) och
[funktionskontrakten](FUNCTION_CONTRACTS.md). Denna fil är arbetsstatus, inte
ett påstående om levererad funktion.

## Mål och gräns

Bygg ett kort diagnostiskt uppdrag där elevens tangentbordsinmatade uppställning
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
  Inget nytt elevflöde, Word eller PDF är implementerat.
- Verifierat lokalt: JSON parsad, fyra unika ID:n och facit omräknade; `npm run
  test` 109 filer/541 tester och `npm run build` passerade. Bygget gav varningar
  om gammal Browserslist-data, blandad statisk/dynamisk import och stor bundle.
  `npm run robots` behövs först när beteendelogik ändras.
- Nästa steg: isolerad Etapp 1-prototyp för tangentbordsrutnät och
  informationsbevarande serialisering. Granska den på verklig elevskärm innan
  minnessiffra/lån låses.
