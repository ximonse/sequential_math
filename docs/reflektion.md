# Reflektion - pedagogiska motiv, reliabilitet och validitet

Detta dokument motiverar de val som ligger bakom larardashboardens data och tolkningar.

## 1. Pedagogisk utgangspunkt

Maalet ar inte att ge en enda "poang" pa eleven, utan att ge lararen ett beslutsstod som svarar pa tre fragor:

1. Kan eleven metoden i det aktuella momentet?
2. Hur stabilt fungerar den over tid?
3. Ar problemet kunskap, uppmarksamhet, arbetsvanor eller brist pa tid pa uppgift?

Darfor ar appen byggd med flera signaler som kompletterar varandra.

## 2. Val vi gjort och varfor

## 2.1 Kunskapsfel och ouppmarksamhetsfel separeras

Motiv:
- Ett fel ar inte alltid ett kunskapsgap.
- Sarskilt i blandat lage kan fel operation bero pa ouppmarksamhet.

Pedagogisk vinst:
- Lararen kan valja ratt atgard:
  - metodstod vid kunskapsfel,
  - fokus/rutin/arbetsro vid ouppmarksamhetsfel.

## 2.2 Time on task baseras pa engagerad tid

Motiv:
- Oppen sida utan interaktion far inte raknas som aktivt arbete.
- Engagerad tid byggs nar sidan ar i fokus och interaktion ar nylig.

Pedagogisk vinst:
- Mer rattvis bild av vem som faktiskt arbetar i passet.

## 2.3 Extremtider filtreras i speed-matt

Motiv:
- Avbrott (t.ex. nagon pratar med eleven) ska inte ge "langsam elev" i data.
- Personliga outliers rensas for battre jamforbarhet.

Pedagogisk vinst:
- Hastighetsmatt blir stabilare och mer anvandbara i klassrumsbeslut.

## 2.4 Sticky-status i gangertabeller

Motiv:
- Enstaka lyckade/misslyckade forsok ska inte omedelbart byta status.
- Stabilitet over dag/vecka ar viktigare an "senaste svaret".

Pedagogisk vinst:
- Lararen ser verklig progression i automatisering.

## 2.5 Framsteg med tydliga trosklar

Motiv:
- "Klarad" ska betyda nagon grad av stabilitet.
- Nuvarande tumregel: minst 5 forsok och minst 80% ratt.

Pedagogisk vinst:
- Nivaer markeras som klarade forst nar det finns rimligt underlag.

## 2.6 Felandel per niva visas med minsta underlag

Motiv:
- Smatt n ger stor slumpvariation.
- Minsta underlag pa 8 forsok minskar overtolkning.

Pedagogisk vinst:
- Lararen far mer robust signal om var eleven faktiskt fastnar.

## 2.7 Risk/Support-score ar prioriteringsstod, inte betyg

Motiv:
- Lararen behover snabb triagering av vem som ska fa stod forst.
- Score kombinerar flera svaghetssignaler till en handlingsordning.

Pedagogisk vinst:
- Tidsbesparing i klassrummet.
- Snabbare, mer systematiska interventioner.

## 3. Reliabilitet (tillforlitlighet)

## Styrkor

- Tidsmatt robustas med avbrotts- och outlierfilter.
- Median anvands i trendmatt dar extremvarden annars snedvrider.
- Sticky- och masterytrosklar minskar flimmer i status.
- Datakvalitetspanelen visar nar underlaget ar osakert.

## Risker

- Smatt elevunderlag i vissa grupper/nivaer.
- Olika enheter och sessionsmonster kan paverka telemetry.
- Korta observationsfonstrer kan ge dagsformsbias.

## Motatgarder i appen

- Minsta underlag i vissa vyer.
- Synliga flaggor for mismatch/session-gap.
- Separata vyer for dag, vecka och total.

## 4. Validitet (att vi matar "ratt sak")

## 4.1 Innehallsvaliditet

Positivt:
- Data finns pa flera nivaer: uppgift, niva, skill, raknesatt, tabell.
- Felkvalitet (rimlighet + felkategori) kompletterar ratt/fel.

Begransning:
- Appen matar den matte eleven gor i appen, inte all matematikformaga.

## 4.2 Begreppsvaliditet

Positivt:
- "Kunskap" operationaliseras inte bara som snabbhet.
- Langsamhet blockerar inte progression automatiskt.

Begransning:
- Heuristiska regler ar inte samma sak som full psykometrisk modell.

## 4.3 Kriterievaliditet

Praktisk tolkning:
- Hog validitet farst nar data trianguleras med:
  - lararobservation,
  - elevsamtal,
  - arbete utanfor appen.

## 5. Vad lararen bor gora for hog kvalitet i tolkning

1. Jamfor inom samma problemtyp+niva innan du jamfor mellan nivaer.
2. Separera kunskapsfel och ouppmarksamhet i dina slutsatser.
3. Krav pa minsta underlag innan starka beslut.
4. Titta pa trend over flera pass, inte en enskild lektion.
5. Anvand risk/stod som prioritering, inte som etikett pa elev.

## 6. Nasta steg for ytterligare robusthet

1. Lagga till konfidensmarkering per niva/skill (litet/medel/stort underlag).
2. Exponera osakerhetsintervall i exporter for centrala nyckeltal.
3. Utvardera masterytrosklar med verkliga elevdata och justera per raknesatt.
4. Lagg till valbart observationsfonster (t.ex. 14/30/60 dagar) i fler paneler.
5. Skapa en enkel "tolkningsguide" direkt i UI bredvid kritiska kolumner.

## 7. Slutsats

Nuvarande design ar byggd for **pedagogisk anvandbarhet i vardagen**:
- snabb att agera pa,
- transparent i hur siffror raknas fram,
- mer robust an ren ratt/fel-rakning.

Samtidigt ar det viktigt att se dashboarden som beslutsstod, inte slutgiltig diagnos.
Hogst nytta far du nar appdata kombineras med professionell lararbedomning.
