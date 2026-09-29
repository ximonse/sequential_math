# 🎲 Subitizing-funktionen — Implementationsdemo

## Överblick

Subitizing är en ny övningstyp för **snabb taluppfattning**. Eleverna ser en tärning med 0-10 prickar och måste **omedelbar** klicka rätt antal utan att räkna.

## Filstruktur

### Nya komponenter

```
src/components/student/
├── SubitizingSession.jsx          # Huvudkomponent för subitizing-sessioner
└── session/
    └── SubitizingDice.jsx         # Visuell tärning med klickbar nummerpanel
```

### Nya lib-filer

```
src/lib/
├── subitizingResults.js           # Lagring av subitizing-resultat
└── (uppdaterad) studentProfile.js # addSubitizingSessionResult()
└── (uppdaterad) assignments.js    # Support för kind: 'subitizing'
```

### Lärar-UI

```
src/components/teacher/sections/
├── SubitizingCreatorDialog.jsx    # Dialog för att skapa subitizing-övningar
└── (uppdaterad) AssignmentsPanel.jsx # "+ Snabb tal" knapp
```

## Hur det fungerar

### 1. Lärare skapar övning
- Klicka "+ Snabb tal" i lärarens Uppdrag-panel
- Mata in ett namn för övningen
- Övningen skapas som `kind: 'subitizing'`

### 2. Elev får länk
- Läraren kopierar länken och delar med eleven
- Länken innehåller `assignment_payload` med övnings-ID och typ

### 3. Elev gör övning
- Eleven ser en vit tärning med röda prickar (0-10)
- Prickmönstren följer autentiska tärning-format:
  - 1: en mitt
  - 2: två hörn diagonalt
  - 3: två hörn + ett mitt
  - 4: fyra hörn
  - 5: fyra hörn + ett mitt
  - etc.
- Eleven klickar rätt nummer **snabbt som sjutton**
- Ingen "klar"-knapp — nästa problem visas automatiskt
- Reaktionstid mäts från när tärningen visas

### 4. Resultat sparas
- Automatisk sparning av:
  - Antal rätta svar
  - Genomsnittlig tid per svar
  - Framgångsgrad (%)
  - Problemdetaljer (vad eleven svarade vs rätt svar)
- Resultat integreras i elevens profil
- Lärare kan se resultat i "Matematikövningar — Resultat" panel

## Demo av tärnings-mönster

```
0:   (tom)
     
1:   ·          2:   ·   ·       3:   ·   ·
          eller                        ·
                      ·   ·                 ·   ·

4:   ·   ·       5:   ·   ·       6:   ·   ·
     ·   ·            ·                ·   ·
                      ·   ·            ·   ·

7:   ·   ·       8:   ·   ·   ·   9:   ·   ·   ·
     ·   ·            ·   ·            ·   ·
     ·   ·            ·   ·            ·   ·

10:  ·   ·   ·
     ·   ·
     ·   ·   ·
          ·
```

## Tekniska detaljer

### SubitizingDice-komponenten

```jsx
<SubitizingDice 
  value={5}              // tal 0-10
  onAnswer={handleAnswer} // callback(number, timeMs)
  disabled={false}       // blockera klick
/>
```

- Mäter tid från `useState(Date.now())`
- Ändrar fokus vid nytt tal via `useEffect`
- Renderar prickar via absolut positionering
- Nummerknappar: 2x5 grid

### Resultat-struktur

```javascript
{
  totalProblems: 30,
  correctAnswers: 24,
  avgTimeMs: 1250,
  successRate: 0.8,    // 80%
  problemDetails: [
    {
      correctAnswer: 5,
      studentAnswer: 5,
      isCorrect: true,
      timeMs: 1100
    },
    // ...
  ]
}
```

### Integration med elevprofil

```javascript
// Uppdaterar elevens lifetime-statistik
addSubitizingSessionResult(profile, assignment, sessionData)
// → profile.stats.lifetimeProblems += totalProblems
// → profile.stats.lifetimeCorrectAnswers += correctAnswers
```

## Routes

- **Lärare:** `/teacher` → Dashboard → "+ Snabb tal"-knapp
- **Elev:** `/student/:studentId/subitizing?assignment=...&assignment_payload=...`

## Tester

Bygget lyckas utan fel:
```
✓ 580 modules transformed
✓ built in 6.11s
```

Inga JavaScript-fel i konsolen ✓

## Nästa steg (frivilligt)

- [ ] Läggga till subitizing-resultat-panel i lärar-dashboard (redan strukturerad)
- [ ] Tidsraster-animationer för snabbare feedback
- [ ] Sound-feedback vid rätt/fel
- [ ] Svårighetsgrader (t.ex. bara 1-5 eller bara 6-10)
- [ ] Statistik-grafer för taluppfattnings-utveckling
