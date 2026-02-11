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
- För att skydda cloud-API:er för elevdata i produktion, sätt även server-env:

```bash
TEACHER_API_PASSWORD=samma_som_lararlosenord
```

Tips: sätt `VITE_TEACHER_PASSWORD` och `TEACHER_API_PASSWORD` till samma värde.
Om `TEACHER_API_PASSWORD` saknas körs `/api/students` och `/api/student/:id` i bakåtkompatibelt öppet läge.

## Delad elevdata mellan enheter

För att lärarvyn ska se resultat från elevernas enheter krävs cloud-sync.

1. Lägg till en Redis/KV-integration i Vercel-projektet (Upstash Redis via Marketplace).
2. Sätt env-var i Vercel:

```bash
VITE_ENABLE_CLOUD_SYNC=1
```

3. Redeploya projektet.

När detta är aktivt:
- elevprofiler sparas lokalt + syncas till `/api/student/:id`
- lärardashboard hämtar samlad lista från `/api/students`

## Struktur

- `/src/components/student/` - Elevvy (träning)
- `/src/components/teacher/` - Lärardashboard
- `/src/lib/` - Core-logik (problemgenerator, adaptiv logik)
- `/docs/` - Specifikationer och arkitekturdokument

## Elev-ID och konto

- Inloggningsnamn normaliseras till versaler och säkra tecken.
- ID-längd är flexibel (inte låst till 6 tecken).
- Rekommenderat flöde är att lärare skapar elever via klasslistor.
- Elevlösenord lagras hashat med salt (`sha256-v1`) och äldre klartextprofiler migreras vid inloggning/sync.

## Phase 1 (nuvarande)

- Addition (1-3 siffror, med/utan tiövergang)
- Subtraktion (1-3 siffror, med/utan växling)
- Multiplikation (stegvis introduktion, upp till 2-siffrigt * 3-siffrigt)
- Division (stegvis introduktion, exakt division utan rest)
- Decimalmultiplikation (1-2 decimaler)
- Adaptiv svårighet
- Enkel elevprofil
- Lärardashboard med översikt
