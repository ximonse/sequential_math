# E4: decimaladdition med två minnessiffror — granskningsförslag

Status 2026-11-05: **konkret förslag för lärargranskning; inte godkänt eller
aktiverat i appen**. Nästa paket inom befintlig aritmetik efter de två
publicerade decimalpaketen. Ingen ändring av bank, elevträning eller mastery.

## Luckan och rekommendationen

V8 kan beräkna `carry_forget` för decimaladdition, men saknar en granskad
decimalbankväg. `one_carry_forgotten` finns för heltal med flera minnessiffror,
med **flera möjliga modellsvar**, men saknas i decimalgrenen. Att det nuvarande
urvalet inte räknar med denna rival får inte uppfattas som att rivalen har
uteslutits. Kodbelägg: [kandidatmotorn](../src/domains/predictableErrors/arithmetic.js),
[urvalet](../src/domains/predictableErrors/followUpSelection.js) och
[täckningsmatrisen](LEARNING_SYSTEM_COVERAGE.md).

**Rekommendation för beslut:** godkänn nedanstående innehåll och arbetsgång.
Utöka den befintliga identiteten `one_carry_forgotten` till detta avgränsade
decimalfall före aktivering. Bevara båda möjliga svaren genom urval, granskning
och resultat. Samma befintliga rapport-/materialkedja ska användas.

## Varför två minnessiffror inte räcker som urvalsvillkor

På **3,48 + 2,57 = 6,05** behövs en minnessiffra från hundradelarna. Den gör
att tiondelssumman blir tio, vilket skapar den andra minnessiffran.
Om den första tappas uppstår inte den andra:

- Alla minnessiffror uteblir: **5,95**.
- En av de två minnessiffrorna tappas: **5,95 eller 5,05**.

Svar **5,95** skiljer alltså inte de två förklaringarna åt. Min första
kontrollförutsättning — att två minnessiffror alltid gav fyra skilda svar —
föll här. Den rättades genom att skilja denna beroende kedja från paketets
struktur och behålla kedjan som ett uttryckligt överlappsprov.

Paketets frågor har i stället minst tio i **båda decimal­kolumnsummorna redan
innan någon minnessiffra förs vidare**. Då skiljer de rätt svar, glömda
minnessiffror överallt och båda varianterna av en tappad minnessiffra åt.
Det säger fortfarande inget säkert om elevens faktiska metod eller orsaken.

## Avgränsning och frågor

Två positiva tal med ensiffrig heltalsdel och exakt två decimaler. Båda
decimal­kolumnsummorna är minst tio, och facit är mindre än tio. Olika antal
decimaler, resultat över tio och den beroende kedjan ovan ligger utanför
första paketet. En enda minnessiffra räcker inte för att pröva modellen
”en av flera tappas”. Innehållet består av originaluppgifter och ett
didaktiskt förslag; inget specifikt NCM-facit eller forskningsutfall åberopas.

| Roll | Uppgift | Facit | Alla minnessiffror uteblir | En av minnessiffrorna tappas |
|---|---|---|---|---|
| Källexempel | 3,48 + 2,67 | 6,15 | 5,05 | 6,05 eller 5,15 |
| Ny prövning A | 1,76 + 2,58 | 4,34 | 3,24 | 4,24 eller 3,34 |
| Ny prövning B | 4,67 + 1,85 | 6,52 | 5,42 | 6,42 eller 5,52 |
| Undervisning | 2,68 + 1,57 | 4,25 | 3,15 | 4,15 eller 3,25 |
| Ny kontroll | 3,86 + 2,47 | 6,33 | 5,23 | 6,23 eller 5,33 |
| Senare kontroll | 1,78 + 3,66 | 5,44 | 4,34 | 5,34 eller 4,44 |
| Negativ kontroll: ingen minnessiffra | 2,13 + 3,24 | 5,37 | 5,37 | Ingen minnessiffra att tappa; modellen kan inte prövas |

Den sista raden utesluter ingen felregel. Rätt svar kan produceras utan att
hantera en enda minnessiffra. Den ska inte användas som ensam kontrast eller
som belägg för att problemet med minnessiffror har försvunnit.

## Arbetsgång för lärargranskning

1. **Undersök originalet.** Be eleven visa hur hen räknade och vad siffrorna
   betyder. Källsvaret är ett underlag, ingen konstaterad metod. Håll hjälp,
   avskrivning, avbrott och andra räknesätt öppna som förklaringar.
2. **Pröva två andra frågor utan metodtips.** Frågorna måste vara nya enligt
   tillgänglig historik. Bevara elevens uträkning, råa svar och status.
   Tomt eller delvis ifyllt är inte motbevis mot en felregel. Svar utanför
   modellerna får förbli okända; de ska inte pressas in i en klassifikation.
3. **Kartlägg med alla varianter.** Jämför med glömd minnessiffra på respektive
   position, alla glömda, rätt svar och annat/okänt. Ett rätt svar eller ett
   matchande fel räcker inte för en kausal diagnos. Olösta överlapp ska synas.
4. **Bemöt efter lärarens bedömning.** I **2,68 + 1,57** blir 8 + 7 = 15
   hundradelar: fem hundradelar och en tiondel. Därefter blir 6 + 5 + 1 = 12
   tiondelar: två tiondelar och en hel. Till sist 2 + 1 + 1 = 4 hela.
   Be eleven förklara vad **var och en av de två ettorna** är värd och varför
   värdet bevaras vid växlingen. Förslaget gäller innehållet, inte krav på
   en viss giltig räknemetod; andra metoder får användas och förklaras.
5. **Spara undervisning och följ upp med andra frågor.** Anteckna datum,
   innehåll, observation och faktiskt given hjälp i befintlig avstämning.
   Undervisningsexemplet får inte räknas som ny kontroll. Ny och senare
   kontroll ska vara andra oanvända uppgifter, som läraren granskar och
   uttryckligen delar ut vid valt tillfälle. Rätt svar bevisar inte
   självständighet; ett nytt fel betyder inte automatiskt återfall.

```mermaid
flowchart TD
  O[Originalsvar och synlig uträkning] --> P[Två nya frågor utan metodtips]
  P --> J[Jämför rätt svar och samtliga modellvarianter]
  J --> G[Lärarens avstämning med kvarvarande osäkerhet]
  G --> U[Vid behov: undersök tiondelens och helans värde]
  U --> N[Spara undervisning, datum och hjälpstatus]
  N --> K[Annan ny kontroll efter granskning]
  K --> S[Senare ny kontroll vid lärarvalt tillfälle]
  S --> G
```

## Reproducerbara kontroller och vad de visar

[Paketdata](evaluations/e4-decimal-addition-2026-11-05/package.json),
[utvärdering](evaluations/e4-decimal-addition-2026-11-05/evaluate.mjs) och
[maskinbelägg](evaluations/e4-decimal-addition-2026-11-05/evidence.json).

```text
node docs/evaluations/e4-decimal-addition-2026-11-05/evaluate.mjs
```

- Sju facit och båda modellernas alla svar kontrolleras oberoende med
  heltalshundradelar. Befintlig `carry_forget` jämförs med dessa svar.
- 91 125 fall täcker hela den ändliga pilotramen och ger fyra skilda svar.
- 20 250 angränsande kedjefall har överlapp. De behandlas inte som ytterligare
  särskiljande frågor. Totalt 111 375 fall kontrolleras, även med noll hela
  i en eller båda positiva operanderna.
- Fyra konkreta gränsfall, sju rättsvar och 14 partiellt/tomt-statusfall ingår.
- Appens aktuella urval saknar decimalbankväg. En tillfällig föreslagen bank
  ger två frågor för befintlig modell men kan inte beräkna decimalrivalen;
  när rivalen begärs uttryckligen lämnas modellpar olösta. Redan sedda frågor
  ger ingen tyst upprepning som ”ny prövning”.

Detta är **syntetiska kontroller med öppet facit**, inte ett blindtest eller
en elevstudie. Gemini fick ett separat, enbart fiktivt blindtestuppdrag i
isolerad mapp med verktyg spärrade. Anropet stoppades före modellsvar med
`IneligibleTierError` (den installerade klienten stöds inte längre för
kontot). [Försöksstatusen](evaluations/e4-decimal-addition-2026-11-05/external-attempt.json)
innehåller inga elevdata eller hemligheter. Inget nytt AI-blindtestresultat
eller oberoende modellgranskning påstås.

## Nästa genomförande efter innehållsbeslut

Återanvänd `didacticPackages`, den befintliga decimalrättningen och samma
rapport-/materialkedja. Versionsmärk den avgränsade decimalutökningen av
`one_carry_forgotten`; dess båda svar måste följa med i frysta jämförelser.
Lägg till egna versionsbundna bankuppgifter och reservroller för undervisning
och nya kontroller. Kontrollera källstruktur på servern och behåll
undervisningsnoteringens paket-/versionsbindning och historikskyddet.

Kräv prov som först visar saknad bank/rival, sedan hela kedjan med båda
varianterna, den beroende kedjans överlapp, negativa kontroller, versions-
konflikt och redan mötta frågor. Befintliga paket och träningens progression
ska behållas. Publicering och eventuell elevutdelning är separata steg.
