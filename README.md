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
- Larardashboard logik (sektioner/kolumner): `docs/LARARDASHBOARD_LOGIK.md`
- Exportkolumner (oversikt/aktivitet/elevvy): `docs/EXPORTER_OVERSIKT.md`
- Exportkolumner (radata detalj): `docs/EXPORTER_RADATA.md`
- Pedagogisk reflektion (reliabilitet/validitet): `docs/reflektion.md`
- Felsokning: `docs/FELSOKNING.md`
- Dokumentationsrutin (obligatorisk): `docs/DOKUMENTATIONSRUTIN.md`
- Organisations- och inloggningskontrakt: `docs/ORGANISATION_OCH_INLOGGNING_KONTRAKT.md`

## Konton, organisation och inloggning

Lärar- och administratörsinloggning använder individuella serverlagrade konton. Elever loggar in med sin klasslänk, sitt namn och en fyrsiffrig kod. Skolor, klasser, roller, sessioner och elevinloggning beskrivs i [organisations- och inloggningskontraktet](docs/ORGANISATION_OCH_INLOGGNING_KONTRAKT.md).

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

Varje elev har ett stabilt tekniskt elev-ID som håller ihop profil och historik. Det används av systemet och lärarvyn, men inte som elevens vanliga inloggningsval. Eleven loggar in via sin klasslänk med namn och fyrsiffrig kod. Koden lagras hashad med salt (`sha256-v1`).

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
