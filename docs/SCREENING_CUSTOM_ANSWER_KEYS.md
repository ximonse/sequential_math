# Egna självrättande screeningfrågor

Lokalt byggt 2026-10-28. Publicering och faktisk elevutdelning är separata steg.

För privat sparande, genomgång och revidering före utdelning, se den separat
byggda funktionen [Screeningutkast](SCREENING_DRAFTS.md).

Läraren kan lägga till flera frågor under **Egna frågor med automatisk rättning**
i Screening: dela ut. Varje fråga har frågetext, facitformat, facit och ett
valfritt räknehäfte. Frågorna listas med facit före utdelning och kan redigeras
eller tas bort. Högst tolv egna frågor sammanlagt, inklusive bildfrågor och
den äldre lärarbedömda skrivfrågan, tillåts per samling.

Den befintliga uppdragslagringen fryser frågorna och facit. Kopiering av en
samling bevarar dess facit men kopierar inga elevsvar. Äldre egna skrivfrågor
utan facit förblir lärarbedömda. Inga diagnostiska svar ändrar mastery.

## Facitkontrakt

En post i `customTasks` får valfritt `answerKey`:

```json
{
  "promptSv": "Beräkna 5,63 - 3,28. Svara i kg.",
  "gridEnabled": true,
  "answerKey": { "format": "number", "expected": [2.35], "unit": "kg" }
}
```

Servern validerar facit innan uppdraget sparas. Det frysta underlaget får
`answerRule: custom_facit` och `answerType: text`, så eleven kan skriva bråk,
decimaltecken, enheter och andra nödvändiga tecken. `answerKey` är enbart
lärardata och följer inte med elevens uppdragslista eller försöks-API.
Materialförhandsvisningen använder samma kontrakt och validering.

| Format | `expected` | Bedömning |
| --- | --- | --- |
| `number` | Ett ändligt tal | Komma/punkt, grupperade tusental och `x =` accepteras. |
| `fraction` | Täljare och positiv nämnare | Likvärdiga bråk accepteras; decimalform gör inte det. |
| `mixed` | Täljare och positiv nämnare för hela värdet | Kräver blandad form med en riktig bråkdel. |
| `numbers` | Två till åtta tal | Samma ordning; separera med semikolon, `och` eller `and`. Inga enheter i detta format. |
| `text` | Ett till tolv bestämda svar | NCM:s normalisering av exakta textsvar, inte bedömning av resonemang. |

Tal är begränsade till absolutvärde 10^12 och högst tolv decimaler. Täljare
och nämnare måste vara säkra heltal. Bråk jämförs med exakta heltalsprodukter.
`fraction` får dessutom `denominator` lika med facitets nämnare om frågan
uttryckligen kräver denna nämnare. Exempelvis kräver `{format: "fraction",
expected: [64, 100], denominator: 100}` just hundradelar, inte `16/25`.

`unit` gäller endast `number`. En utelämnad enhet accepteras eftersom frågan
anger den. En uttryckligen felaktig enhet avvisas. Vanliga benämningar som
`liter`/`l` och `kr`/`kronor` accepteras för samma enhet; ingen omräkning mellan
enheter görs. Ett procentfacit 35 betyder 35 procent, inte 0,35.

Svar som `23 + 0` accepteras inte bara för att facittalet förekommer i texten.
Det befintliga NCM-systemets numeriska och exakta textjämförelse återanvänds,
med striktare inmatnings- och representationskontroller för egna facit.

## Resultat och begränsningar

Samma observationskedja som NCM räknar rätt/fel/ofullständigt/obesvarat för
slutsvaret. Lärarmatrisen räknar egna facitfrågor bland automatiskt rättade
uppgifter även om svarsfältet använder textinmatning. Facit visas i lärarens
detaljvy. Räknehäftets rutor och händelser sparas oförändrade.

En korrekt slutrad bevisar inte att elevens förklaring är korrekt.
Resonemanget granskas separat av läraren. Inga nya metodhypoteser härleds ur
en egen frågas fria text eller slutsvar.

Verifiering: `screeningAnswerKey.test.js`, `diagnosticAssignmentStore.test.js`
och `robots/screening-answer-keys.robot.js`. Robotprovet använder endast
syntetiska elever och kontrollerar lärarens skapande, exakt mottagare,
facitsekretess, elevsvar, omladdning, resultat och oförändrad mastery.

## Lokal verifiering 2026-10-28

189 testfiler och 940 tester passerade. Produktionsbygget, riktad lint och
projektkartans kontroll passerade. Elevvyn granskades med ifyllt svar i
liggande och stående iPadstorlek; även frågeredigerare och lärarresultat
granskades som renderade bilder. Det är webbläsaremulering, inte fysisk iPad.

Hela robotkörningen gav 155 godkända, sex misslyckade och fyra överhoppade
fall. De sex misslyckade fallen passerade därefter separat med en arbetare:
Dubblor via länk, låst uppdrag, temaval, inloggning, klassarbetsvy och
analysrapportens sparade räknehäfte. Ingen helt grön gemensam körning påstås.
Det nya facitflödet passerade både separat och i hela robotkörningen.
De fyra överhoppade fallen gäller det villkorade materialgodkännandeflödet.
Ingen riktig elevutdelning eller produktionsverifiering har gjorts här.

## Isolerad publiceringskandidat

Kandidaten utgår från produktionens `05748fb`, med bara detta funktionsstöd.
Det separata, ännu opublicerade materialförhandsvisnings-API:t ingår inte.
173 testfiler/872 tester, build och arkitekturkontroll passerade. Tio riktade
robotfall med en arbetare passerade: egna facit, NCM, sparande och redigering,
avslut, gruppresultat samt bildfrågor. Publicering sker enbart via GitHub.

## Publicering verifierad 2026-10-28

PR23 är sammanslagen till master: `16ce82271337628a1b1a3396d9be0ee90f303958`.
Vercel-projektet sekvens har produktionsdeployment
`dpl_BbXaS6ECwFFnHtA36qJLRwKfPsj2` READY på detta SHA med
`matematik.ximon.se` som alias. Den aktiva domänen serverar
`index-Dry9GKK5.js` med den nya redigeraren. Autentiserad lärarläsning
verifierade åtkomst och de avsedda mottagarnas aktuella utdelningsbarhet.

Ingen faktisk elevutdelning gjordes. Den lokala assignment-authoring-skillen
kräver separat granskning av aktuell innehållsversion och exakta mottagare
genom serverns godkännandeflöde. Det separat byggda materialgranskningsflödet
är ännu opublicerat och ingick inte i PR23. Ingen alternativ utdelningsväg
användes. Nästa beslut gäller publicering av detta separata flöde.
