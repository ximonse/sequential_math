# Screening — projektkarta 2026-10-06

Detta är en första planeringssnapshot, inte nya produktbeslut eller ett
påstående om aktuell produktion. Kort med förslag behöver väljas av Simon.
Tidigare publicering bygger på verifieringen i arbetstråden; ingen ny
produktionskontroll har gjorts för kartan. GitHub-listan lästes 2026-10-06:
öppna issues #2, #3 och #8. Övriga kort är inte automatiskt GitHub-issues.

## Öppna och använda

- `screening-map.html`: fristående klickbar översikt med sök, statusfilter,
  områdesfilter och förslag på nästa steg. Klicka kort och följ beroenden.
  Förhandsvisningen är läsande och sparar inga ändringar.
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

`plan.json` är den strukturerade startsnapshoten. `generate.py` framställde
Soul-formatet och HTML-vyn från samma innehåll. Kör inte generatorn över en
arbetsyta som senare redigerats: den vägrar om `data.json` redan finns.
Efter handoff förvaltas en kopia i Soul Canvas; återgenerering/synk kräver ett
separat, uttryckligt arbete så att förändringar inte tappas.

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
