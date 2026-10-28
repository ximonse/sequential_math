# Spårbart elevunderlag, kontrakt v1

Implementerat lokalt 2026-10-27. Detta är ett läskontrakt, inte en färdig
AI-analys eller MCP-server. Det hämtar inga elevdata utan ett autentiserat
anrop. Utveckling och verifiering använder syntetiska elever.

Tillägg: revisionsbundet original kan läsas med `format=notebook` på ett
detaljanrop med `ref` och `snapshotRevision`. Text/status och lokal MCP-PNG
beskrivs i [PUPIL_NOTEBOOK_EXPORT.md](PUPIL_NOTEBOOK_EXPORT.md). Inga nya
skrivbehörigheter införs.

## Anrop

`GET /api/teacher-students/PUPIL_ID?resource=evidence&classId=CLASS_ID&from=2026-10-19&to=2026-10-25`

Samma lärarinloggning som elevdetaljvyn (`x-teacher-token` eller befintlig
lärarsession). Svar har `Cache-Control: no-store`. Ingen skrivning till elev,
mastery, uppdrag eller analys sker. Befintligt anrop utan `resource=evidence`
behåller sitt tidigare format.

- `from` och `to` är obligatoriska giltiga kalenderdatum. Båda dagarna ingår,
  enligt Europe/Stockholm. Internt används inklusive start och exklusivt slut;
  ett dygn vid tidsomställning kan vara 23 eller 25 timmar.
- `classId` måste vara en aktuell, icke arkiverad klass som eleven tillhör och
  läraren får hantera. Raderad elev/klass och indragen åtkomst avvisas.
- `source=practice` är standard. `screening` eller `all` kräver också samma
  admin/skoladmin-, aktiverings- och pilotgräns som befintlig Screening.
  En vanlig lärare får 403 om screening begärs; inga källor utelämnas tyst.
- `limit=1..100`, standard 50. `nextCursor` används för nästa sida. Underlaget
  läses om och behörigheten kontrolleras vid varje anrop.
- `snapshotRevision` identifierar exakt det projicerade underlaget. Nästa sida
  ska använda svarets `cursor` och `snapshotRevision`. Ändrat underlag ger
  409 `evidence_changed`; klienten börjar om uttryckligen, inte mitt i exporten.
- Detalj: skicka `ref=...&snapshotRevision=...` med samma elev, klass, källa
  och datum. Okänd referens ger 404; saknad revision 400. Returnerar `entry`
  i stället för `entries`. Räknehäftets snapshot och händelser finns bara här.

## Svar och identitet

Svaret innehåller `schemaVersion: 1`, elev-/klass-ID, begärd `source`, `period`,
`snapshotRevision`, `coverage`, `total`, `entries` och `nextCursor`.
Varje post skiljer på:

- `question`: visad fråga, struktur och källans uppgiftsidentitet;
- `answer`: faktiskt elevsvar, lagrat/regelberäknat facit och bedömningsstatus;
- `context`: innehåll/nivå, evidensklass, träningsram, tidskvalitet där känt;
- `interpretation`: befintlig felkategori och mönster, utan nya AI-slutsatser;
- `reference`: riktig observationsidentitet eller tydligt märkt legacyposition;
- `ref`: detaljreferens som är bunden till hela källsnapshoten.

Endast uttryckliga `correct: true/false` blir rätt/fel. Partiella svar och
okänd bedömning hålls isär. Saknad felkategori är `unknown`, även om svaret
är fel. Inga kunskapsfel eller orsaker uppfinns för äldre data.

Träningsposter med samma observations-ID dedupliceras bara när deras
projicerade innehåll också stämmer. Motstridiga versioner behålls och flaggas.
Lika svar/tid utan säker identitet dedupliceras inte. Legacypositioner är
bara meningsfulla tillsammans med snapshotrevisionen, aldrig som nya
globala observations-ID:n.

Screening använder befintligt attempts-ID och `observationRevisionId`, med
serverrevision och händelsesekvens kontrollerade mot det sparade originalet.
Frågan hämtas från utdelningens frysta version. Bildsvar behåller alternativ-ID:n
och rättade/missade/felaktigt valda alternativ. Skrivsvar förblir manuellt
bedömda. Originalets rutnät och händelser returneras orörda i detaljläsningen;
en eventuell senare rättad lösning ska vara separat.

## Period och historikens begränsningar

`coverage` är en redovisning av tillgängliga data, inte ett löfte om full historik.

- Träning väljer `problemLog`, eller tydligt märkt reservkälla
  `recentProblems` om loggen saknas/är tom. Befintliga loggar är begränsade.
  `completeness` är därför `unknown`, även om äldsta/senaste tid täcker perioden.
  Antal lagrade poster, kända dubbletter och ogiltiga tidsstämplar redovisas.
- Screening läser bara elevens indexerade försök i den begärda klassen.
  Saknade/oförenliga frysta poster räknas och varnas om; indexets fullständighet
  är okänd. Högst 1000 indexerade försök stöds per läsning, annars 413.
- Träningsperioden avser svarets tidsstämpel. Screeningperioden avser senaste
  sparade klienthändelsen per försök, eller serverns öppningstid om händelser
  saknas. `timeBasis` och `timeQuality` anger skillnaden. Klienttid är inte
  en verifierad mottagningstid på servern.
- Det är **senaste sparade försök**, inte en rekonstruktion av tillståndet vid
  periodens slut. Ett försök ändrat efter perioden ingår följaktligen inte
  som ett äldre låtsassnapshot. Detaljläsning inkluderar hela försöksförloppet,
  även händelser före periodstart. Inget svar kan ge osynkad lokal elevdata.
- Avsaknad av poster är inte belägg för att eleven saknar kunskap eller aldrig
  har tränat. Ingen uppgift om en annan elev följer med; profilens lösenord,
  privata etiketter och andra orelaterade profilfält ingår inte.

## Export och provning

`scripts/teacher-data.mjs --evidence --pupil NAMN --class KLASS --from ... --to ...`
använder detta API och hämtar samtliga sidor från samma revision. Resultatet
blir `.evidence.json` utanför repot. `--source all` begär även behörig Screening.
Flera elevträffar avvisas. `--wrong-only` får inte kombineras med `--evidence`,
eftersom analysen behöver rätta svar och motexempel.

Vanlig CSV/JSON-export använder samma träningsprojektion och periodtolkning,
plus en `.coverage.json` med källrevision/täckning. Den äldre exportvägen
fungerar även mot tidigare API; den nya `--evidence` kräver det nya API:t.
Ingen automatisk fallback sker om det saknas. Lokalt implementerat betyder
inte att anropet redan finns på produktionsdomänen.

Tester: datum/DST, exakta gränser, legacydata, dubbletter/ID-konflikter,
versionsbunden sidbläddring/detalj, uppställningsoriginal och behörigheter.
`robots/pupil-evidence.robot.js` kör eleven som sparar rätt/fel genom appen
och kontrollerar lärarens verkliga API-läsning mot syntetisk minneslagring.
Det är varken verklig KV eller fysisk iPad-provning.

Lokal [rapport och läraravstämning](PUPIL_ANALYSIS.md) använder samma
underlag och källrevision. Se [planen](../TODO_AI_ELEVUPPFOLJNING.md) för senare
MCP, godkända uppföljningsutkast och elevdokument med rättat eget arbete.
