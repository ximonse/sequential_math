# Arbetslogg

## 2026-11-11 – 2026-11-14: Felförståelser tydliga för läraren (screening först)

Styrs av `docs/STYRNING_FELFORSTAELSER.md` (antagen 2026-11-11). Detaljer per
steg står där; kartkortet `misconception-governance` har beslut och belägg.
Den här posten är översikten: vad som gjordes, vem som beslutade vad, och
tankar som inte får tappas.

### Varför

En genomgång av 17 884 riktiga svar (2026-11-11) visade att appen räknade
fel men inte visade *tänkandet*: 74 % av felen var oförklarade, och 0 av 48
NCM-screeningfrågor hade struktur för analys. Simon: målet är mängdträning och
att fånga felförståelser, för individ och grupp, och göra dem "så jävla
tydliga för läraren". Hur läraren går vidare är fryst tills dess.

### Logg

- **11 nov.** Läraren kan bedöma screeningsvar (räkna som rätt, skriva in
  glömt svar, anteckna felförståelse); eleven varnas för tomma svar (e72973c).
- **12 nov.** Styrdokument och frysning (9fdfc22). En katalog för alla
  felmodeller med testspärr (e3af7d8). Täckningsräkning: varje fel räknas en
  gång (1f218a7). Decimalsvar når modellerna (cba7d3b, 342 svar). Nio modeller
  ur Simons läsning av oförklarade svar och signalen *ger upp* (397a88a).
- **13 nov.** *Samma uppgift fel tre gånger* (5b7f060). 46 felförståelser ur
  Simons två tabeller, NCM och "Förstå och använda tal", godkända av Simon
  (49caf3e, be6ffa0). Nycklar för NCM-frågorna, godkända (a61b60b, 33b543e).
  Steg 4: felförståelsekort i Screening → Resultat (a17db23, f8e4036). Läraren
  väljer felförståelse ur listan (06fc07f).
- **14 nov.** Två omgångar med Simons tolkningar ur produktionens
  screeningar: fem nya modeller, nycklar, tal ur lärarens egna frågor, v12
  (9cb7eea, 92cf2cb, 848b556). Rutin: läs uppställningen och pröva
  avskrivningsfel först (508730f). Steg 4 prövat i produktion på Kumlaby åk 6;
  intern text dold för lärare och tabellen scrollar till inramat svar
  (a08b47b). Elevrapporten visar alla misstankar, de svagare mindre (b150cdc).

### Siffror

| | Före | Efter |
| --- | ---: | ---: |
| Oförklarade fel, alla riktiga svar (2 889 fel) | 74 % | 1 247 st |
| Kumlaby åk 6, screening 11 nov: svar på felförståelsekort | 6 | 18 |
| Kumlaby åk 6, screening 11 nov: oförklarade | 17 | 2 |
| Felmodeller i katalogen | 62 | 80 |
| Godkända felförståelser | 0 | 46 |

Den frysta uppföljningskedjan kontrollerades vid varje regeländring:
befintliga kort oförändrade (senast 440 av 440).

### Simons beslut

- 11 nov: styrdokumentet antas; fokus screeningar; frysning av kontrastfrågor,
  materialkedja, avstämning, didaktikpaket, nya lägen och vyer.
- 12 nov: angränsande produkt och fel räknesätt kräver mönster över tre olika
  uppgifter (beslut 3); fel räknesätt är en felförståelse (beslut 4).
- 13 nov: samma uppgift fel tre gånger fångas oavsett svar. Felförståelser,
  inte bara felberäkningar; även hastighet, fokus och arbetsminne. Alla 46
  felförståelser och alla handskrivna nycklar godkända. Steg 4 enligt skiss.
  Läraren väljer felförståelse ur listan.
- 14 nov: tolkningar av 7 × 6,7 = 91 (7 + 6 · 7 från vänster, positionsfel
  kombinerat), 3 × 2,4 = 6,2 (glömd minnessiffra) och 3,2 (bara decimaldelen),
  84 / 6 = 12 ("kanske" tabellen till 12), tre fjärdedelar av 8 = 24 och 7/8.
  Ja till tal ur egna frågor. Avskrivningsfel ska prövas när svar inte går
  att förstå. "Ta bort tak tror jag", svagare misstankar längre ner och
  mindre. Belastning parkeras tills målet är nått.

### Agentens val (på Simons "välj du" eller som förslag han godtog)

- Fel räknesätt visas på screeningkortet redan första gången, märkt *en
  gång*; elevrapporten behåller kravet på tre uppgifter; angränsande produkt
  omfattas inte (slumprisk).
- Nya modeller hålls utanför den frysta kedjan (inga kontrastfrågor).
- 84 / 6 = 12 visas som känt fel utan felförståelse tills Simon bekräftar.
- Elevrapportens åtta kort stäms av som förut; resten visas utan avstämning,
  så att avstämningen och MCP inte rörs.

### Tankar och öppna frågor

- Vad missförstås vid fel räknesätt: tecknet, uppmärksamheten eller när man
  adderar och subtraherar? Pröva senare med textuppgifter utan tecken.
- Nämnaren som svar: oklart om felförståelse.
- 1,76 + 2,58 = 432 är fortfarande oförklarat.
- Avskrivningsfel: 357 + 268 = 614 var 357 + 257 rätt räknat. En signal som
  jämför uppställningens tal med uppgiftens är billig (ingen extra läsning);
  inte byggd.
- Simons idé: inställning för om eleven ställer upp själv eller appen gör
  det, som vid kort division. Fryst (nytt läge).
- Ej mätt: obesvarade med uträkning i nya screeningar efter varningen.
- Granskningslista med oförklarade svar och förslag:
  `Hermes Vault/Skola och lektioner/Matematik/Oforklarade-felsvar-for-granskning-2026-11-14.md`.

### Parkerat: belastning (mätt 14 nov, skrivskyddat)

- Lärarvyns elevlista hämtar hela profilen för alla elever: 44 MB och 15 s för
  211 elever, automatiskt varannan minut.
- Elevens sparande skickar hela profilen (upp till 3,9 MB) var 30:e sekund.
- Screeningens felförståelsevy läser alla elevens screeningförsök: ca 12 s.
- Förslag i ordning: sammanfattad elevlista, sparande av bara nya svar,
  felförståelsevyn läser bara aktuell screening. Tas upp när målet är nått.

### Nästa

Skulden i steg 1: 42 modeller utan lärarbeskrivning och 23 rubriker som
väntar på granskning, som en granskningslista till Simon.

## 2026-03-25

### Fas 1 implementerad och pushad — masteryFacts

Permanent append-only mastery-logg som överlever problemLog-trimning.

**1a. masteryFacts i profilen + migration**
- `studentProfile.js`: ny `masteryFacts: { version: 1, facts: [], revokedIds: [] }` i `createStudentProfile()`
- `profileMigration.js`: `migrateMasteryFacts()` skapar facts automatiskt från befintlig problemLog vid första load
- `masteryCalculation.js`: ny `recordMasteryAchievement()` och `getMasteredLevelsFromFacts()`

**1b. Skrivning vid mastery-uppnående**
- `studentProfile.js`: `addProblemResult()` jämför mastery före/efter, skriver fact vid ny mastery
- `sessionUtils.js`: `recordTableCompletion()` skriver mastery-fact för tabellträning

**1c. Läsning med fallback**
- `computeEffectiveLevels()` och `computeMasteryOverview()` konsulterar masteryFacts som primär källa
- Fallback till problemLog-beräkning om facts saknas
- Retroaktiv fact-skrivning om mastery finns i log men inte i facts

**1d. Server merge**
- `api/student/[studentId].js`: `mergeMasteryFacts()` — union av facts (idempotent på id), dedup per operation+level (behåll äldsta), union av revokedIds

Referens-commit:
- `2b881fd` - Sync phase 1: permanent masteryFacts

### Fas 2 implementerad och pushad — Write-Ahead Log (WAL)

Event-baserad sync som komplement till hel profil-sync.

**2a. WAL-implementation**
- Ny `syncWal.js`: append-only event-logg i localStorage per elev (max 500 entries)
- Funktioner: `createWalEntry`, `appendToWal`, `getUnsynced`, `markSynced`, `pruneWal`

**2b. WAL-skrivning i klient**
- `addProblemResult()` returnerar `walEntries` (problem_result, mastery_achieved)
- `usePracticeCoreActions.js` skriver WAL-entries vid varje svar + table completion

**2c. Server-endpoint**
- `POST /api/student/{id}/events` — tar emot WAL-entries, applicerar idempotent på server-profil
- Stöder: problem_result, mastery_achieved, table_completed
- Returnerar ack-array för synkade entries

**2d. Sync-integration**
- `storageCloudSync.js`: `syncWalEntries()` skickar osynkade entries parallellt med hel profil-sync
- Dual-write under övergångsperioden (bälte och hängslen)
- Pruning av ack:ade entries efter 24h

**Beslut:** Fas 2e (immutable React-state) skjuts upp — hög risk, begränsat mervärde utöver Fas 0+1.

### Backup
Dumpade alla 44 elevprofiler från prod-KV till `backups/backup-elevprofiler-2026-03-24.json` (76 MB) innan Fas 2.

Referens-commit:
- `47aeb72` - Sync phase 2: Write-Ahead Log (WAL) for resilient event sync

### Fas 3 implementerad och pushad — Cleanup

**3a. Borttagen effectiveLevels-dubblett**
- `studentProfile.js`: slutar skriva `profile.effectiveLevels`
- `dashboardClassMasteryHelpers.js`: läser bara `teacherSummary?.effectiveLevels`

**3b. teacherSummary/effectiveLevels ignoreras vid merge**
- `api/student/[studentId].js`: `delete merged.effectiveLevels` + `delete merged.teacherSummary` efter merge — dessa är cache, inte source of truth

**3c. skillStates verifierad**
- `adaptive.skillStates` används aktivt av adaptiva motorn — behålls

**3d. Explicit merge-schema**
- Ny `profileMergeSchema.js`: varje profilfält MÅSTE ha definierad merge-strategi
- Ny `profileMergeSchema.test.js`: testar att alla fält i createStudentProfile + runtime-fält har strategi
- Fångar framtida fält som saknar merge-logik via test-failure

Referens-commit:
- `ace5afd` - Sync phase 3: remove duplicates, explicit merge schema, ignore cache fields

### Sync-arkitekturöversyn avslutad

Alla 4 faser implementerade och i prod:
- **Fas 0**: React-state efter merge, sendBeacon, snapshot-kö (commit `e2ab609`)
- **Fas 1**: masteryFacts — permanent mastery-logg (commit `2b881fd`)
- **Fas 2**: WAL — event-baserad sync med dual-write (commit `47aeb72`)
- **Fas 3**: Cleanup — dubbletter borta, merge-schema, cache ignoreras (commit `ace5afd`)
- **Fas 2e** (immutable React-state): Uppskjuten — hög risk, begränsat mervärde

## 2026-03-23

### Problemet
Elever (iPads i klassrummet) förlorade sina framsteg — gångertabeller som var gröna (klara) försvann plötsligt. Lärardashboarden visade inga nivåer för majoriteten av eleverna.

### Analys — systemiskt arkitekturproblem
Djupanalys av hela sync-lagret och träningssystemet avslöjade fem grundläggande brister:

1. **Mastery beräknas, aldrig lagrad.** `effectiveLevels` och `teacherSummary` räknas om från `problemLog` (max 5000 poster). Trimmas loggen → mastery försvinner. Servern räknar aldrig om efter merge.

2. **React-state uppdateras aldrig efter cloud merge.** `getOrCreateProfileWithSync()` returnerar lokal profil direkt. Cloud-merge körs async och skriver till localStorage, men React-state (`setProfile`) anropas aldrig med merged profil. Eleven jobbar hela sessionen med potentiellt gammal data.

3. **iPads tappar data tyst.** 90s sync-throttle + `beforeunload`/`pagehide` är opålitliga på iOS Safari. Retry-kön sparade bara `studentId`, inte profil-snapshot — om eleven loggade ut innan retry → data borta.

4. **Merge-logiken gissar.** `{...older, ...fresher}` spread: alla fält som inte explicit hanteras vinner baserat på freshness-timestamp. `undefined`-fält i "vinnande" profilen skriver över befintlig data. Nya fält i framtiden hanteras inte.

5. **Dubbla sanningskällor.** `effectiveLevels` på två ställen. `operationAbilities` kan säga multiplication=12 medan `effectiveLevels.multiplication=4`. `tableDrill.completions` och `effectiveLevels` kan säga motsatta saker.

### Vercel/KV-åtkomst uppsatt
Satte upp Vercel CLI mot projektet "sekvens" och hämtade KV-credentials. Kan nu köra queries direkt mot prod-datan: `node --env-file=.env.local -e "const { kv } = await import('@vercel/kv'); ..."`.

### Profilscan — 30 av 44 trasiga
Skannade alla 44 elevprofiler i prod:
- **30 profiler** saknade `teacherSummary` och `effectiveLevels` helt (= `undefined`)
- **Hugo** hade dessutom `currentDifficulty: 1` trots `highestDifficulty: 12` och alla `operationAbilities: 12`
- **14 profiler** (Simon, Juni, Jasmine m.fl.) var intakta — troligen pga stabil enhet (dator, inte iPad)

### Reparation
Skrev skript som beräknade `teacherSummary` + `effectiveLevels` från befintlig `problemLog` för alla 25 profiler med data. Hugos `currentDifficulty` fixades 1 → 12. Skrevs direkt till Upstash KV.

### Arkitekturplan
Skrev komplett plan i 4 faser: `docs/superpowers/plans/2026-03-23-sync-arkitektur-plan.md`
- **Fas 0** (akut): React-state efter merge, visibilitychange+sendBeacon, snapshot i retry-kö
- **Fas 1**: `masteryFacts` — append-only logg av mastery-uppnåenden som aldrig trimmas
- **Fas 2**: Write-Ahead Log (WAL) — individuella events istället för "skicka hela profilen"
- **Fas 3**: Rensa dubbletter, explicit merge-schema, teacherSummary server-side

### Fas 0 implementerad och pushad
Ändringar i 6 filer:

**0a. React-state uppdateras efter cloud merge**
- `storageStudentApi.js`: `getOrCreateProfileWithSync` tar `onCloudMerge`-callback
- `usePracticeSetupEffects.js`: skickar `onCloudMerge: (merged) => setProfile(merged)`

**0b. visibilitychange + sendBeacon**
- `storageCloudSync.js`: ny `attemptSendBeaconSync()` med `navigator.sendBeacon` (pålitligare på iOS)
- `initCloudSyncListeners`: lyssnar på `visibilitychange` → `hidden` utöver `beforeunload`

**0c. Profil-snapshot i retry-kö**
- `storageCloudSyncQueue.js`: `addPendingSync` sparar profil-snapshot i `mathapp_pending_snapshot_{id}`
- `retrySyncForStudent` och `flushPendingSyncs` använder snapshot som fallback

**Bonus**
- Sync-throttle 90s → 30s
- Mastery-stabilitet: 20+ försök med 90%+ totalt överlever tillfälliga dipp (< 70% bryter)

### Verifiering
- `vite build` OK
- Dev-server: appen laddar, storage-moduler fungerar, sendBeacon/visibilitychange API:er tillgängliga
- Snapshot save/load/cleanup-cycle verifierad i browser

Referens-commit:
- `e2ab609` - Sync phase 0: fix data loss on iPads and stale React state

## 2026-03-16

- Fixade kritisk bugg: molnsync misslyckades tyst pa iPad nar sessionssekret lagrades i sessionStorage (som rensas vid tab-kill). Flyttade till localStorage.
- Tabelltraningsresultat synkroniseras nu direkt (forceSync) istallet for att vanta pa 90-sekunders throttle.
- Lade till explicit 401-hantering och authStale-flagga i molnsync sa att foraldrade sessioner upptacks.
- Lade till CORS-headers pa teacher-class-extras och class-config API-endpoints.
- Fixade merging av adaptiv engine-state vid profilmerge (operationAbilities tar max, skillStates behaller version med flest forsok).
- Bytade till timing-safe jamforelse for losenord pa servern.
- Tog bort error.message fran 500-svar (lakage).
- Fixade UI: "Startsida"-knappen doldes bakom temaväljaren — lade till pr-44 padding.
- Lade till 21-dagars stapeldiagram for gangertabellsaktivitet i lararens elevdetalj (mellan "senast tranad" och "Framsteg").
- Fixade kraschbugg i useDashboardViewData — recentProblems accessades utan Array.isArray-guard pa nya elever.
- Fixade "Traff elev"-kolumnen i Svarighetsanalys: fargkodningen anvande felandel istallet for traffprocent (inverterad signal). Nu fargas korrekt: gron >= 80%, amber >= 60%, rod < 60%.
- Fixade sortering av "Traff elev" — sorterade pa errorShare istallet for successRate, sa "Storst forst" gav samsta eleverna overst.
- Fixade DST-bugg i stapeldiagrammet — bytade fran fast 24h-division till per-bucket dayStart-jamforelse.
- Ny panel: "Nivaoversikt" — klassvy med effektiv konsekutiv masteryniva per elev per operation. Visar hogsta sammanhanande klarade nivan (inte hogsta enskilda). Sortbar pa alla kolumner och snitt.

Referens-commits:
- `9b7065f` - Fix critical cloud sync bug, add CORS, harden auth and profile merge
- `137dc5d` - Add right padding to session header so exit button clears theme switcher
- `4de115e` - Add 21-day table drill activity bar chart to teacher dashboard
- `9468553` - Fix dashboard bugs: crash guard, accuracy color/sort, DST bar chart
- `65f7c14` - Add class mastery level overview panel to teacher dashboard

## 2026-03-07

- Lade till division niva 1 och 2 i uppgiftsgenereringen och gjorde dem synliga i elevens Framsteg.
- Fri traning fick strikt nivalasning per global lagsta ofardiga niva, med rotation mellan domaner pa samma niva.
- En-domantraning fick nivalasning till lagsta ofardiga niva.
- Framsteg (niva-fokus via klick pa niva) fortsatter utan nivalas, dvs explicit vald niva styr.
- Lade till hoegerjusterad `Ga till nasta niva`-knapp i niva-fokusbannern efter nekat erbjudande om niva-hojning.
- Lade till tester for sessionslogik kopplat till nivalas och nasta-niva-beteende.
- Lade till explicita sorteringskontroller i larardashboardens Svarighetsanalys:
  - sortera efter kategori
  - ordning (A-O / O-A eller minst-storst)
- Verifiering kord: `npm run test` och `npm run build` passerade efter andringarna.

## 2026-03-12

- Tog bort tempovalet (Utmaning/Lugn) — var i praktiken en no-op med lockToMasteryFloor.
- Nivaerbjudande fungerar nu i alla single-domain-sessioner, inte bara steady-lage.
- Framsteg-kortet laser nu fran problemLog (5000) istallet for recentProblems (250) sa resultat inte forsvinner efter fri traning.
- Mastery-berakning anvander sliding window (senaste 15 forsok per niva) konsekvent i bade traning och Framsteg.
- Fixade bugg dar mastery aldrig uppnaddes om tidiga misstag under inlarning drog ner snittet.
- Bytte "Avsluta"-knapp till "Startsida".
- Flyttade temaväljaren till horisontell layout med kontrastknapp bredvid.
- Lade till CSS-overrides for alla fargfamiljer (kontrast i mörka teman).
- Snabbade upp sessionsstart: lokal profil returneras direkt, molnsync i bakgrunden.

## Referens-commits

- `56d5391` - Add division levels 1-2 and expose them in progress
- `f35d97f` - Enforce training level locks and add level-focus next-level action
- `7b17df9` - Add explicit sorting controls for teacher difficulty analysis
