# Sync & Datalager -- Arkitekturplan

Datum: 2026-03-23
Status: UTKAST -- invanta Simons ok innan fas 1 borjas

---

## Sammanfattning

Profilen ar idag en enda muterbar blob som kopieras till tre stallen (React-state, localStorage, Redis) med en merge-strategi som gissar. Mastery beraknas fran trimmad data och kan forsvinna. iPads tappar data tyst. Larar-dashboarden visar stale cache.

Planen delar upp profilen i separata datakategorier med tydlig agare, infor persistent mastery-lagring, och bygger om sync till en robust offlinefirst-modell med synlig feedback -- allt i fyra faser dar varje fas ar deploybar.

---

## Innehall

1. [Ny datamodell](#1-ny-datamodell)
2. [Ny sync-arkitektur](#2-ny-sync-arkitektur)
3. [Fas 0: Akuta fixar (1-2 dagar)](#fas-0-akuta-fixar)
4. [Fas 1: Persistent mastery-lager (3-5 dagar)](#fas-1-persistent-mastery-lager)
5. [Fas 2: Sync-omskrivning (5-7 dagar)](#fas-2-sync-omskrivning)
6. [Fas 3: Profiluppdelning och cleanup (3-5 dagar)](#fas-3-profiluppdelning-och-cleanup)
7. [Risker och fallbacks](#risker-och-fallbacks)

---

## 1. Ny datamodell

### Princip: En sanning per datakategori

| Datakategori | Auktoritativ kalla | Typ | Merge-strategi |
|---|---|---|---|
| Mastery-fakta | `masteryFacts` (ny) | Permanent append-log | Union (aldrig radera) |
| Problemhistorik | `problemLog` | Tidssorterad append-log | Dedup pa problemId + timestamp |
| Adaptiv state | `adaptive` | Last-writer-wins per falt | Fresher timestamp vinner |
| Telemetri | `telemetry` | Dagsbuckets + event-ring | Max per bucket, union events |
| Profil-metadata | `profile` (topp-niva) | Skalara falt | Explicit per-falt-strategi |
| Auth | `auth` | Senaste passwordUpdatedAt | Senaste vinner |
| TeacherSummary | `teacherSummary` | **Cache** | Beraknas om, aldrig mergas |
| effectiveLevels | **Tas bort** | Dubblett | Lases fran teacherSummary |
| stats.typeStats | **Tas bort** | Deriverad | Beraknas fran problemLog |

### Ny struktur: `masteryFacts` (hjartpunkten i planen)

```
masteryFacts: {
  version: 1,
  facts: [
    {
      id: "addition:3:1711234567890",     // operation:level:timestamp
      operation: "addition",
      level: 3,
      achievedAt: 1711234567890,           // nar mastery uppnaddes
      window: { attempts: 15, correct: 14, rate: 0.93 },
      source: "session"                    // "session" | "migration" | "server-recompute"
    }
  ],
  revokedIds: []                           // om en mastery visade sig felaktig
}
```

**Varfor denna struktur:**
- Append-only: inga gamla fakta forsvinner nar problemLog trimmas
- Idempotent: samma mastery-fakt genererar samma id -> safe att merga
- Revocable: om en bugg skapade falska facts kan de markeras som revoked
- Latt att merga: union av `facts` minus `revokedIds`
- Latt att kvariera: "vilka nivaer har eleven mastered for addition?" = filter + map

### Vad som forsvinner ur profilen

- `effectiveLevels` (topp-niva) -- dubblett av `teacherSummary.effectiveLevels`
- `stats.typeStats` -- beraknas fran recentProblems, aldrig tvaart
- `stats.weakestTypes` / `stats.strongestTypes` -- deriverad
- `adaptive.skillStates` -- hundratals entries, aldrig last av motorn. Tas bort efter verifiering.

### teacherSummary blir "berakna vid behov"

Idag: `teacherSummary` beraknas i `addProblemResult()`, sparas i profilen, skickas till servern, mergas via spread (fel).

Nytt:
- `teacherSummary` beraknas **pa servern** vid GET /api/students (bulk-lista)
- Klienten beraknar fortfarande lokalt for session-vyn
- Servern lagrar **aldrig** teacherSummary i Redis -- den beraknas fran problemLog + masteryFacts

---

## 2. Ny sync-arkitektur

### Problem idag

```
Elev svarar -> mutera profil in-place -> save localStorage -> fire-and-forget cloud sync
                                                                 |
                                                                 v
                                                          server mergar
                                                                 |
                                                                 v
                                                          returnerar merged profil
                                                                 |
                                                                 v
                                                          skriv till localStorage
                                                          (React-state uppdateras ALDRIG)
```

### Nytt flode

```
Elev svarar -> skapa immutable result-record
                  |
                  +-> spara result i localStorage write-ahead-log (WAL)
                  |
                  +-> applicera result pa React-state (ny referens, inte mutation)
                  |
                  +-> koa sync till server

Server tar emot:
  - WAL-entries (inte hel profil)
  - Applicerar entries pa server-side profil
  - Returnerar ack + serverVersion

Klient:
  - Tar bort ack:ade entries fran WAL
  - Vid sessionstart: hamta serverVersion, applicera lokala WAL pa toppen
```

### Write-Ahead Log (WAL)

```
// localStorage: mathapp_wal_{studentId}
[
  {
    id: "wal_1711234567890_abc",
    type: "problem_result",          // | "mastery_achieved" | "table_completed" | "difficulty_adjusted" | ...
    studentId: "ABC123",
    timestamp: 1711234567890,
    payload: { ... result-objektet ... },
    syncedAt: null                    // satt nar servern ack:ar
  }
]
```

**Varfor WAL:**
- Data forsvinner aldrig -- inte ens om sync misslyckas + eleven loggar ut
- Servern behover inte gissa vilken kopia som ar fraskas
- Varje entry ar idempotent (samma id = ignore vid re-send)
- iPad-safe: aven om pagehide inte far kora, ligger data i WAL till nasta gang

### Sync-timing (iPad-anpassad)

| Trigger | Idag | Nytt |
|---|---|---|
| Throttle | 90s | **30s** |
| forceSync | Vid mastery/tabell-klar | Vid mastery + tabell-klar + session-slut + login |
| pagehide | beforeunload (opalitilig iOS) | **visibilitychange** + navigator.sendBeacon (palitilig iOS) |
| Retry | Exponential backoff, bara studentId | Exponential backoff, **WAL-entries** |
| Feedback | Ingen | **SyncStatusIndicator-komponent** (liten ikon i session-vyn) |

### SyncStatusIndicator

Liten visuell indikator (gron/gul/rod prick) i session-header:
- Gron: alla WAL-entries synkade
- Gul: synk pagar / entries vantar
- Rod: sync misslyckad 3+ ganger, visa "Dina framsteg sparas lokalt"

---

## Fas 0: Akuta fixar

**Syfte:** Stoppa datforlust IDAG utan att andra arkitekturen.

### 0a. React-state uppdateras efter cloud merge

**Problem:** `getOrCreateProfileWithSync()` returnerar lokal profil, kör cloud-merge async. Resultatet skrivs till localStorage men React-state uppdateras aldrig. Eleven jobbar med gammal data hela sessionen.

**Fix:**
- `usePracticeSetupEffects.js`: efter `getOrCreateProfileWithSync()` returnerar, subscribea pa ett callback som kors nar cloud merge ar klar
- Alternativt: lat `getOrCreateProfileWithSync()` returnera en Promise som resolver EFTER cloud merge (inte fore)
- Om merge returnerar en nyare profil -> `setProfile(mergedProfile)`

**Filer:** `src/lib/storageStudentApi.js`, `src/components/student/session/usePracticeSetupEffects.js`

**Bakåtkompatibilitet:** Full. Beteendet forbattras, inget tar bort.

**Definition of done:** Oppna app pa iPad A, svar pa 5 fragor. Oppna pa iPad B, se att profilen har de 5 svaren (efter reload).

### 0b. Byt fran beforeunload till visibilitychange + sendBeacon

**Problem:** `beforeunload` ar opalitligt pa iOS Safari. Data i pending-kön forsvinner.

**Fix:**
- `storageCloudSync.js`: lagg till `visibilitychange`-lyssnare
- Nar `document.visibilityState === 'hidden'`: skicka pending data via `navigator.sendBeacon()` (som `keepalive: true` men mer palitligt pa iOS)
- Behall `beforeunload` som fallback

**Filer:** `src/lib/storageCloudSync.js`

**Bakåtkompatibilitet:** Full. Extra lyssnare, befintliga behalles.

**Definition of done:** Stang iPad-flik mitt i session, oppna igen, verifiera att senaste svaret finns i cloud.

### 0c. Sync-ko sparar profil-snapshot, inte bara studentId

**Problem:** `storageCloudSyncQueue.js` sparar bara `Set<studentId>`. Om sync misslyckas och eleven loggar ut (klarar session-secret) finns ingen profil att synka.

**Fix:**
- Utoka `addPendingSync(studentId)` till att ocksa spara senaste profil-snapshot i en separat localStorage-nyckel (`mathapp_pending_snapshot_{studentId}`)
- `retrySyncForStudent()` anvander snapshot om den finns, annars laddar fran localStorage som idag
- Rensa snapshot nar sync lyckas

**Filer:** `src/lib/storageCloudSyncQueue.js`, `src/lib/storageCloudSync.js`

**Bakåtkompatibilitet:** Full. Ny localStorage-nyckel laggs till, inget andras i befintligt flode.

**Definition of done:** Eleven loggar in, svarar 3 fragor, sync misslyckas (mockad), eleven loggar ut, loggar in igen pa annan enhet, data finns.

---

## Fas 1: Persistent mastery-lager

**Syfte:** Mastery-fakta overlever trimning av problemLog. "Tabell 3 klar" forsvinner aldrig.

### 1a. Infor masteryFacts i profilen

- Lagg till `masteryFacts: { version: 1, facts: [], revokedIds: [] }` i `createStudentProfile()`
- Skriv migreringskod i `profileMigration.js` som skapar `masteryFacts` fran befintlig `problemLog` vid forsta load (baserat pa `computeMasteryOverview()`)
- **Viktigt:** migreringen ar additiv -- den laggar till `masteryFacts` men andrar inget annat

**Filer:**
- `src/lib/studentProfile.js` -- lagg till `masteryFacts` i `createStudentProfile()`
- `src/engine/profileMigration.js` -- ny migreringsfunktion
- `src/lib/masteryCalculation.js` -- ny funktion `recordMasteryAchievement(profile, operation, level, window)` som appendar till `masteryFacts.facts`

**Bakåtkompatibilitet:** Profiler utan `masteryFacts` far det vid load via migration. Inga befintliga falt andras.

**Definition of done:** Ladda en befintlig profil, verifiera att `masteryFacts.facts` innehaller ratt mastery baserat pa problemLog.

### 1b. Skriv mastery-fakta vid mastery-uppnaende

- I `addProblemResult()` (efter rad 181 dar `teacherSummary` beraknas):
  - Jamfor mastery fore och efter
  - Om en ny niva just mastrades: anropa `recordMasteryAchievement()`
- I `sessionUtils.js` `recordTableCompletion()`:
  - Skriv ett mastery-faktum for tabell-drill

**Filer:**
- `src/lib/studentProfile.js` (addProblemResult)
- `src/components/student/session/sessionUtils.js`

**Bakåtkompatibilitet:** Full. Befintlig mastery-berakning andrars inte, masteryFacts ar en EXTRA kanal.

### 1c. Las mastery fran masteryFacts (med fallback)

- `masteryCalculation.js`: ny funktion `getMasteredLevelsFromFacts(profile, operation)`
  - Returnerar nivåer fran `masteryFacts.facts` (filtrera bort `revokedIds`)
  - Fallback: om `masteryFacts` saknas eller ar tom, berakna fran problemLog som idag
- `computeEffectiveLevels()` -- anvand `getMasteredLevelsFromFacts()` som primare kalla
  - Om nivan finns i facts: mastered (aven om problemLog trimmats)
  - Om nivan finns i problemLog men inte facts: mastered + skriv retroaktivt till facts
- `computeMasteryOverview()` -- samma logik

**Filer:**
- `src/lib/masteryCalculation.js`

**Bakåtkompatibilitet:** Full fallback. Om `masteryFacts` ar tomt beter sig allt som idag.

**Definition of done:**
1. Elev mastered addition niva 3 (15 ratt av 15)
2. Trimma problemLog manuellt (ta bort alla entries for addition:3)
3. Ladda om -> niva 3 ar fortfarande gron (fran masteryFacts)

### 1d. Merge-logik for masteryFacts pa servern

- `api/student/[studentId].js`: ny funktion `mergeMasteryFacts(existing, incoming)`
  - Union av `facts` baserat pa `id`-falt (idempotent)
  - Union av `revokedIds`
  - Inga fakta raderas, bara laggs till

**Filer:**
- `api/student/[studentId].js`

**Bakåtkompatibilitet:** Full. Om profilen saknar `masteryFacts` skapas det fran incoming.

---

## Fas 2: Sync-omskrivning

**Syfte:** Palitlig offline-first sync som fungerar pa iPads. Data forsvinner aldrig.

### 2a. Infor Write-Ahead Log (WAL)

Ny fil: `src/lib/syncWal.js`

```
// API:
createWalEntry(type, studentId, payload) -> entry med unik id
appendToWal(entry) -> sparar i localStorage
getUnsynced(studentId) -> entries dar syncedAt === null
markSynced(entryIds) -> satt syncedAt
getWalSize(studentId) -> antal osynkade entries
pruneWal(studentId, maxAge) -> ta bort synkade entries aldre an maxAge
```

- Varje WAL-entry ar ett immutable event (problem_result, mastery_achieved, table_completed, difficulty_adjusted, telemetry_event)
- WAL lagras i `localStorage` under `mathapp_wal_{studentId}`
- Max storlek: 500 entries (aldre synkade entries prunas automatiskt)

**Filer:**
- `src/lib/syncWal.js` (ny)

### 2b. addProblemResult skriver till WAL

Idag muterar `addProblemResult()` profilen in-place och anropar `saveProfile()`.

Nytt:
- `addProblemResult()` skapar result-record som idag
- Skriver till WAL via `appendToWal({ type: 'problem_result', payload: result })`
- Muterar profilen lokalt (for React-state)
- `saveProfile()` sparar till localStorage som idag
- Sync-lagret laser fran WAL istallet for att skicka hel profil

**Viktigt:** Fas 2b ar den storsta omskrivningen. React-state-hanteringen maste ocksa andras -- `profile` ska vara immutable (ny referens per uppdatering) istallet for mutering by-reference.

**Filer:**
- `src/lib/studentProfile.js` (addProblemResult)
- `src/lib/storage.js` (saveProfile)
- `src/lib/syncWal.js`

**Bakåtkompatibilitet:**
- WAL ar additiv -- aven om servern inte forstar WAL-format annu, faller vi tillbaka pa befintlig hel-profil-sync
- Dubbelt skrivande: bade WAL + befintlig saveProfile under overgangen

### 2c. Server accepterar WAL-entries

Nytt API-lage:

```
POST /api/student/{id}/events
Body: { entries: [...wal-entries], clientVersion: number }
Response: { ack: [...entry-ids], serverVersion: number }
```

- Servern tar emot WAL-entries
- Applicerar dem pa server-side profil (i tidsordning)
- Returnerar ack for varje entry som applicerats
- Klienten tar bort ack:ade entries fran WAL

Befintligt `POST /api/student/{id}` (hel profil) behalles som fallback.

**Filer:**
- `api/student/[studentId]/events.js` (ny)
- `api/student/[studentId].js` (andras INTE -- behalles som fallback)

### 2d. Nya sync-triggers

- Byt fran 90s throttle till 30s
- Lagg till `visibilitychange` lyssnare (utover befintlig `beforeunload`)
- Anvand `navigator.sendBeacon` for pagehide pa iOS
- Lagg till `SyncStatusIndicator` React-komponent

**Filer:**
- `src/lib/storageCloudSync.js`
- `src/components/student/SyncStatusIndicator.jsx` (ny)
- `src/components/student/session/StudentSession.jsx` (inkludera SyncStatusIndicator)

### 2e. React-state ar immutable

Idag: `profile` ar en muterbar referens. `addProblemResult()` muterar den in-place. Alla callbacks som stangar over `profile` ser samma objekt.

Nytt:
- `addProblemResult()` returnerar `{ correct, result, updatedProfile }` dar `updatedProfile` ar en ny referens
- `handleSubmit` i `usePracticeCoreActions.js` anropar `setProfile(updatedProfile)` (inte bara `saveProfile`)
- Alla `useCallback`-beroenden pa `profile` fungerar korrekt

**Filer:**
- `src/lib/studentProfile.js` (addProblemResult -- returnera ny referens)
- `src/components/student/session/usePracticeCoreActions.js` (anvand updatedProfile)
- `src/components/student/session/usePracticeSetupEffects.js` (ingen mutation)

**Bakåtkompatibilitet:** Brytande andrning for alla som anropar `addProblemResult()`. Maste andra alla callsites i samma deploy.

**RISK:** Det har ar den storsta risken i hela planen. `addProblemResult()` muterar profilen pa 20+ stallen (`profile.recentProblems.push(...)`, `profile.stats.lifetimeProblems += 1`, etc). Att gora den immutable kraver att alla mutations ersatts med spread-operators. Testtackningen maste vara god.

---

## Fas 3: Profiluppdelning och cleanup

**Syfte:** Eliminera dubbla sanningskallor. Profilen ar ren och varje falt har en explicit agare.

### 3a. Ta bort effectiveLevels-dubbletten

Idag: `profile.effectiveLevels` och `profile.teacherSummary.effectiveLevels` ar samma data pa tva stallen. Rad 182 i `studentProfile.js`:

```javascript
profile.effectiveLevels = profile.teacherSummary.effectiveLevels
```

**Fix:** Ta bort `profile.effectiveLevels`. Alla lasstallaen som laser `profile.effectiveLevels` andras till att lasa `profile.teacherSummary?.effectiveLevels`.

**Filer:**
- `src/lib/studentProfile.js` (ta bort rad 182)
- Alla filer som laser `profile.effectiveLevels` (grep + fixa)
- `api/student/[studentId].js` -- ta bort merge av effectiveLevels

### 3b. teacherSummary beraknas server-side

Idag: `teacherSummary` beraknas i `addProblemResult()`, lagras i profilen, synkas till cloud, mergas via spread (cached value behandlas som source of truth).

Nytt:
- `addProblemResult()` beraknar fortfarande `teacherSummary` lokalt (for lokal session-vy)
- Servern beraknar `teacherSummary` vid GET /api/students fran `problemLog` + `masteryFacts`
- Servern sparar ALDRIG `teacherSummary` i Redis -- det ar en ren cache
- Merge-logiken pa servern ignorerar inkommande `teacherSummary`

**Filer:**
- `api/students.js` -- berakna `teacherSummary` per profil vid svar
- `api/student/[studentId].js` -- ta bort `teacherSummary` fran merge
- `src/lib/masteryCalculation.js` -- exportera `computeTeacherSummary` for server-side anvandning
  - OBS: `masteryCalculation.js` anvander `inferOperationFromProblemType` fran `mathUtils.js` -- dessa filer maste vara importerbara server-side (ESM/CJS-kompatibla)

**Risk:** `computeTeacherSummary()` importerar fran `mathUtils.js` och `operations.js`. Dessa filer maste vara tillgangliga i server-kontexten (Vercel serverless). Kan behova extraheras till en shared modul.

### 3c. Rensa adaptive.skillStates

Verifiera att inget i koden laser `adaptive.skillStates` (det ska vara hundratals entries som aldrig anvands av den adaptiva motorn). Om sa ar fallet:

- Sluta skriva till `skillStates`
- Skriv migration som tar bort `skillStates` fran befintliga profiler
- Beraknad besparing: ca 20-50 KB per profil

**Filer:**
- `src/lib/studentProfile.js`
- `src/engine/profileMigration.js`
- `api/student/[studentId].js` (ta bort merge av skillStates)

### 3d. Explicit merge-schema

Infor ett schema som beskriver merge-strategi for VARJE falt i profilen. Nar ett nytt falt laggs till utan att definiera merge-strategi -> varning vid build (eller test-failure).

```javascript
// src/lib/profileMergeSchema.js (ny)
export const MERGE_SCHEMA = {
  studentId:         { strategy: 'keep_existing' },
  name:              { strategy: 'prefer_fresher' },
  grade:             { strategy: 'prefer_fresher' },
  currentDifficulty: { strategy: 'max' },
  highestDifficulty: { strategy: 'max' },
  recentProblems:    { strategy: 'dedup_union', limit: 250 },
  problemLog:        { strategy: 'dedup_union', limit: 5000 },
  masteryFacts:      { strategy: 'union_append' },
  adaptive:          { strategy: 'custom', handler: 'mergeAdaptive' },
  tableDrill:        { strategy: 'custom', handler: 'mergeTableDrill' },
  telemetry:         { strategy: 'custom', handler: 'mergeTelemetry' },
  auth:              { strategy: 'custom', handler: 'mergeAuth' },
  stats:             { strategy: 'derive_from_log' },     // beraknas, inte mergas
  teacherSummary:    { strategy: 'ignore' },               // cache, beraknas
  effectiveLevels:   { strategy: 'removed' },               // dubblett
}
```

- Skapa ett test som jamfor alla nycklar i en profil mot MERGE_SCHEMA
- Om en nyckel saknas i schemat -> test failure
- Tvingas oss att tanka igenom merge for varje nytt falt

**Filer:**
- `src/lib/profileMergeSchema.js` (ny)
- `src/lib/profileMergeSchema.test.js` (ny)

---

## Risker och fallbacks

### Risk 1: Immutable profile (Fas 2e) ar storre an vi tror

`addProblemResult()` muterar profilen pa rad 161-182 (stats, recentProblems, problemLog, teacherSummary, effectiveLevels). `adjustDifficulty()` muterar `currentDifficulty`, `highestDifficulty`, `adaptive.operationAbilities`. Att gora allt immutable pa en gang ar riskabelt.

**Mitigation:** Gor det i tva steg:
1. Forst: `addProblemResult()` returnerar `updatedProfile` men muterar OCKSA originalet (backward compat)
2. Sen: ta bort mutationen nar alla callsites anvander returvardet

### Risk 2: Server-side teacherSummary kraver shared moduler (Fas 3b)

`computeTeacherSummary()` importerar fran flera klient-filer. Vercel serverless kanske inte kan importera dessa.

**Mitigation:** Extrahera `computeTeacherSummary()` och dess beroenden till en separat fil som ar importerbar i bade klient- och server-kontext. Alternativt: flytta berakningen till en dedikerad serverless function som triggas av cron.

### Risk 3: WAL-storlek pa iPads med begransat localStorage

iPads med 5 MB localStorage-limit kan fa problem om WAL vaxer.

**Mitigation:**
- Max 500 entries i WAL (ca 200 KB)
- Aggressiv pruning av synkade entries
- Monitor via SyncStatusIndicator (rod = problem)

### Risk 4: Migration av befintliga profiler utan masteryFacts

Elever med 5000 entries i problemLog far ratt migration. Elever vars problemLog redan trimmats far mastery baserat pa kvarvarande data -- potentiellt mindre an verkligheten.

**Mitigation:**
- Migrationen ar konservativ: den skapar facts baserat pa tillganglig data
- Om eleven sedan uppnar mastery igen -> nytt fact appendas
- Aldrig dalig: i varsta fall maste eleven bevisa mastery igen for redan trimmade nivaer
- teacherSummary.effectiveLevels (om det finns) kan anvandas som extra signal vid migration

### Risk 5: Tva iPads med samma elev och WAL

Om bada iPads skriver WAL-entries med overlappande timestamps kan servern fa dubbletter.

**Mitigation:** Varje WAL-entry har ett globalt unikt id (timestamp + random suffix). Servern dedupar pa id. Tva entries fran samma sekund med olika id ar bada giltiga (eleven svarade pa bada enheter).

---

## Implementationsordning

```
Fas 0 (NU -- stoppa blodningen)
  0a  React-state uppdateras efter merge      [1 dag]
  0b  visibilitychange + sendBeacon           [0.5 dag]
  0c  Snapshot i sync-ko                      [0.5 dag]

Fas 1 (Persistent mastery)
  1a  masteryFacts i profilen                 [1 dag]
  1b  Skriv mastery-fakta vid uppnaende       [1 dag]
  1c  Las mastery fran facts (med fallback)   [1 dag]
  1d  Server merge for masteryFacts           [0.5 dag]
  --- Deploy + verifiera pa staging ---       [0.5 dag]

Fas 2 (Sync-omskrivning)
  2a  WAL-implementation                      [1 dag]
  2b  addProblemResult skriver till WAL       [1.5 dag]
  2c  Server accepterar WAL-entries           [2 dag]
  2d  Nya sync-triggers                       [1 dag]
  2e  Immutable React-state                   [2 dag]
  --- Deploy + verifiera pa staging ---       [1 dag]

Fas 3 (Cleanup)
  3a  Ta bort effectiveLevels-dubblett        [0.5 dag]
  3b  teacherSummary server-side              [2 dag]
  3c  Rensa skillStates                       [0.5 dag]
  3d  Explicit merge-schema                   [1 dag]
  --- Deploy + verifiera pa staging ---       [0.5 dag]
```

Total uppskattning: ~17-20 arbetsdagar, varav fas 0 (2 dagar) gor storst skillnad snabbast.

---

## Vad vi INTE andrar

- Adaptiva motorn (`difficultyAdapter.js`) -- valskapad och isolerad
- Mastery-berakningens LOGIK (`computeLevelMastery`) -- kanonisk, alla vyer anvander samma
- Novelty-systemet -- bra variation
- Template-baserad problemgenerering -- solid
- Domanssystemet (`registry.js`) -- bra abstraktion
- Auth-flode -- nyligen omskrivet till sha256-v1, fungerar bra
- Redis som backing store -- Upstash KV ar fine for den har skalan
