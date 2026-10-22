# NCM Diamant-screening för mellanstadiet

Tillagd 2026-10-22 på Simons begäran.

## Källa och tillstånd

Uppgifter, facit och analystexter är hämtade ur NCM:s Diamant-diagnoser
(PDF-filerna i `Kodprojekt\sequential_math\NMC`). Simon har intygat
2026-10-22 att materialet får användas i appen. Det besvarar för det här
materialet frågan om käll- och licenspolicy i `NCM_DIAGNOSTIK_PROJEKT.md`.
Det egna paketet i `NCM_DIAGNOSTIK_PAKET.md` är oförändrat egna uppgifter.

## Innehåll

`src/domains/arithmetic/ncmScreeningTasks.v1.json` innehåller sju häften,
från lättare till svårare inom varje område:

| Häfte | Diagnoser |
|---|---|
| + och − | AG4, AS1, AS2, AS3, AS9 |
| × och ÷ | AG6, AG7, AG8, AS4, AS5, AS6 |
| Decimaltal | RD1, RD2, RD3 |
| Bråk | RB1, RB2, RB3, RB4, RB5 |
| Proportionalitet och procent | RP1, RP3, RP4 |
| Mönster och algebra | TAt1, TAt3, TAu2, TAe1, TAe2 |
| Blandad översikt | ett urval ur alla områden |

Uppgifter som kräver bilder (skuggade figurer, tallinjer, geometriska
figurer) är inte med, eftersom räknehäftet bara visar text. SA är sannolikhet
i Diamant; algebran ligger under T (TAt, TAu, TAe).

Varje diagnoskod har NCM:s beskrivning av vad den kartlägger och NCM:s
uppföljningsråd, inklusive förkunskapskedjan. Varje uppgift anger vad just
den uppgiften prövar. Läraren ser detta, och facit, i genomgången.

## Rättning

`answerRule: "ncm_facit"` rättas mot facit i `ncmAnswerCheck.js`: enhet och
"x =" tillåts, komma eller punkt, mellanslag i stora tal. Bråk godtas i
likvärdig form där uppgiften ber om ett bråkvärde, men exakt när uppgiften
ber eleven skriva ett visst bråk. "Ett tal mellan" godtar alla tal i
intervallet. Facit kontrolleras mot oberoende uträkningar i
`ncmScreening.test.js`. Facit skickas aldrig till eleven.
