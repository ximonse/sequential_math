# Implementation Phases - Steg-för-steg Utvecklingsplan

## PHASE 1: MVP (Vecka 1-4) - START HÄR

### Mål
En fungerande adaptiv matematik-app för 35 elever med grundläggande funktionalitet.

### Funktioner
- Problemgenerator för **addition** (1-2 siffror, med/utan tiövergang)
- Basic adaptiv svårighet (rätt → svårare, fel → lättare)
- Enkel elevprofil (senaste 50 problem)
- StudentView (visa problem, input, feedback)
- TeacherDashboard (basic stats per elev)
- Vercel deployment (gratis hosting)
- Vercel KV databas (localStorage under development)

### Tech Stack
```javascript
Frontend:
  - React 18+ (Vite)
  - Tailwind CSS
  - React Router

Backend:
  - Vercel Serverless Functions (optional för Phase 1)
  - Lokal data i början (localStorage)

Database:
  - localStorage (development)
  - Vercel KV (production)
```

### File Structure
```
src/
├── components/
│   ├── student/
│   │   ├── ProblemDisplay.jsx       // Visa uppgift
│   │   ├── AnswerInput.jsx          // Input-field för svar
│   │   └── FeedbackDisplay.jsx      // Feedback efter svar
│   └── teacher/
│       ├── Dashboard.jsx            // Översikt alla elever
│       └── StudentCard.jsx          // Card för en elev
│
├── lib/
│   ├── problemGenerator.js          // CORE: Generera uppgifter
│   ├── studentProfile.js            // StudentProfile class
│   └── difficultyAdapter.js         // Justera svårighet
│
├── data/
│   └── templates/
│       └── additionTemplates.js     // Addition templates
│
├── App.jsx
└── main.jsx
```

### Week-by-Week Breakdown

#### **Vecka 1: Setup & Problem Generator**

**Dag 1-2: Projekt setup**
```bash
npm create vite@latest math-app -- --template react
cd math-app
npm install
npm install -D tailwindcss postcss autoprefixer
npm install react-router-dom
npx tailwindcss init -p
```

**Dag 3-4: Problem Generator**
- [ ] Skapa `problemGenerator.js`
- [ ] Implementera generation för addition (no-carry)
- [ ] Implementera generation för addition (with-carry)
- [ ] Implementera validering
- [ ] Skriv 10+ unit tests

**Dag 5: Problem Templates**
- [ ] Definiera addition templates (se PROBLEM_STRUCTURE.md)
- [ ] Skapa difficulty progression
- [ ] Testa att generera 100 problem utan dubbletter

#### **Vecka 2: Student View & Basic Logic**

**Dag 1-2: StudentProfile class**
```javascript
// studentProfile.js - Minimal version
class StudentProfile {
  constructor(studentId, name, grade) {
    this.studentId = studentId;
    this.name = name;
    this.grade = grade;
    this.currentDifficulty = 1;
    this.recentProblems = [];
    this.stats = {
      totalProblems: 0,
      correctAnswers: 0,
      successRate: 0
    };
  }

  addProblemResult(problem, answer, timeSpent) {
    const correct = answer === problem.result;

    this.recentProblems.push({
      ...problem,
      studentAnswer: answer,
      correct,
      timeSpent,
      timestamp: Date.now()
    });

    // Keep only last 50
    if (this.recentProblems.length > 50) {
      this.recentProblems.shift();
    }

    this.updateStats();
  }

  updateStats() {
    this.stats.totalProblems = this.recentProblems.length;
    this.stats.correctAnswers = this.recentProblems.filter(p => p.correct).length;
    this.stats.successRate = this.stats.correctAnswers / this.stats.totalProblems;
  }

  getRecentSuccessRate(count = 10) {
    const recent = this.recentProblems.slice(-count);
    const correct = recent.filter(p => p.correct).length;
    return correct / recent.length;
  }
}
```

**Dag 3-4: Difficulty Adapter**
```javascript
// difficultyAdapter.js - Enkel version
class DifficultyAdapter {

  adjustDifficulty(profile, wasCorrect) {
    if (wasCorrect) {
      // 2 rätt i rad → öka
      const last2 = profile.recentProblems.slice(-2);
      if (last2.every(p => p.correct)) {
        profile.currentDifficulty += 0.5;
      }
    } else {
      // 2 fel i rad → minska
      const last2 = profile.recentProblems.slice(-2);
      if (last2.every(p => !p.correct)) {
        profile.currentDifficulty -= 0.5;
      }
    }

    // Clamp 1-10
    profile.currentDifficulty = Math.max(1, Math.min(10, profile.currentDifficulty));
  }

  selectNextProblem(profile) {
    const difficulty = Math.round(profile.currentDifficulty);

    // Hitta template på denna nivå
    const template = additionTemplates.find(t =>
      t.difficulty.conceptual_level === difficulty
    );

    return problemGenerator.generate(template);
  }
}
```

**Dag 5: Student UI Components**
- [ ] `ProblemDisplay.jsx` - Visa problem
- [ ] `AnswerInput.jsx` - Input med validering
- [ ] `FeedbackDisplay.jsx` - Visuell feedback (rätt/fel)

#### **Vecka 3: Complete Student Flow**

**Dag 1-2: Student Session**
```javascript
// StudentSession component
const StudentSession = ({ studentId }) => {
  const [profile, setProfile] = useState(null);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    // Load student profile
    loadProfile(studentId).then(setProfile);
  }, [studentId]);

  useEffect(() => {
    if (profile && !currentProblem) {
      // Generate first problem
      const problem = difficultyAdapter.selectNextProblem(profile);
      setCurrentProblem(problem);
      setStartTime(Date.now());
    }
  }, [profile, currentProblem]);

  const handleSubmit = () => {
    const timeSpent = (Date.now() - startTime) / 1000;
    const isCorrect = parseInt(answer) === currentProblem.result;

    // Update profile
    profile.addProblemResult(currentProblem, parseInt(answer), timeSpent);
    difficultyAdapter.adjustDifficulty(profile, isCorrect);

    // Save profile
    saveProfile(profile);

    // Show feedback
    setFeedback({
      correct: isCorrect,
      correctAnswer: currentProblem.result,
      message: isCorrect ? 'Rätt!' : 'Tyvärr, försök igen!'
    });

    // Next problem after 2 seconds
    setTimeout(() => {
      const nextProblem = difficultyAdapter.selectNextProblem(profile);
      setCurrentProblem(nextProblem);
      setAnswer('');
      setFeedback(null);
      setStartTime(Date.now());
    }, 2000);
  };

  if (!profile || !currentProblem) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-600">
        {profile.name} | Nivå: {Math.round(profile.currentDifficulty)}
      </div>

      <ProblemDisplay problem={currentProblem} />

      {!feedback && (
        <AnswerInput
          value={answer}
          onChange={setAnswer}
          onSubmit={handleSubmit}
        />
      )}

      {feedback && <FeedbackDisplay feedback={feedback} />}
    </div>
  );
};
```

**Dag 3: LocalStorage persistence**
```javascript
// storage.js
export const loadProfile = (studentId) => {
  const data = localStorage.getItem(`student_${studentId}`);
  if (!data) {
    return new StudentProfile(studentId, 'Student ' + studentId, 4);
  }
  return Object.assign(new StudentProfile(), JSON.parse(data));
};

export const saveProfile = (profile) => {
  localStorage.setItem(
    `student_${profile.studentId}`,
    JSON.stringify(profile)
  );
};

export const listAllStudents = () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('student_'));
  return keys.map(key => {
    const data = localStorage.getItem(key);
    return JSON.parse(data);
  });
};
```

**Dag 4-5: Teacher Dashboard (basic)**
```javascript
// Dashboard.jsx
const Dashboard = () => {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    setStudents(listAllStudents());
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Elevöversikt</h1>

      <div className="grid grid-cols-3 gap-4">
        {students.map(student => (
          <StudentCard key={student.studentId} student={student} />
        ))}
      </div>
    </div>
  );
};

const StudentCard = ({ student }) => {
  return (
    <div className="border rounded p-4">
      <h3 className="font-bold">{student.name}</h3>
      <p>Problem: {student.stats.totalProblems}</p>
      <p>Success: {(student.stats.successRate * 100).toFixed(0)}%</p>
      <p>Nivå: {Math.round(student.currentDifficulty)}</p>
    </div>
  );
};
```

#### **Vecka 4: Testing & Deployment**

**Dag 1-2: Testing med 5 elever**
- [ ] Skapa 5 test-profiler
- [ ] Låt elever prova appen
- [ ] Samla feedback
- [ ] Fixa buggar
- [ ] Justera UI/UX

**Dag 3: Vercel KV integration**
```javascript
// /api/student/[id].js (Vercel serverless function)
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const profile = await kv.get(`student:${id}`);
    return res.json(profile);
  }

  if (req.method === 'POST') {
    const profile = req.body;
    await kv.set(`student:${id}`, profile);
    return res.json({ success: true });
  }
}
```

**Dag 4: Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

**Dag 5: Documentation & Handoff**
- [ ] README.md med instruktioner
- [ ] Setup guide för nya elever
- [ ] Troubleshooting guide

### Phase 1 Deliverables

**Fungerande app:**
- Elev kan logga in med sitt ID
- Få adaptiva problem (addition)
- Se direkt feedback
- Upprepa många gånger

**Lärare kan:**
- Se alla elevers progress
- Se success rate per elev
- Se nuvarande nivå

**Tekniskt:**
- Deployed på Vercel
- Data sparas i Vercel KV
- Fungerar i webbläsare (desktop + mobile)

---

## PHASE 2: Smart Adaptivity (Månad 2-3)

### Mål
Intelligent problemval baserat på svagheter och feltyper.

### Nya Funktioner
- Detaljerad typ-tracking (success per problemtyp)
- Basic feltypsdetektering (slarv vs förståelse)
- Intelligent problemval (25% svaghet, 75% progression)
- Fler räknesätt: **Subtraktion** (1-3 siffror)
- Förbättrad teacher dashboard (insights per elev)

### Implementation

#### **Vecka 1: Type-specific tracking**
```javascript
// Extended StudentProfile
class StudentProfileExtended extends StudentProfile {
  constructor(studentId, name, grade) {
    super(studentId, name, grade);

    this.typeStats = {};
    // {
    //   "addition_1digit_no_carry": { attempts: 10, correct: 8, avgTime: 15 },
    //   "addition_2digit_with_carry": { attempts: 5, correct: 2, avgTime: 45 }
    // }
  }

  updateTypeStats() {
    const typeMap = {};

    for (const problem of this.recentProblems) {
      const type = problem.template;

      if (!typeMap[type]) {
        typeMap[type] = { attempts: 0, correct: 0, totalTime: 0 };
      }

      typeMap[type].attempts++;
      if (problem.correct) typeMap[type].correct++;
      typeMap[type].totalTime += problem.timeSpent;
    }

    // Calculate stats
    for (const [type, stats] of Object.entries(typeMap)) {
      typeMap[type].successRate = stats.correct / stats.attempts;
      typeMap[type].avgTime = stats.totalTime / stats.attempts;
    }

    this.typeStats = typeMap;

    // Identify weaknesses
    this.identifyWeaknesses();
  }

  identifyWeaknesses() {
    const types = Object.entries(this.typeStats);
    types.sort((a, b) => a[1].successRate - b[1].successRate);

    this.weakestTypes = types.slice(0, 3).map(([type]) => type);
  }
}
```

#### **Vecka 2: Error Analysis (basic)**
Implementera från ERROR_ANALYSIS.md:
- [ ] Slarv-detektering (snabbt + nära rätt)
- [ ] Förståelse-detektering (systematiskt fel)
- [ ] Basic cognitive load detection (timeout)

#### **Vecka 3: Intelligent Problem Selection**
Implementera från ADAPTIVE_LOGIC.md:
- [ ] 25% träna svagheter
- [ ] 75% normal progression
- [ ] Easy win när momentum tappad

#### **Vecka 4: Subtraction Templates**
- [ ] Skapa subtraction templates
- [ ] Generering med/utan borrowing
- [ ] Integration i problemväljare

---

## PHASE 3: Advanced Features (Månad 4-6)

### Nya Funktioner
- Spaced repetition (SM-2 algoritm)
- Kognitiv profil (working memory estimation)
- Session fatigue detection
- Multiplikation & Division
- Word problems (kontextuppgifter)
- Variation theory patterns
- Elev-feedback på uppgifter

### Implementation (kortfattat)

#### **Månad 4:**
- Spaced repetition system
- Review scheduling
- Multiplikation templates

#### **Månad 5:**
- Kognitiv profil tracking
- Session fatigue detection
- Division templates

#### **Månad 6:**
- Word problems
- Variation patterns
- Student feedback system
- Polish & optimization

---

## PHASE 4: Multi-School (Månad 7+)

### Nya Funktioner
- Multi-tenant architecture
- Teacher authentication
- School administration
- Billing (Stripe)
- Advanced analytics
- Export/import

### Detta är långt fram - fokus på Phase 1 först!

---

## Development Best Practices

### Code Organization
```javascript
// Använd ES6 modules
import { ProblemGenerator } from './lib/problemGenerator';

// Export named exports (inte default)
export class StudentProfile { ... }

// Använd const/let, inte var
const difficulty = 3;
```

### Testing
```javascript
// Skriv tests för core logic
describe('ProblemGenerator', () => {
  test('generates valid addition problem', () => {
    const template = additionTemplates[0];
    const problem = generator.generate(template);

    expect(problem.result).toBe(problem.values.a + problem.values.b);
  });
});
```

### Git Workflow
```bash
# Feature branches
git checkout -b feature/problem-generator
git commit -m "Add problem generator with validation"
git push origin feature/problem-generator

# Merge to main via PR
```

### Documentation
- Kommentera komplexa algoritmer
- README för varje major feature
- JSDoc för publika funktioner

---

## Success Metrics - Phase 1

### Technical Metrics
- [ ] 0 crashes under test session
- [ ] < 1s load time
- [ ] < 100ms problem generation
- [ ] Works on mobile (Chrome/Safari)

### Pedagogical Metrics
- [ ] Average 80% success rate (across all students)
- [ ] Students complete 10+ problems per session
- [ ] Difficulty adjusts smoothly (no sudden jumps)

### User Experience
- [ ] Students understand UI without help
- [ ] Teacher can see progress instantly
- [ ] No frustration (easy wins when needed)

---

## När ska du gå vidare till Phase 2?

**Endast när:**
1. Phase 1 fungerar stabilt i 2+ veckor
2. Dina 35 elever använder det regelbundet
3. Du har feedback från minst 10 elever
4. Success rate är 70-85% i genomsnitt
5. Inga kritiska buggar

**Skynda inte!** En solid Phase 1 är bättre än en buggig Phase 2.
