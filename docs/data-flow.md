# Dataflöde & Logik — Sequential Math

## 1. Övergripande systemarkitektur

```mermaid
graph TB
    subgraph "Klient (React SPA)"
        SH[StudentHome.jsx]
        SS[StudentSession.jsx]
        ST[StudentTicket.jsx]
        TD[Dashboard.jsx<br/>Lärare]
    end

    subgraph "Lib-lager"
        DA[difficultyAdapter.js<br/>Problemval + svårighetsjustering]
        PG[problemGenerator.js<br/>Templategenerering]
        SP[studentProfile.js<br/>Profil + resultatregistrering]
        ST2[storage.js<br/>localStorage + molnsync]
        TL[telemetry.js<br/>Händelser + dagliga mätvärden]
        PR[studentPresence.js<br/>Närvaro + engagemang]
        TK[tickets.js<br/>Ticket-system]
        PM[progressionModes.js<br/>challenge default]
    end

    subgraph "Templates"
        AT[additionTemplates.js<br/>12 nivåer]
        SBT[subtractionTemplates.js<br/>12 nivåer]
        MT[multiplicationTemplates.js<br/>12 nivåer]
        DT[divisionTemplates.js<br/>12 nivåer]
    end

    subgraph "Server (Vercel)"
        API1[/api/students<br/>GET alla profiler]
        API2[/api/student/:id<br/>GET/POST + merge]
        API3[/api/teacher-auth<br/>Lösenord + token]
        KV[(Vercel KV<br/>Redis)]
    end

    SS --> DA
    DA --> PG
    PG --> AT & SBT & MT & DT
    SS --> SP
    SP --> ST2
    ST2 -->|localStorage| SH
    ST2 -->|Cloud sync| API2
    API2 --> KV
    TD --> API1
    TD --> API3
    SS --> TL
    SS --> PR
    SH --> TK
    ST --> TK
```

---

## 2. Elevprofil — datastruktur

```mermaid
classDiagram
    class StudentProfile {
        +string studentId
        +string name
        +number grade
        +number currentDifficulty
        +number highestDifficulty
        +Object adaptive
        +Array recentProblems [max 250]
        +Array problemLog [max 5000]
        +Object stats
        +Object telemetry
        +Object activity
        +Object auth
        +Object preferences
        +Object ticketInbox
        +Array ticketResponses
        +Object classMembership
    }

    class Adaptive {
        +Object operationAbilities
        +Object skillStates
        +Array recentSelections
        +Object ncmRotation
    }

    class OperationAbilities {
        +number addition [1-12]
        +number subtraction [1-12]
        +number multiplication [1-12]
        +number division [1-12]
    }

    class ProblemResult {
        +string problemType
        +string promptText
        +Object difficulty
        +number studentAnswer
        +number correctAnswer
        +boolean correct
        +number timeSec
        +number speedTimeSec
        +string errorCategory
        +number timestamp
    }

    class Telemetry {
        +Array events [max 1200]
        +Object daily [YYYY-MM-DD buckets]
    }

    class Activity {
        +string page
        +boolean inFocus
        +number lastPresenceAt
        +number lastInteractionAt
    }

    StudentProfile --> Adaptive
    Adaptive --> OperationAbilities
    StudentProfile --> ProblemResult : recentProblems
    StudentProfile --> Telemetry
    StudentProfile --> Activity
```

---

## 3. Problemval — fullständigt flöde

```mermaid
flowchart TD
    Start([Elev klickar Starta]) --> ParseURL[Parsa URL-parametrar<br/>mode / level / tables / pace / assignment]
    ParseURL --> Rules[getSessionRules]

    Rules --> IsNCM{NCM-uppdrag?}
    IsNCM -->|Ja| NCM[filterNcmProblems + generateNcmProblem]
    IsNCM -->|Nej| IsTable{Tabellträning?}
    IsTable -->|Ja| TableDrill[generateMultiplicationTableDrillProblem]
    IsTable -->|Nej| IsLevelFocus{Nivåfokus?<br/>mode + level satt}
    IsLevelFocus -->|Ja| Forced[forcedLevel = level<br/>forcedType = mode<br/>levelRange = level..level]
    IsLevelFocus -->|Nej| FreeSelect[Fri val]

    FreeSelect --> SelectOp

    subgraph SelectOp [Välj räknesätt]
        direction TB
        Guard1{errors >= 2 ELLER<br/>success < 65%?}
        Guard1 -->|Ja| RetAdd1[return addition]
        Guard1 -->|Nej| Guard2{attempts < 10 ELLER<br/>difficulty < 3.5?}
        Guard2 -->|Ja| RetAdd2[return addition]
        Guard2 -->|Nej| WeightedPick[Viktad slump:<br/>addition 60%<br/>subtraction 25% om diff>=4<br/>multiplication 15% om diff>=5<br/>division 10% om diff>=7]
    end

    SelectOp --> GetAbility[Hämta operationAbility<br/>för valt räknesätt]
    GetAbility --> IntroCheck{Nytt räknesätt?<br/>Mjuk introduktion}

    subgraph IntroCheck [Introduktionsramp]
        direction TB
        IC1{opAttempts < 3?}
        IC1 -->|Ja| Cap1[Max nivå 1]
        IC1 -->|Nej| IC2{opAttempts < 6?}
        IC2 -->|Ja| Cap2[Max nivå 2]
        IC2 -->|Nej| IC3{opAttempts < 12?}
        IC3 -->|Ja| Cap3[Max nivå 3]
        IC3 -->|Nej| NoCap[Ingen begränsning]
    end

    IntroCheck --> CheckWarmup{Frånvaro-warmup?<br/>daysAway >= 1}
    CheckWarmup -->|Ja| Warmup[Lättare nivå<br/>roundedDiff - 1 eller -2]
    CheckWarmup -->|Nej| CheckErrors{3+ fel i rad?}
    CheckErrors -->|Ja| EasyWin[roundedDiff - 1]
    CheckErrors -->|Nej| CheckPush{success > 92%<br/>och >= 6 problem?}
    CheckPush -->|Ja| Push[roundedDiff + 1]
    CheckPush -->|Nej| CheckRelief{success < 55%<br/>och >= 6 problem?}
    CheckRelief -->|Ja| Relief[roundedDiff - 1]
    CheckRelief -->|Nej| CheckBootstrap{Nivå 1 och<br/>success >= 60%<br/>och >= 8 problem?}
    CheckBootstrap -->|Ja, 30% chans| Boot[Nivå 2]
    CheckBootstrap -->|Nej| Bucket

    subgraph Bucket [Svårighetsbucket - viktad slump]
        direction LR
        B1["very_easy (-2) 5%"]
        B2["easy (-1) 25%"]
        B3["core (0) 50%"]
        B4["hard (+1) 15%"]
        B5["challenge (+2) 5%"]
    end

    Warmup & EasyWin & Push & Relief & Boot & Bucket --> TargetLevel[targetLevel = roundedDiff + offset]
    Forced --> TargetLevel
    TargetLevel --> Generate

    subgraph Generate [Generera problem]
        direction TB
        G1[Filtrera templates:<br/>conceptual_level == targetLevel]
        G1 --> G2{Finns preferred type<br/>på exakt nivå?}
        G2 -->|Ja| G3[Roterat urval bland preferred-type templates]
        G2 -->|Nej| G4{Finns NÅGON template<br/>på exakt nivå?}
        G4 -->|Ja| G5[Roterat urval bland alla templates]
        G4 -->|Nej| G6[Fallback: närmaste nivå<br/>samma typ om möjligt]
        G3 & G5 & G6 --> G7[generateProblem/domängenerator:<br/>slumpa parametrar + validera]
        G7 --> G8[Novelty-score mot historik<br/>8 senaste + current<br/>välj bästa kandidat]
    end

Generate --> Display([Visa problem för eleven])
```

Notering:
- Små case-pooler i domäner (t.ex. bråk/procent/algebra) kör nu roterat urval
  så att samma mall inte upprepas innan poolen gått varvet runt.
- Sessionen gör därefter ett novelty-val mellan flera kandidater för att minska
  upprepad struktur och upprepade tal.

---

## 4. Svårighetsjustering efter varje svar

```mermaid
flowchart TD
    Answer([Elev svarar]) --> Correct{Rätt svar?}

    Correct -->|Ja| StreakCheck{Streak >= 3<br/>OCH success >= 90%?}
    StreakCheck -->|Ja| Strong["delta = +0.35"]
    StreakCheck -->|Nej| Streak2{Streak >= 2?}
    Streak2 -->|Ja| StreakDelta["delta = +0.20"]
    Streak2 -->|Nej| SuccCheck{success >= 55%?}
    SuccCheck -->|Ja| Normal["delta = +0.10"]
    SuccCheck -->|Nej| LowLevel{difficulty <= 2?}
    LowLevel -->|Ja| LowDelta["delta = +0.05"]
    LowLevel -->|Nej| Zero["delta = 0"]

    Strong & StreakDelta & Normal & LowDelta & Zero --> Comeback{Under peak<br/>streak >= 2<br/>success >= 70%?}
    Comeback -->|Ja| ComebackAdd["+ 0.15"]
    Comeback -->|Nej| SpeedCheck

    ComebackAdd --> SpeedCheck{Snabbt svar?<br/>time <= estimated × 0.75}
    SpeedCheck -->|Ja| SpeedAdd["+ 0.06"]
    SpeedCheck -->|Nej| Apply

    SpeedAdd --> Apply

    Correct -->|Fel| ErrType{Ouppmärksamhetsfel?}
    ErrType -->|Ja| Inattention["delta = -0.03"]
    ErrType -->|Nej| ErrCount{3+ fel i rad<br/>OCH success < 50%?}
    ErrCount -->|Ja| HardDown["delta = -0.50"]
    ErrCount -->|Nej| Err2{2+ fel i rad?}
    Err2 -->|Ja| MidDown["delta = -0.25"]
    Err2 -->|Nej| SoftCheck{success < 55%?}
    SoftCheck -->|Ja| SoftDown["delta = -0.15"]
    SoftCheck -->|Nej| NoDelta["delta = 0"]

    Inattention & HardDown & MidDown & SoftDown & NoDelta --> Apply

    Apply[Applicera delta] --> OpAbility["operationAbility += delta<br/>(full delta)"]
    Apply --> Global["currentDifficulty += delta × 0.5<br/>(halv delta)"]
    OpAbility & Global --> Save([Spara profil])
```

---

## 5. Operationsintroduktion

```mermaid
flowchart LR
    subgraph Trösklar [När varje räknesätt låses upp]
        direction TB
        A["**Addition**<br/>Alltid tillgänglig<br/>Startar vid attempts=0"]
        S["**Subtraktion**<br/>difficulty >= 4<br/>attempts >= 12<br/>Vikt: 25%"]
        M["**Multiplikation**<br/>difficulty >= 5<br/>attempts >= 16<br/>Vikt: 15%"]
        D["**Division**<br/>difficulty >= 7<br/>attempts >= 22<br/>Vikt: 10%"]
    end

    subgraph Init [Initiala operationAbilities]
        direction TB
        IA["addition = global<br/>(1 för ny elev)"]
        IS["subtraction = min(3, max(1, global-2))"]
        IM["multiplication = min(2, max(1, global-3))"]
        ID["division = min(3, max(1, global-4))"]
    end

    subgraph Ramp [Mjuk introduktionsramp<br/>Per räknesätt ≠ addition]
        direction TB
        R1["0-2 försök → max nivå 1"]
        R2["3-5 försök → max nivå 2"]
        R3["6-11 försök → max nivå 3"]
        R4["12+ försök → ingen cap"]
    end
```

---

## 6. Lagring & synkronisering

```mermaid
sequenceDiagram
    participant E as Elev (webbläsare)
    participant LS as localStorage
    participant API as Vercel API
    participant KV as Vercel KV (Redis)

    Note over E,KV: Spara efter varje svar

    E->>LS: saveProfileLocalOnly(profile)
    E->>API: POST /api/student/{id}<br/>{profile, lastSyncedAt}

    API->>KV: GET student:{id}
    KV-->>API: Befintlig molnprofil

    Note over API: Merge-algoritm:<br/>1. Jämför recentProblems senaste timestamp<br/>2. Välj "fräschast" per fält<br/>3. Merge problemLog (union, dedup)<br/>4. Merge telemetry (max per bucket)<br/>5. Merge ticketResponses (union)

    API->>KV: SET student:{id} (merged)
    API-->>E: Merged profil
    E->>LS: saveProfileLocalOnly(merged)

    Note over E,KV: Throttlad: max var 5:e minut<br/>forceSync: ignorerar throttle
```

---

## 7. Lärardashboard — datakällor

```mermaid
flowchart TD
    subgraph Indata [Datakällor]
        Profiles[Alla elevprofiler<br/>via getAllProfilesWithSync]
        Assignment[Aktivt uppdrag<br/>localStorage]
        Classes[Klasslistor<br/>localStorage]
    end

    subgraph Beräkningar [Beräknad data per elev]
        Row[buildStudentRow]
        Row --> TodayMetrics["Idag:<br/>försök, rätt, fel<br/>engagerad tid, kampskill"]
        Row --> WeekMetrics["Vecka:<br/>försök, aktiv tid<br/>rätt/fel, kampskill"]
        Row --> Rates["Träffsäkerhet<br/>Trend (senaste 10 vs förra 10)<br/>Stödpoäng + flaggor"]
        Row --> Presence["Närvaro-status:<br/>🟢 aktiv + engagerad<br/>🟠 idle (2-4 min)<br/>⚫ stale<br/>🔴 ej sedd idag"]
    end

    subgraph DetailView [Elevdetaljvy]
        Summary["8 sammanfattningskort"]
        Priority["Vad behöver tränas?<br/>buildTrainingPriorityList()"]
        Mastery["Framsteg — mastery grid<br/>buildOperationMasteryBoardsForTeacher()"]
        Analysis["Svårighetsanalys<br/>detailLevelErrorRows + classBenchmarks"]
        Tables["Gångertabeller heatmap"]
        NCM["NCM-resultat"]
        History["Träningshistorik 7d<br/>buildDailyActivityBreakdown()"]
        Weak["Svagast / Starkast typer"]
    end

    Profiles --> Row
    Assignment --> Row
    Classes --> Row

    Row --> Summary
    Row --> Priority
    Row --> Mastery
    Row --> Analysis
    Row --> History
    Row --> Weak
```

---

## 8. Träningsprioritet — algoritm

```mermaid
flowchart TD
    Start([buildTrainingPriorityList]) --> ForEach[För varje operation]
    ForEach --> GetAbility[Hämta operationAbility]
    GetAbility --> Levels["Iterera nivåer 1 → ability+2"]

    Levels --> CalcStats["Per nivå: beräkna<br/>attempts, accuracy, medianSpeed<br/>från getTableProblemSourceForStudent"]

    CalcStats --> IsMastered{accuracy >= 80%<br/>OCH attempts >= 5?}
    IsMastered -->|Ja| Skip[Skippa — mastered]
    IsMastered -->|Nej| HasAttempts{attempts > 0?}

    HasAttempts -->|Nej, aldrig övat| NotPracticed["Ej övat"]
    HasAttempts -->|Ja| CheckAcc

    NotPracticed --> CheckBelow{Nivåer under<br/>är befästa?}
    CheckBelow -->|Ja| HighGap["🔴 HÖG: Lucka<br/>(redo att börja)"]
    CheckBelow -->|Nej| MedSkip["🟠 MEDEL: Hoppat över<br/>(nivåer under ej klara)"]

    CheckAcc{accuracy < 50%?}
    CheckAcc -->|Ja, och >= 5 försök| HighStruggle["🔴 HÖG: Kämpar"]
    CheckAcc -->|Nej| CheckMid{accuracy < 70%?}
    CheckMid -->|Ja, och >= 5 försök| MedOngoing["🟠 MEDEL: Osäker"]
    CheckMid -->|Nej| CheckLow{accuracy < 80%?}
    CheckLow -->|Ja| LowAlmost["🟡 LÅG: Nästan"]
    CheckLow -->|Nej| LowData{attempts < 5?}
    LowData -->|Ja| LowFew["🟡 LÅG: Lite data"]
    LowData -->|Nej| Skip

    HighGap & HighStruggle & MedSkip & MedOngoing & LowAlmost & LowFew --> Sort["Sortera:<br/>1. Prioritet (hög → låg)<br/>2. Attempts (lägst först)<br/>Top 15"]
```

---

## 9. Ticket-flöde

```mermaid
sequenceDiagram
    participant L as Lärare
    participant LS as localStorage
    participant E as Elev
    participant EP as Elevprofil

    L->>LS: createTicketTemplate(question, answer, kind)
    L->>LS: createTicketDispatch(template, settings)
    L->>L: buildTicketLink(dispatch)<br/>/?ticket=ID&ticket_payload=BASE64

    Note over L,E: Lärare delar länk<br/>(QR-kod, chat, etc.)

    E->>E: Klickar länk → StudentHome
    E->>E: Redirect till /student/{id}/ticket

    E->>EP: decodeTicketPayload(encoded)
    E->>EP: Spara i ticketInbox.activePayload

    Note over E: Visar fråga + svarsfält

    E->>EP: recordTicketResponse(profile, {studentAnswer})
    EP->>EP: Evaluera svar (normaliserat)
    EP->>EP: Spara i ticketResponses[]
    E->>EP: saveProfile (+ cloud sync)

    Note over E: Banner försvinner från startsidan<br/>när svar finns

    L->>EP: Läser ticketResponses i Dashboard
    L->>LS: setTicketDispatchReveal(id, true)
    Note over L: Alla elever ser facit

    E->>EP: isTicketCorrectnessVisible()<br/>→ Visar rätt/fel
```

---

## 10. Närvaro & engagemangsspårning

```mermaid
stateDiagram-v2
    [*] --> Green : Fokus + interaktion < 2 min
    Green --> Orange : Ingen interaktion 2-4 min
    Orange --> Black : Ingen interaktion > 4 min
    Black --> Green : Interaktion igen
    Green --> Black : Tappat fokus > 90s
    Orange --> Green : Interaktion igen

    [*] --> Red : Ej sedd idag

    state Green {
        [*] : 🟢 Aktiv
        note right of [*]
            inFocus = true
            lastPresence < 90s
            lastInteraction < 2min
        end note
    }

    state Orange {
        [*] : 🟠 Idle
        note right of [*]
            inFocus = true
            lastPresence < 90s
            lastInteraction 2-4min
        end note
    }

    state Black {
        [*] : ⚫ Stale
        note right of [*]
            Fokus borta > 90s
            ELLER interaktion > 4min
        end note
    }

    state Red {
        [*] : 🔴 Ej sedd
        note right of [*]
            lastLogin < idag
            lastInteraction < idag
        end note
    }
```

---

## 11. Sessionsflöde — från start till slut

```mermaid
flowchart TD
    Click([Elev klickar Starta]) --> Mount[StudentSession mountar]
    Mount --> Auth{Session aktiv?}
    Auth -->|Nej| Redirect[Redirect till login]
    Auth -->|Ja| Load[Ladda profil + sync]
    Load --> ParseParams[Parsa URL:<br/>assignment / mode / tables / level / pace]
    ParseParams --> ResolveMeta[Resolve assignment + warmup]

    ResolveMeta --> GenFirst[Generera första problem<br/>selectNextProblem]
    GenFirst --> Display[Visa problem]

    Display --> Wait[Vänta på svar]
    Wait --> Submit[handleSubmit]

    Submit --> Record[addProblemResult<br/>→ recentProblems + problemLog]
    Record --> Adjust{Nivåfokus<br/>eller tabellövning?}
    Adjust -->|Nej| AdjustDiff[adjustDifficulty<br/>opAbility + globalDiff]
    Adjust -->|Ja| SkipAdjust[Skippa justering]

    AdjustDiff & SkipAdjust --> CheckMastery{Nivåfokus?<br/>Just mastered?}
    CheckMastery -->|Ja| Celebrate[🎉 Grattis-skärm<br/>Nästa nivå / Stanna]
    CheckMastery -->|Nej| CheckBreak{Pausförslag?<br/>>= 25 problem<br/>tappande trend}
    CheckBreak -->|Ja| Break[Visa pausförslag]
    CheckBreak -->|Nej| CheckAdvance{Single-domain?<br/>shouldOfferSteadyAdvance?}
    CheckAdvance -->|Ja| Advance[📈 Vill du prova<br/>nästa nivå?]
    CheckAdvance -->|Nej| Feedback[Visa feedback<br/>Rätt! / Inte riktigt]

    Celebrate -->|Nästa nivå| Navigate[Navigate med level+1]
    Celebrate -->|Stanna| GenNext
    Advance -->|Acceptera| BumpLevel[Höj opAbility]
    Advance -->|Avböj| GenNext
    Break -->|Ta paus| Home[Tillbaka hem]
    Break -->|Fortsätt| GenNext

    BumpLevel --> GenNext
    Feedback --> AutoCont{Auto-fortsätt<br/>efter 3s om rätt}
    AutoCont --> GenNext[Generera nästa problem]
    GenNext --> Display

    Navigate --> Mount
```

---

## 12. Template-nivåer — vad varje nivå innehåller

```mermaid
graph LR
    subgraph Addition
        A1["1: 3+4 = 7<br/>1-siffriga, utan minnessiffra"]
        A2["2: 7+8 = 15<br/>1-siffriga, med minnessiffra"]
        A3["3: 5+23 = 28<br/>1+2 siffriga, utan"]
        A4["4: 8+47 = 55<br/>1+2 siffriga, med<br/>+ decimaltal 1dp utan"]
        A5["5: 23+14 = 37<br/>2+2 siffriga, utan<br/>+ decimaltal 1dp med"]
        A6["6: 47+38 = 85<br/>2+2 siffriga, med"]
        A1 --> A2 --> A3 --> A4 --> A5 --> A6
    end

    subgraph Subtraktion
        S1["1: 8-3 = 5<br/>1-siffriga, utan lån"]
        S2["2: 12-7 = 5<br/>1-siffriga, med lån"]
        S3["3: 45-3 = 42<br/>2-1 siffriga, utan"]
        S4["4: 32-7 = 25<br/>2-1 med lån<br/>+ decimaltal 3,2-1,1"]
        S5["5: 45-23 = 22<br/>2-2 utan lån<br/>+ decimaltal 5,3-2,8 MED LÅN"]
        S6["6: 53-28 = 25<br/>2-2 siffriga, med lån"]
        S1 --> S2 --> S3 --> S4 --> S5 --> S6
    end
```

> Nivå 7-12 följer samma mönster med 3-siffriga tal och 2-decimalers precision.

---

## 13. Progressionslogik

> **Borttaget:** Tempovalet Utmaning/Lugn är borttaget. Alla sessioner
> använder nu samma challenge-profil. Skillnaden var minimal i praktiken
> eftersom `lockToMasteryFloor` redan styrde vilken nivå problem genereras på.

```mermaid
graph TB
    subgraph Progression ["Progression (alla träningslägen)"]
        P_Up["Uppåt:<br/>strong: +0.35, streak: +0.20<br/>normal: +0.10, speed: +0.06"]
        P_Down["Nedåt:<br/>hard: -0.50, mid: -0.25<br/>soft: -0.15"]
        P_Bucket["Buckets:<br/>very_easy 5%, easy 25%<br/>core 50%, hard 15%<br/>challenge 5%"]
        P_Push["Push vid >92% success<br/>efter 6+ problem"]
        P_Boot["Bootstrap: 30% chans<br/>att testa nivå 2"]
        P_Advance["Erbjud nivåbyte:<br/>shouldOfferSteadyAdvance<br/>6+ problem, 85%+ accuracy"]
        P_Mastery["Mastery: senaste 15<br/>försök per nivå, 85%+"]
    end
```
