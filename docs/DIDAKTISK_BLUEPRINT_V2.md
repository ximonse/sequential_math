# Didaktisk Blueprint v2

> Syfte: ge en konkret plan for hur appen utokas med brak, decimal, procent, algebraiska uttryck och talsorter utan att tappa elevfokus pa adaptiv mangdtraning.
>
> OBS: Detta ar en design- och implementationsplan. Ingen kod andras i detta dokument.

## 1. Utgangspunkt

Du har tva huvudmal:

1. Elevmal:
- snabb, tydlig, motiverande adaptiv traning.
- inte en "provkansla" i vardagslaget.

2. Lararmal:
- data som gar att tolka didaktiskt.
- tydlig separation mellan kunskapsluckor, uppmarksamhet och arbetssatt.
- mojlighet att folja utveckling over tid och mellan formor.

Detta leder till en central princip:

- elevens navigation kan vara enkel,
- men den interna taggningen och analysen maste vara rik.

## 2. Kallor och forankring

Blueprinten lutar mot NCM:s struktur och progressionstanke i Diamant + handboken.

Primara kallor:
- NCM Diamant inledning:
  - https://ncm.gu.se/klassrum/diamantdiagnos/inledning/
- NCM Diamant diagnoser (kodstruktur):
  - https://ncm.gu.se/klassrum/diamantdiagnos/diagnoser/
- NCM Aritmetik (AF/AG/AS/AU):
  - https://ncm.gu.se/klassrum/diamantdiagnos/aritmetik/
- NCM Rationella tal (RB/RD/RP):
  - https://ncm.gu.se/klassrum/diamantdiagnos/rationella-tal
- NCM Talmonster och algebra (TA):
  - https://ncm.gu.se/klassrum/diamantdiagnos/talmonster/
- Handboken "Forsta och anvanda tal":
  - https://ncm.gu.se/handboken

Viktig notering:
- Testmaterial i handboken ar losenordsskyddat och avsett att anvandas tillsammans med boken.
- Appen ska darfor bygga pa didaktiska principer och kodstrukturer, inte kopiera losenordsskyddade test rakt av.

## 3. Rekommenderad produktstruktur (hybrid)

### 3.1 Elevgranssnitt

Behall nuvarande rakesattsspår och lagg till begreppsspar:

- Raknesatt:
  - Addition
  - Subtraktion
  - Multiplikation
  - Division
- Tal och begrepp:
  - Talsorter och positionssystem
  - Brak
  - Decimaltal
  - Procent och proportionalitet
  - Algebraiska uttryck

Resultat:
- eleven far enkel start,
- lararen kan ge riktad traning vid behov.

### 3.2 Intern analysmodell

Varje uppgift taggas med flera dimensioner samtidigt:

- `operationTag`: addition/subtraction/multiplication/division/mixed
- `domainTag`: arithmetic/place_value/fraction/decimal/percent_ratio/algebra_expression
- `subskillTag`: finare moment (se sektion 4)
- `representationTag`: symbolic/text/table/number_line
- `cognitiveTag`: procedural/conceptual/transfer
- `sourceTag`: internal/ncm
- `ncmCode`: om relevant

Detta gor att en elev kan trana "addition", men statistiken kan visa att svagheten egentligen ar "decimal place value".

## 4. Taxonomi v2 (domaner och subskills)

## 4.1 Talsorter och positionssystem (`place_value`)

Karnsubskills:
- `pv_read_write`: lasa/skriva tal i olika former.
- `pv_decompose`: dela upp tal efter position (tusental...tusendelar).
- `pv_compare_order`: jamfora/ordna tal.
- `pv_rounding`: avrunda till given position.
- `pv_shift_scale`: 10x/100x/0.1x och decimalforflyttning med forstaelse.

## 4.2 Brak (`fraction`)

Karnsubskills:
- `frac_part_whole`: del av hel.
- `frac_part_set`: del av antal.
- `frac_number_line`: brak som tal pa tallinje.
- `frac_equivalence`: forkorta/forlanga.
- `frac_compare`: jamfora brak.
- `frac_add_sub`: addition/subtraktion av brak.
- `frac_mul_div`: multiplikation/division av brak.

## 4.3 Decimaltal (`decimal`)

Karnsubskills:
- `dec_place_value`: taluppfattning i decimalform.
- `dec_compare_order`: jamfora/ordna decimaltal.
- `dec_add_sub`: addition/subtraktion.
- `dec_mul_div`: multiplikation/division.
- `dec_rounding`: avrundning och narmvarden.

## 4.4 Procent och proportionalitet (`percent_ratio`)

Karnsubskills:
- `pct_basic`: grundprocent (andel av helhet).
- `pct_to_from_fraction_decimal`: omvandling procent <-> brak <-> decimal.
- `pct_change`: procentuell okning/minskning.
- `pct_factor`: forandringsfaktor.
- `ratio_proportional`: enkel proportionalitet.

## 4.5 Algebraiska uttryck (`algebra_expression`)

Karnsubskills:
- `alg_read_expression`: tolka uttryck.
- `alg_value_substitution`: berakna uttrycksvarde (t.ex. `x=5`).
- `alg_simplify`: forenkla uttryck.
- `alg_translate_text_to_expression`: oversatta text till uttryck (fas 2+).

## 5. Nivakarta 1-12 (global, domanspecifik tolkning)

Appen har redan en fungerande 1-12-logik. Behall den for kompatibilitet.

Forslag pa generell betydelse:

- Niva 1-3: konkret/intuitiv grund.
- Niva 4-6: basal procedur med stabilitet.
- Niva 7-9: overforing mellan representationer och storre tal.
- Niva 10-12: sammansatta problem, blandade representationer, hogre kognitiv last.

Domanspecifika exempel:

- `place_value`:
  - L1-L3: ental-tiotal-hundratal.
  - L4-L6: tusental + decimaldelar.
  - L7-L9: jamforelse/avrundning i blandad form.
  - L10-L12: komplexa byten och resonemang.

- `fraction/decimal/percent_ratio`:
  - L1-L3: grundbetydelse.
  - L4-L6: enkla operationer inom samma representation.
  - L7-L9: mellan-representation (brak<->decimal<->procent).
  - L10-L12: textproblem + flerledade resonemang.

- `algebra_expression`:
  - L1-L3: enkla uttryck med ett steg.
  - L4-L6: uttrycksvarde med en/flera variabler.
  - L7-L9: forenkling och strukturforstaelse.
  - L10-L12: blandad algebraisk hantering med rationella tal.

## 6. Didaktiska designregler for adaptiv motor

1. Hastighet far accelerera progression, men aldrig blockera progression.
2. "Transfer" ska mattas separat:
- inom representation (t.ex. decimal addition),
- mellan representation (t.ex. brak -> procent).
3. Ouppmarksamhetsfel ska inte tolkas som kunskapsfel.
4. Minsta underlag innan stark slutsats:
- minst 8 forsok for delmomentanalys.
- minst 12-15 forsok for transfer-pastaenden.
5. Narm eleven ar stabil i lugnt lage ska erbjudande om avancering fortsatt finnas kvar.

## 7. Larardata v2 (vad som ska visas)

For varje elev och doman:

- `attempts_domain_week`
- `success_domain_week`
- `knowledge_error_rate_domain`
- `inattention_error_rate_domain`
- `median_speed_normalized_domain`
- `stability_index_domain` (spridning over tid, inte bara medel)
- `transfer_in_to_between`:
  - jamfor resultat inom representation vs mellan representation.

For lararbeslut:

- "Behov av stod nu" ska prioritera:
  - hog kunskapsfelandel + lag stabilitet + tillrackligt underlag.
- "Risk" ska aldrig bygga enbart pa tempo.

## 8. Uppdragsmodell v2

Uppdrag ska kunna filtreras pa:

- raknesatt,
- doman,
- subskill,
- NCM-kod (nar relevant).

Rekommenderade uppdragstyper:

1. Mjukt fokusuppdrag:
- snav doman, bred niva (mangdtraning + trygghet).

2. Transferuppdrag:
- samma innehall i flera representationer (t.ex. brak/decimal/procent).

3. Diagnostiskt mikrouppdrag:
- kort serie for en specifik hypotes (t.ex. "forstar forandringsfaktor?").

## 9. MVP -> Fas 3 (prioriterad backlog)

## Fas 1 (MVP, hogst pedagogisk nytta)

Omfattning:
- `place_value`, `fraction`, `decimal`, `percent_ratio` (grund + mellanform).
- inga fulla fria textinmatningskrav utom numeriska svar.

Leverabler:
- ny doman/subskill-tagging.
- elevlage "Tal och begrepp" med fokusspår.
- lararpanel: domanresultat + transferindikator enkel.

Acceptanskriterier:
- larare kan dela ut minst ett riktat uppdrag per ny doman.
- dashboard visar minst 4 nya meningsfulla domanmatt.
- inga regressionsfel i befintliga 4 raknesatt.

## Fas 2 (algebra uttryck)

Omfattning:
- `algebra_expression` med fokus pa:
  - uttrycksvarde (`x=...`),
  - enkel forenkling.

Leverabler:
- uttrycksuppgifter med numeriskt facit dar det ar mojligt.
- ny lararindikator for symbolhantering (inte bara ratt/fel).

Acceptanskriterier:
- elev kan trana uttrycksvarde adaptivt.
- larare kan se skillnad pa "aritmetiskt fel" vs "symboltolkningsfel".

## Fas 3 (fordjupning och robusthet)

Omfattning:
- utokad text->uttryck-uppgifter.
- stabilitetsmatt och transfermatt version 2.
- finjustering mot verklig klassrumsdata.

Acceptanskriterier:
- export innehaller tydliga doman/subskill-falt.
- larare kan folja trend per doman over 4+ veckor.

## 10. Reliability/validity-skydd i implementation

Ska byggas in fran start:

1. Sample guardrails:
- visa osaker etikett vid lagt underlag.

2. Tidsnormalisering:
- jamfor svarstid mot uppgiftens estimerade tid och doman.

3. Feltolkning-skydd:
- separera kunskap, ouppmarksamhet, avbrott.

4. Kontext i all export:
- alltid med `domainTag`, `subskillTag`, `representationTag`, `level`.

## 11. Beslutspunkter innan kodfas

Foljande beslut behovs:

1. Om elevmenyn ska visa alla nya domaner direkt eller trappas in.
2. Vilka subskills i fas 1 som ska vara obligatoriska.
3. Hur strikt "transfer" ska paverka progression i challenge vs steady-lage.
4. Om algebra i fas 2 ska tillata bara numeriska svar i v1.

## 12. Rekommenderat beslut (kort)

1. Kora hybridmodellen.
2. Leverera fas 1 fore bred NCM-import.
3. Halla progression pa global 1-12 men med domanspecifik tolkning.
4. Prioritera mätbarhet och tolkbarhet i larardata fore visuella extraeffekter.

---

Om du vill ar nasta steg att bryta ut denna blueprint till en exakt teknisk backlog med:
- fil-for-fil andringsplan,
- datamodellmigration,
- testplan per fas.
