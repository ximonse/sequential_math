# Sequential Math - Adaptiv Matteträning

Adaptiv matematikapp för elever med intelligent svårighetsanpassning.

## Kom igång

```bash
npm install
npm run dev
```

Öppna http://localhost:5173

## Lärardashboard lösenord

- Lärardashboarden kräver lösenord via `/teacher-login`.
- Sätt lösenord i `.env.local`:

```bash
VITE_TEACHER_PASSWORD=ditt_losenord
```

- Om inget är satt används standardlösenordet `teacher123`.

## Struktur

- `/src/components/student/` - Elevvy (träning)
- `/src/components/teacher/` - Lärardashboard
- `/src/lib/` - Core-logik (problemgenerator, adaptiv logik)
- `/docs/` - Specifikationer och arkitekturdokument

## Elev-ID

Varje elev har ett unikt 6-teckens ID (t.ex. ABC123). Nya elever skapas automatiskt vid första inloggning.

## Phase 1 (nuvarande)

- Addition (1-3 siffror, med/utan tiövergang)
- Multiplikation (stegvis introduktion, upp till 2-siffrigt * 3-siffrigt)
- Decimalmultiplikation (1-2 decimaler)
- Adaptiv svårighet
- Enkel elevprofil
- Lärardashboard med översikt
