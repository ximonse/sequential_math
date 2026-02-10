# System Architecture - Adaptiv Matematikapp

## Systemöversikt

### Design-filosofi
- **Parametriserad uppgiftsbank** - Aldrig hårdkodade uppgifter
- **Multidimensionell svårighet** - Inte bara "lätt/medel/svår"
- **Intelligent felanalys** - Skilja slarv, förståelse och kognitiv kapacitet
- **Långsiktig elevprofil** - Spåra mönster över tid
- **Forskningsbaserad** - Variation theory + Predictive processing

## Tech Stack

### Frontend
- **React 18+** med hooks
- **Tailwind CSS** för styling
- **Vite** som build tool
- **React Router** för navigation (elev/lärare-vyer)

### Backend
- **Vercel Serverless Functions** (Node.js)
- **Vercel KV** (Redis-based key-value store)
- Hosting: **Vercel** (gratis tier räcker för 100+ elever)

### Data Layer
```javascript
// Vercel KV structure
{
  // Student data
  "student:{studentId}": StudentProfile,
  "session:{sessionId}": SessionLog,

  // Problem templates
  "template:{templateId}": ProblemTemplate,

  // Teacher data
  "teacher:{teacherId}": TeacherProfile,
  "class:{classId}": ClassData
}
```

## Projektstruktur

```
src/
├── components/
│   ├── student/
│   │   ├── ProblemDisplay.jsx      # Visa uppgift
│   │   ├── AnswerInput.jsx         # Svarsformulär
│   │   ├── FeedbackDisplay.jsx     # Feedback efter svar
│   │   └── ProgressIndicator.jsx   # Visuell progress
│   ├── teacher/
│   │   ├── Dashboard.jsx           # Översikt
│   │   ├── StudentList.jsx         # Lista elever
│   │   ├── StudentDetail.jsx       # Detaljvy en elev
│   │   └── ClassStats.jsx          # Klassstatistik
│   └── shared/
│       ├── LoadingSpinner.jsx
│       └── ErrorBoundary.jsx
│
├── lib/
│   ├── core/
│   │   ├── problemGenerator.js     # Generera uppgifter
│   │   ├── difficultyCalculator.js # Beräkna svårighetsgrad
│   │   ├── validationEngine.js     # Validera genererade uppgifter
│   │   └── problemTemplates.js     # Template-definitioner
│   │
│   ├── adaptive/
│   │   ├── errorAnalyzer.js        # Analysera feltyp
│   │   ├── difficultyAdapter.js    # Justera svårighetsgrad
│   │   ├── problemSelector.js      # Välj nästa problem
│   │   └── spacedRepetition.js     # Spaced repetition logik
│   │
│   ├── profile/
│   │   ├── studentProfile.js       # StudentProfile class
│   │   ├── sessionManager.js       # Hantera sessions
│   │   ├── statisticsCalculator.js # Beräkna stats
│   │   └── weaknessDetector.js     # Upptäck svagheter
│   │
│   └── storage/
│       ├── kvClient.js             # Vercel KV wrapper
│       └── dataModels.js           # Data model definitions
│
├── hooks/
│   ├── useStudentProfile.js        # Hook för elevdata
│   ├── useProblemSession.js        # Hook för session
│   └── useAdaptiveLogic.js         # Hook för adaptiv logik
│
├── utils/
│   ├── constants.js                # Konstanter
│   ├── helpers.js                  # Hjälpfunktioner
│   └── validators.js               # Input-validering
│
└── types/
    └── index.d.ts                  # TypeScript definitions (om vi använder TS)
```

## Dataflöde

### Student Problem Session
```
1. Student startar session
   ↓
2. System laddar StudentProfile från KV
   ↓
3. problemSelector väljer nästa problem baserat på:
   - Nuvarande svårighetsgrad
   - Svagheter i profil
   - Spaced repetition schedule
   - Session fatigue
   ↓
4. problemGenerator skapar konkret uppgift
   ↓
5. Validering (måste passera alla checks)
   ↓
6. Visa för elev
   ↓
7. Elev svarar
   ↓
8. errorAnalyzer analyserar svar:
   - Rätt/Fel
   - Om fel: slarv/förståelse/kognitiv?
   - Tid använd
   ↓
9. difficultyAdapter justerar nästa svårighetsgrad
   ↓
10. Uppdatera StudentProfile
    ↓
11. Spara till KV
    ↓
12. Tillbaka till steg 3 (nästa problem)
```

## Skalbarhet & Performance

### Caching Strategy
- Student profiles: Cache i memory under session
- Problem templates: Cache statiskt (ändras sällan)
- Session data: Skriv till KV efter varje problem

### Batch Operations
- Spara inte varje keystroke
- Batch-uppdatera profil var 5:e problem eller vid session-slut

### Data Retention
- Behåll endast senaste 100 problem per elev (rullande)
- Aggregerad statistik behålls permanent
- Sessions äldre än 6 månader arkiveras

## Säkerhet & Privacy

### Authentication (Phase 2+)
- Lärare: Email/password via NextAuth
- Elever: Unikt ID per elev

### Data Protection
- Ingen personlig info utöver förnamn
- GDPR-compliant (Sverige)
- Förälder kan begära data-export/radering

## Monitoring & Analytics

### För lärare
- Real-time: Vilka elever är aktiva nu
- Session summary: Efter varje session
- Weekly digest: Email med klassens framsteg

### För utveckling
- Error logging via Vercel
- Performance metrics
- Usage statistics

## Deployment Pipeline

```
Local Development
├─ npm run dev (Vite dev server)
├─ Vercel KV: lokal mock-data
└─ Hot reload

Staging (Vercel Preview)
├─ Git push → auto-deploy preview
├─ Test med några elever
└─ Real Vercel KV (dev database)

Production (Vercel)
├─ Merge till main → auto-deploy
├─ Custom domain
└─ Real Vercel KV (prod database)
```

## Nyckelprinciper

1. **Start Simple, Scale Smart**
   - Phase 1: Core functionality
   - Phase 2+: Add complexity iterativt

2. **Data-Driven Decisions**
   - Logga allt som kan vara användbart
   - Analysera mönster i faktisk användning
   - Justera algoritmer baserat på data

3. **Student-First Design**
   - Minimal friction
   - Tydlig feedback
   - Motiverande UI

4. **Teacher Empowerment**
   - Actionable insights
   - Minimal admin overhead
   - Trust the algorithm, but allow override

5. **Code Quality**
   - TypeScript (om möjligt)
   - Unit tests för core logic
   - Dokumentera icke-uppenbara beslut
