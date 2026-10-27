# Bildfrågor och eget bildbibliotek

Bildfrågor ingår i Screening och lagras som `diagnostic_only`. De påverkar inte
vanlig träning, mastery eller adaptiv progression. Figurer och exempeluppgifter
är egna original, inte återpublicerade Diamantuppgifter.

## Lärarens arbetsflöde

Välj paketet **Geometri · egna bildfrågor**, eller öppna **Lägg till bildfrågor**.
Läraren väljer svarssätt: en bild, flera bilder, ett namn eller skrivsvar.
Lägg till bilder från figurbanken eller **Mitt bildbibliotek**, ange valfrågans
facit och prova elevförhandsvisningen. Tryck på **Lägg till bildfrågan i samlingen**
innan utdelning. Flera bildfrågor kan läggas till och redigeras.

Frågebilder är innehåll; bildalternativ är tryckbara svar. Interna bildnamn
visas inte automatiskt för eleven. Namnalternativ skrivs av läraren. Skrivsvar
bedöms manuellt. Vid flerval kräver rätt svar exakt rätt urval, utan delpoäng.
Läraren kan se elevens faktiska val, missade alternativ och felaktiga val.

Eleven kan ändra val före inlämning. Ett nytt enkelval ersätter det tidigare;
ett nytt tryck på ett flerval avmarkerar det. Valet lämnar aldrig in eller
byter fråga. Explicita navigerings- och inlämningsknappar används som tidigare.

Uppladdning accepterar PNG, JPEG och WebP, högst 20 MiB som original. Klienten
ritar om bilden till PNG utan ursprungsmetadata, högst 1024 pixlar på längsta
sidan och 512 KiB. Servern kontrollerar PNG-struktur, CRC, dimensioner och
dekomprimerad pixelstorlek. En för stor normaliserad bild avvisas med ett
begripligt fel. Uppladdad SVG accepteras inte; inbyggda SVG-figurer kommer från
den versionsstyrda originalbanken.

Biblioteket är privat per lärarkonto. **Dölj** tar bort bilden från nya val men
bevarar innehållet i redan utdelade screeningar. Bildinnehåll kan inte skrivas
över. Återanvändning av en utdelad samling kopierar dess frysta frågeversioner,
bildreferenser och facit, även när en bild har dolts i biblioteket.

## API för kommande MCP-klient

Ingen MCP-server ingår. Samma befintliga lärarautentisering, screeningåtkomst
och klassbehörighet gäller för API och lärarvy. Skicka `x-teacher-token` och
`Content-Type: application/json` vid JSON-skrivning. Nuvarande screening kräver
skoladministratör eller huvudadministratör; denna funktion utökar inte rollerna.

- `GET /api/teacher-diagnostic-assignments?resource=figures&q=romb` söker
  originalbanken och returnerar ID, version, kategorier och SVG-förhandsvisning.
- `GET /api/teacher-diagnostic-assignments?resource=images` listar det egna
  bibliotekets synliga bilder, utan bilddata.
- `GET /api/teacher-diagnostic-assignments?resource=images&id=ID` hämtar en
  egen bild. Behörig granskning av annan lärares utdelning anger dessutom
  `assignmentId` och `classId`; bilden måste ingå i just den utdelningen.
- `POST /api/teacher-diagnostic-assignments` med
  `{ "action": "upload_image", "nameSv": "Min figur", "dataUrl": "data:image/png;base64,..." }`
  sparar en normaliserad, oföränderlig bild och returnerar referensmetadata.
- `PATCH` till samma adress med `{ "action": "hide_image", "id": "ID" }`
  döljer en egen bild från biblioteket.

Skapa frågor genom befintligt POST-anrop, med exempelvis:

```json
{
  "classId": "CLASS_ID",
  "studentIds": ["PUPIL_ID"],
  "titleSv": "Geometriska former",
  "taskIds": [],
  "customTasks": [{
    "promptSv": "Välj alla figurer som är romber.",
    "responseMode": "multiple",
    "images": [],
    "options": [
      {"id": "a", "image": {"source": "bank", "id": "square-rotated", "version": 1}},
      {"id": "b", "image": {"source": "bank", "id": "triangle-standard", "version": 1}},
      {"id": "c", "image": {"source": "bank", "id": "rhombus-standard", "version": 1}}
    ],
    "correctOptionIds": ["a", "c"]
  }]
}
```

`responseMode` är `single`, `multiple`, `name` eller `text`. Vid `name` har
alternativen `labelSv` i stället för `image`, och frågan har minst en bild i
`images`. Vid `text` krävs en frågebild och inget facit. Vid uppladdning är
bildreferensens `source` värdet `upload`. Högst åtta frågebilder, 2–12
valalternativ och tolv egna frågor tillåts per utdelning. Enkelval och namnval
kräver exakt ett rätt alternativ. Flerval tillåter flera rätta; samma alternativ
får inte förekomma flera gånger i facit.

## Lagring och elevgräns

KV-nycklarna `screening_image:ID` och `screening_images:TEACHER_ID` håller
bildinnehåll respektive biblioteksindex separat från frågeobjekten. Frysta
frågor refererar bildens ID och version. Ingen ny extern tjänst krävs.

Elevens vanliga frågelista innehåller bilder, alternativ och svarssätt men
aldrig facit, rätta alternativ eller privata biblioteksnamn. Uppladdade bilder
hämtas via `GET /api/me/diagnostic-assignments?assignmentId=ID&imageId=ID` med
elevens befintliga session. Tilldelning, klassmedlemskap och screeningåtkomst
kontrolleras före hämtning. Svaret innehåller endast bilddata.

Valfrågor har `answerType: choice` och ett fryst `choiceConfig` med tillåtna
alternativ-ID:n och enkel-/flervalsläge. Händelsen `selection_change` innehåller
`before` och `after` som ID-listor. Sparning, replay, kvittenser, lokala utkast
och inlämning använder det befintliga revisionsskyddet. Äldre text- och
siffersvar behåller sina format. Servern rättar mot utdelningens frysta facit;
aritmetisk uppställningsanalys används inte för geometrifrågorna.

## Verifiering

Enhetstester täcker klassificering, rättning, ogiltiga ID:n, replay,
konfliktskydd, PNG-kontroll och bibliotekets ägarskap. Bildrobotarna kör den
riktiga appen och API:erna med syntetisk minneslagring. De provar skapande,
uppladdning/normalisering, val, scrollavbrott, återläsning, inlämning och
lärarresultat. Detta skiljs från fysisk iPad-provning och verklig KV-drift.

Vid samtidig lokal provning kan `ROBOT_PORT=5391` och
`ROBOT_BUILD_NAME=.build-screening-images` användas med resultatmappen
`--output=robots/test-results/screening-images`. Då ersätter robotarna inte
andra körningars byggfiler eller resultat. Standardinställningarna är kvar.
