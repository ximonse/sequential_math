# Sequential Math - Adaptiv Matteträning

Adaptiv matematikapp för elever med intelligent svårighetsanpassning.

## Kom igång

```bash
npm install
npm run dev
```

Öppna http://localhost:5173

## Manualer

- Lararmanual: `docs/MANUAL_LARARE.md`
- Elevmanual: `docs/MANUAL_ELEV.md`
- Felsokning: `docs/FELSOKNING.md`
- Dokumentationsrutin (obligatorisk): `docs/DOKUMENTATIONSRUTIN.md`

## Lärardashboard lösenord

- Lärardashboarden kräver lösenord via `/teacher-login`.
- Sätt server-variabel i Vercel:

```bash
TEACHER_API_PASSWORD=ditt_losenord
```

- `TEACHER_API_PASSWORD` är den enda lösenordskällan för lararinloggning.
- I `production/preview` krävs den alltid.
- I lokal development finns dev-fallback om variabeln saknas.
- Om `TEACHER_API_PASSWORD` saknas blockeras lararåtkomst till skyddade API:er.

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
- Vid stale lokal profil försöker inloggning verifiera mot cloud och uppdaterar lokal profil vid träff.

## Statistik och historik

- `stats.totalProblems` och `stats.correctAnswers` är livstidsräknare (fortsätter över tid).
- `recentProblems` är ett rullande fönster (senaste 250 svar) som används för dags/veckovy och adaptiv analys.

## Phase 1 (nuvarande)

- Addition (1-3 siffror, med/utan tiövergang)
- Subtraktion (1-3 siffror, med/utan växling)
- Multiplikation (stegvis introduktion, upp till 2-siffrigt * 3-siffrigt)
- Division (stegvis introduktion, exakt division utan rest)
- Decimalmultiplikation (1-2 decimaler)
- Adaptiv svårighet
- Enkel elevprofil
- Lärardashboard med översikt
