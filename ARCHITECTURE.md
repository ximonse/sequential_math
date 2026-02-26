# Arkitektur & Checklista för nya domäner

## Vad är en "domän"?

En domän är ett räknesätt/ämnesområde, t.ex. addition, algebra, bråk.
Varje domän bor i `src/domains/<namn>/` och registreras i `src/domains/registry.js`.

Nuvarande domäner:
- `arithmetic` — addition, subtraktion, multiplikation, division (bas)
- `algebra` — algebra_evaluate, algebra_simplify
- `arithmetic_expressions` — prioriteringsregler
- `fractions` — bråk
- `percentage` — procent

---

## Checklista: lägga till en ny domän

### 1. Domänfiler (`src/domains/<namn>/`)
- [ ] `index.js` — exporterar `{ id, label, skills: [{ id, label }], generate, evaluate, analyzeError }`
- [ ] `generate.js` — returnerar problem med **`difficulty: { conceptual_level: lvl }`** (obligatoriskt för progression)
- [ ] `evaluate.js` — returnerar `{ correct, correctAnswer, isReasonable }` (**isReasonable obligatoriskt** för masterycheck)
- [ ] `Display.jsx` (valfritt) — om frågan inte kan visas med standard `a op b`-format, använd `metadata.promptText` i generate

### 2. Registrera domänen
- [ ] `src/domains/registry.js` — `registerDomain(nyDomän)`

### 3. Operation-ID:n — lägg till i **alla** dessa filer
- [ ] `src/lib/operations.js` → `OPERATION_LABELS` (visningsnamn)
- [ ] `src/lib/assignments.js` → `KNOWN_OPERATION_TYPES` (uppdrag via länk)
- [ ] `src/lib/difficultyAdapterSelectionHelpers.js` → `KNOWN_OPERATION_TYPES` (sessionsfiltrering)
- [ ] `src/lib/difficultyAdapterProfileHelpers.js` → `KNOWN_OPERATION_TYPES` (progression per operation)
- [ ] `src/lib/mathUtils.js` → `KNOWN_OPERATION_TYPES` (typ-inferens)
- [ ] `src/components/teacher/sections/dashboardConstants.js` → `ALL_OPERATIONS` (lärarvyer)

### 4. Lärardashboard
- [ ] `src/components/teacher/sections/dashboardCoreHelpers.js` → `getPresetConfig()` — preset för "Uppdrag via länk"
- [ ] `src/components/teacher/sections/AssignmentsPanel.jsx` — knapp för det nya räknesättet
- [ ] `src/components/teacher/sections/dashboardAssignmentRiskHelpers.js` — inkludera i riskberäkningar om relevant
- [ ] `src/components/teacher/sections/dashboardStudentTrainingHelpers.js` — inkludera i träningsförslag

### 5. Aktivering per klass
- [ ] Ny domän dyker automatiskt upp i "Räknesätt ▾" i Klasshantering (via `listDomains()` i `ClassManagementPanel`)
- [ ] Inget extra behövs — men testa att kryssrutan syns och att sparande fungerar

### 6. Elevvy
- [ ] Ny operation syns automatiskt i elevens träningsknappar om läraren aktiverat det för klassen
- [ ] Kontrollera att `buildPracticePath` och `adaptiveEngine` hanterar det nya operation-ID:t korrekt

### 7. Heatmap & statistikvyer
- [ ] Ny operation inkluderas automatiskt i heatmap och masteryboards om den finns i `ALL_OPERATIONS`

---

## Varför finns KNOWN_OPERATION_TYPES på flera ställen?

Historiskt skäl — varje modul definierade sin egna lista. De ska hållas i synk.
**Långsiktig plan:** Flytta till en enda källa i `src/lib/operations.js` och importera därifrån.

---

## Sessionsflöde (kort)

```
Elev startar träning
  → adaptiveEngine.js väljer domän/operation
  → domain.generate(level) skapar problem
  → ProblemDisplay visar (metadata.promptText om text-fråga, annars a op b)
  → Elev svarar
  → domain.evaluate(problem, svar) → { correct, isReasonable }
  → difficultyAdapter.js uppdaterar operationAbilities[operation]
  → Progression: shouldOfferSteadyAdvance() läser difficulty.conceptual_level
```
