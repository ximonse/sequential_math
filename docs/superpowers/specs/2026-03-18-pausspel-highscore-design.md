# Pausspel: Svårighetskurva, Highscore & Lärarpanel

## Syfte

Jämna ut svårighetsgraden på de två pausspelen (Pong & Snake), lägga till klassbaserade highscore-listor (topp 7) med gruppering, samt en lärarpanel för att se resultat.

## Scope

### Ingår
- Ny svårighetskurva för Pong (tidsbaserad ramp)
- Tidsbaserad svårighetskomponent för Snake (utöver befintlig frukt-snabbning)
- "Ximon is impressed!" vid 120s överlevnad
- Highscore-lista per spel (Pong: tid, Snake: poäng), topp 7
- Highscore visas i game over-skärmen
- Klassbaserad highscore med grupperingsmekanism (t.ex. 6.1 + 6.2 delar lista)
- Lärardashboard-panel med två kolumner (Pong/Snake)

### Ingår inte
- Per-elev historik (bara topp 7-lista)
- Anti-cheat
- Highscore för andra delar av appen

---

## 1. Svårighetskurva

### Pong

Tidsbaserad ramp över 120 sekunder. Fyra faser:

| Fas | Tid | AI-speed | Bollfart | Känsla |
|-----|-----|----------|----------|--------|
| Uppvärmning | 0–20s | 0.30 | 3.0 | Alla hänger med |
| Gradvis | 20–80s | 0.30→0.65 | 3.0→5.5 | Blir utmanande |
| Svårt | 80–110s | 0.65→0.85 | 5.5→7.5 | Riktigt tufft |
| Omöjligt | 110–120s | 0.85→0.95 | 7.5→9.0 | Nästan omöjligt |

Implementeras som en piecewise-linjär funktion av `elapsedSeconds`:
- `t` = elapsed / MAX_TIME (0→1)
- Fas-gränser vid 0.167, 0.667, 0.917, 1.0

Befintliga konstanter som ändras:
- `DIFFICULTY_RAMP_SECONDS`: tas bort (ersätts av fasdefinitioner)
- `INITIAL_BALL_SPEED`: 3.0 (ned från 3.4)
- AI speed-intervall: 0.30→0.95 (från 0.38→0.78)
- Max ball speed X/Y: justeras enligt tabell

### Snake

Behåller befintlig frukt-baserad snabbning (`tickMs -= 4` per frukt). Lägger till tidsbaserad komponent:

- **0–20s:** Ingen tidsbonus. Bas 170ms.
- **20–120s:** `timeSpeedBonus` ökar linjärt, sänker tick-golvet med upp till 50ms extra vid 120s.

Effektiv tick: `Math.max(MIN_TICK_MS, baseTick - fruitSpeedup - timeSpeedBonus)`

Där `MIN_TICK_MS` sänks från 95 till 70 (för att ge utrymme åt den kombinerade effekten).

---

## 2. "Ximon is impressed!"

Triggas om spelaren överlever hela 120 sekunder (timer når 0 utan game over).

- Ersätter vanlig game over-skärm med celebration-variant
- Stor text: "Ximon is impressed!"
- Samma game over-flöde i övrigt (highscore-lista visas under)

Gäller båda spelen identiskt.

---

## 3. Highscore

### Score-mått per spel
- **Pong:** Överlevnadstid i sekunder (0–120). Högre = bättre.
- **Snake:** Poäng (antal frukter ätna). Högre = bättre.

### Lagring (Vercel KV)

Ny nyckel per spel och highscore-grupp:
```
highscores:{game}:{highscoreGroup}
```

Exempel: `highscores:pong:arskurs-6`, `highscores:snake:klass-4a`

Värde: JSON-array, sorterad fallande efter score, max 7 entries:
```json
[
  { "studentId": "ABCD12", "name": "Anna", "score": 118, "timestamp": 1710700000000 },
  { "studentId": "EFGH34", "name": "Erik", "score": 95, "timestamp": 1710699000000 }
]
```

### Highscore-grupp per klass

Nytt fält i class config (`class_extras:{classId}`):
```json
{ "highscoreGroup": "Årskurs 6" }
```

- Default (tomt/saknas): klassens eget `classId` används som grupp
- Klasser med samma `highscoreGroup`-sträng delar lista
- Inställning i lärardashboarden under class settings

### API

**GET `/api/highscores?game=pong|snake&classId=xxx`**
- Slår upp klassens `highscoreGroup` från `class_extras:{classId}`
- Returnerar topp 7 för den gruppen
- Ingen auth krävs (publik data — bara namn och score)

**POST `/api/highscores`**
```json
{
  "game": "pong",
  "studentId": "ABCD12",
  "name": "Anna",
  "score": 95,
  "classId": "class-uuid"
}
```
- Slår upp `highscoreGroup` från klassens config
- Jämför score mot nuvarande topp 7
- Om kvalificerar: infoga, trimma till 7, spara
- Returnerar `{ qualified: true/false, rank: 3, highscores: [...] }`
- Auth: `x-student-password` header (som övrig elevdata)

### Game over-skärm

Efter spelet (eller vid 120s celebration):
1. Rapportera score via POST
2. Visa topp 7-lista
3. Om spelaren tog sig in: markera deras rad (highlight/animation)
4. Om spelaren inte har `classId`: visa bara personligt resultat, ingen lista

---

## 4. Lärardashboard — Pausspel-panel

Ny sektion i dashboarden under befintliga sektioner.

### Layout
```
Pausspel — Highscore
┌──────────────────┬──────────────────┐
│ Pong (tid)       │ Snake (poäng)    │
├──────────────────┼──────────────────┤
│ 1. Anna — 118s   │ 1. Erik — 23     │
│ 2. Erik — 95s    │ 2. Anna — 19     │
│ 3. Maja — 82s    │ 3. Maja — 15     │
│ ...              │ ...              │
└──────────────────┴──────────────────┘
```

- Visar highscore-gruppen för vald klass
- Om klassen inte har highscoreGroup: visar bara den klassens lista
- Gruppnamnet visas om det är en delad grupp

### Class settings — nytt fält
Under befintliga class-inställningar:
- Label: "Highscore-grupp"
- Textfält med placeholder "Lämna tomt = egen lista"
- Spara via befintligt `PUT /api/teacher-class-extras`

---

## 5. Berörda filer

### Ändras
- `src/components/student/PongGame.jsx` — ny svårighetskurva
- `src/components/student/SnakeGame.jsx` — tidsbaserad bonus + highscore-rapportering
- `src/components/student/BreakGameOverlay.jsx` — skicka classId till spelen
- `src/components/teacher/Dashboard.jsx` — ny pausspel-sektion
- `api/teacher-class-extras.js` (PUT) — hantera highscoreGroup-fält

### Nya filer
- `api/highscores.js` — GET/POST highscore-endpoint
- `src/components/student/GameOverScreen.jsx` — delad game over + highscore-vy
- `src/components/teacher/sections/PauseGamePanel.jsx` — lärardashboard-panel
- `src/lib/highscoreClient.js` — klient-helpers för att hämta/rapportera scores

---

## 6. Dataflöde

```
Elev spelar klart
  → PongGame/SnakeGame beräknar score
  → POST /api/highscores { game, studentId, name, score, classId }
  → API slår upp highscoreGroup från class_extras
  → API jämför mot highscores:{game}:{group}
  → Uppdaterar om kvalificerar, returnerar lista + rank
  → GameOverScreen visar lista med highlight

Lärare öppnar dashboard
  → GET /api/highscores?game=pong&classId=xxx
  → GET /api/highscores?game=snake&classId=xxx
  → PauseGamePanel renderar två kolumner
```
