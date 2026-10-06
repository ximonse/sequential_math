# Screening — projektkarta 2026-10-06

## Aktiv gemensam karta: redigerbar HTML

Kör `npm run plan:dev` i denna checkout och öppna
`http://127.0.0.1:5325/screening-map.html`. Servern lyssnar bara på den lokala
datorn och serverar endast kartan/API:t, inte andra projektfiler. Den läser
`plan.json` direkt; HTML-kopior och SC-export är inte den aktiva datakällan.

Klicka ett kort, ändra rubrik/status, kryssa deluppgifter eller lägg till en
ny deluppgift. Expandera **Redigera text och anteckningar** för övriga texter.
**Spara kort till planfil** är den enda skrivningen. Utkast varnar vid byte,
stängning och omladdning. Utkast som aldrig sparats överlever inte ett
webbläsarkrasch; de förvaras inte i någon separat lokal kö.

Varje sparning jämför den lästa filens SHA256-revision, använder exklusivt
fillås, säkerhetskopierar tidigare fil i `.backups/` och byter fil atomärt.
Samtidig eller föråldrad skrivning avvisas; utkastet visas kvar. Kopiera text
du vill behålla innan du använder **Läs senaste plan** och sammanför sedan
ändringarna uttryckligen. En avbockning ändrar inte automatiskt kortets
status eller publiceringsbelägg. Varje fält behöver beskriva faktiska läget.

Agenten läser filen och revisionen med `loadPlan` från
`scripts/project-map-store.mjs`, framställer en uppdaterad helplan i en
temporär fil och skriver via:

```text
node scripts/update-project-map.mjs edited-plan.json EXPECTED_SHA256_REVISION
```

Använd inte direkt omskrivning av hela planfilen eller den ursprungliga
generatorn. Läs senaste först, bevara Simons anteckningar och kryssrutor,
uppdatera relaterade kort och spara med revision. `kräver` och `påverkar`
anges i kortens listor; CLI:t härleder den gemensamma relationslistan.

Kör `npm run check:project-map` för strukturen och
`npm run check:project-map -- --staged` före commit. CI kör kontrollen mot
PR-bas/push-bas och stoppar ändringar i app/API/robotkod eller kartverktyg om
planfilen inte ingår. Den verifierar unika ID, giltiga statusar, deluppgifter,
issue-länkar, relationsreferenser och att krav saknar cykler. Kontrollen kan
inte avgöra om korttexten semantiskt täcker all kod: det ansvaret ligger på
agenten. Dokumentationsändringar ensamma kräver inte automatiskt ny korttext.

Testat lokalt: verkligt browser-sparande och återläsning av text/kryssruta,
backup och konflikter, en vinnare bland två samtidiga skrivningar samt
avvisning av cross-origin/obehöriga skrivningar. 137 testfiler/656 tester och
produktionsbuild godkända. Detta är ett lokalt verktyg, inte publicering av
matematikappen. Kartans server måste vara igång när den används.

## Ursprunglig export — historisk snapshot

Detta är en första planeringssnapshot, inte nya produktbeslut eller ett
påstående om aktuell produktion. Kort med förslag behöver väljas av Simon.
Tidigare publicering bygger på verifieringen i arbetstråden; ingen ny
produktionskontroll har gjorts för kartan. GitHub-listan lästes 2026-10-06:
öppna issues #2, #3 och #8. Övriga kort är inte automatiskt GitHub-issues.

## Öppna och använda

- `screening-map.html`: fristående klickbar översikt med sök, statusfilter,
  områdesfilter och förslag på nästa steg. Klicka kort och följ beroenden.
  Filkopian är läsande. Använd serveradressen ovan för redigering.
- `soul-workspace/`: separat arbetsyta för Soul Canvas. Kopiera helst mappen
  till den plats där du vill förvalta projektplanen. Öppna sedan **mappen**
  via Soul Canvas mappval. Befintliga arbetsytor behöver inte ändras.
- Använd inte vanlig JSON-import för denna karta: aktuell importkod byter
  kort-ID och importerar inte synapser eller arbetsytor.
- Soul Canvas relationer har varken semantiska etiketter eller pilriktning i
  den granskade renderaren. Typ och riktning står därför uttryckligen i varje
  korts relationstext. HTML-vyn skiljer `kräver` från `påverkar`.

## Håll planen aktuell

Kortets ID gör det möjligt att koppla samman diskussion, issue och kod.
Varje kort innehåller syfte, status, nästa uppgift, acceptans, beslut,
beroenden och belägg/publicering. Använd samma kort för en funktion över tid.
Behåll diskussion och avfärdade alternativ i beslutstexten; skriv vilket
beslut som gäller och när det fattades.

Efter arbete: uppdatera kortet med konkret leverans, verifiering, commit och
publicering var för sig. En lokal grön kontroll betyder inte produktion.
Skapa issue när arbetet är avgränsat nog att genomföra och länka det från
kortet. GitHub och Soul Canvas synkas inte automatiskt av denna leverans.

`plan.json` är nu den gemensamma aktuella planen. `generate.py` framställde
Soul-formatet och HTML-vyn från samma innehåll. Kör inte generatorn över en
arbetsyta som senare redigerats: den vägrar om `data.json` redan finns.
Soul-exporten förvaltas inte längre som aktiv karta. Återgenerering/synk
kräver ett separat, uttryckligt arbete så att förändringar inte tappas.

## Föreslagen ordning — ännu inte beslut

1. Sammanhållen elevgenomgång och skydd för osparad text.
2. Beslut om elevsynlig återkoppling och vad återlämning betyder.
3. Implementera en vald återkopplingsfunktion: utskrift eller återlämning.
4. Tips och lärarvald uppföljning.
5. Fler analysregler och därefter decimaler/fler räknesätt.

Elevprovning och verklig Redis-verifiering är parallella arbetsspår som
behöver vara klara inför en bredare klassrumspilot.

## Källor och begränsningar

- `../NCM_DIAGNOSTIK_PROJEKT.md`: syfte och gränser.
- `../NCM_DIAGNOSTIK_EXECPLAN.md`: historik och senaste riktningsbeslut.
- `../NCM_DIAGNOSTIK_GENOMGANG.md`: faktisk lokal funktion och begränsningar.
- Lokal historik till `0b1eaa8` och föregående arbete i samma chatt.
- Soul Canvas `canvasDocument.ts`, `types.ts`, `useImportHandlers.ts` och
  `SynapseLines.tsx`: dokumentformat och relationsbegränsningar.

Kartan ersätter inte produktkontrakten. Äldre formuleringar i ExecPlan kan
vara inaktuella; aktuell genomgång och senaste explicit daterade beslut ska
användas vid fortsatt implementation. Soul-dokumentet kan parse-kontrolleras
mot aktuell kod, men faktisk mappöppning i Soul Canvas måste skiljas från den
kontrollen.

Verifierat för denna leverans: Soul Canvas faktiska `parseCanvasDocument`
läser filen med 29 kort och 53 relationer. Alla relationer och arbetsytans
kort-ID refererar befintliga kort; `kräver`-grafen saknar cykler. HTML-vyn har
granskats i webbläsare med sök, statusfilter, nästa-steg-filter, kortdetaljer,
beroendenavigation, stängning och Escape. Faktisk mappöppning i Soul Canvas
är inte verifierad. Appens produktionskod har inte ändrats.
