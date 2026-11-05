// Teacher-facing descriptions of computed error models for the directed
// follow-up results (Simon 2026-10-31: describe the thinking error and what the
// contrasts tested; conversation openers are optional and collapsed).
// Only claims that are anchored are attributed to NCM.
const WRITTEN_SUB = 'NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20.'
const MUL = 'NCM-område AS4 (skriftlig multiplikation), förkunskap AG6–AG7 (tabeller, positioner).'
const MUL_TWO = 'NCM-område AS7 (flersiffrig multiplikation, åk 7–9), förkunskap AS4.'
const DIV = 'NCM-område AS5 (kort division), förkunskap AG8.'
const WRITTEN_ADD = 'NCM-område AS1 (skriftlig addition), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20.'

const DECIMAL_SUB = {
  smaller_minus_larger: {
    thinkingSv: 'Svaret kan räknas fram som större minus mindre i varje decimalkolumn. På källexemplet kan samma svar också komma från växling utan minskad tiondel.',
    openersSv: ['Be eleven förklara vad tiondelarna och hundradelarna betyder och visa sin uträkning.'],
  },
  borrow_forget: {
    thinkingSv: 'Svaret kan räknas fram genom att skriva noll i hundradelskolumnen när växling behövs och subtrahera övriga kolumner utan växling.',
    openersSv: ['Be eleven förklara varför det blev noll och undersök om en tiondel kan bytas mot tio hundradelar.'],
  },
  exchange_not_decremented: {
    thinkingSv: 'Svaret kan räknas fram genom att växla till tio extra hundradelar utan att minska tiondelen. Samma källfelsvar kan passa större minus mindre.',
    openersSv: ['Fråga hur många tiondelar som är kvar när en tiondel har bytts mot tio hundradelar.'],
  },
}
export function modelDescription(modelId, scope) {
  return scope === 'decimal_subtraction' && DECIMAL_SUB[modelId]
    ? { ...DECIMAL_SUB[modelId], sourceSv: 'Avgränsat decimalpaket och didaktiskt förslag granskat av Simon 2026-11-05. Modellträff är inte bevis på elevens metod.' }
    : MODEL_DESCRIPTIONS[modelId]
}

export const MODEL_DESCRIPTIONS = {
  smaller_minus_larger: {
    thinkingSv: 'Eleven behandlar kolumnerna var för sig och tar den större siffran minus den mindre, ”störst minus minst” enligt NCM:s diagnos AS2. Växlingen saknas och svaret prövas inte mot talens värde.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Be eleven räkna en uppgift högt. Tar hen den mindre siffran från den större i entalen?', '”Kan man ta 9 från 7? Vad händer då?”', 'Låt eleven lägga det övre talet med tiobasmaterial och försöka ta bort entalen.'],
  },
  exchange_not_decremented: {
    thinkingSv: 'Eleven växlar och får tio ental, men minskar inte kolumnen till vänster. Växlingen uppfattas som att tio tillkommer, inte som att ett tiotal byts.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Fråga vad som händer med tiotalen när ett tiotal växlas till ental.', 'Låt eleven växla med tiobasmaterial och räkna hur många tiotal som är kvar.'],
  },
  borrow_forget: {
    thinkingSv: 'Eleven skriver 0 i kolumner där den övre siffran är mindre och växlar inte. Det kan bero på att ”det inte går” uppfattas som noll.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Fråga varför det blev 0 i den kolumnen.', 'Pröva samma uppgift med tiobasmaterial: går det att ta bort entalen om man växlar?'],
  },
  zero_donor_not_decremented: {
    thinkingSv: 'Vid växling genom noll blir nollan nio, men hundratalet minskas inte. Kedjan av växlingar avslutas inte.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Be eleven visa var tiotalet som växlades till ental kom ifrån när det inte fanns några tiotal.'],
  },
  zero_intermediate_ten: {
    thinkingSv: 'Vid växling genom noll behålls tio tiotal i stället för nio efter att ett av dem växlats vidare till ental.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Fråga hur många tiotal som finns kvar efter att ett tiotal växlats till ental.'],
  },
  second_exchange_inverted: {
    thinkingSv: 'Eleven gör första växlingen rätt, men nästa kolumn som behöver växlas, eller en nolla, räknas som större minus mindre (0 − x = x). Växlingen är inlärd för entalen men inte generaliserad till fler kolumner.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Be eleven förklara vad som händer i tiotalskolumnen när det inte räcker där heller.', '”Vad är 0 − 7? Vad behöver du göra först?”'],
  },
  unnecessary_exchange: {
    thinkingSv: 'Eleven minskar en kolumn fast ingen växling behövs, som en inövad rutin snarare än ett beslut utifrån siffrorna. Kan också vara slarv med tio.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Fråga när man behöver växla och när man inte behöver det.'],
  },
  carry_forget: {
    thinkingSv: 'Eleven adderar kolumnerna var för sig och för inte vidare tiotalet från entalens summa.',
    sourceSv: WRITTEN_ADD,
    openersSv: ['Fråga var tiotalet från entalens summa tar vägen.', 'Låt eleven lägga talen med tiobasmaterial och växla tio ental till ett tiotal.'],
  },
  one_carry_forgotten: {
    thinkingSv: 'Eleven för vidare en minnessiffra men tappar en annan, ofta den till hundratalen vid flera övergångar i följd.',
    sourceSv: WRITTEN_ADD,
    openersSv: ['Be eleven visa varje minnessiffra och i vilken kolumn den används.'],
  },
  column_sums_concatenated: {
    thinkingSv: 'Eleven skriver hela kolumnsumman i svaret, till exempel 15 i entalen, utan att föra över tiotalet. Placeringen styr mer än talens värde.',
    sourceSv: WRITTEN_ADD,
    openersSv: ['Fråga om svaret är rimligt jämfört med talen som adderades.'],
  },
  phantom_carry: {
    thinkingSv: 'Eleven lägger till en minnessiffra fast entalen inte gav någon, som en inövad rutin. Kan också vara slarv med tio.',
    sourceSv: WRITTEN_ADD,
    openersSv: ['Fråga när det uppstår en minnessiffra och när det inte gör det.'],
  },
  mul_carry_forgotten: {
    thinkingSv: 'Eleven multiplicerar siffra för siffra men för inte vidare tiotalet från produkten till nästa siffra.',
    sourceSv: MUL,
    openersSv: ['Fråga var tiotalet från 6 · 7 = 42 tar vägen.', 'Låt eleven dela upp 46 · 7 som 40 · 7 + 6 · 7 och jämföra.'],
  },
  mul_carry_added_before: {
    thinkingSv: 'Eleven lägger till minnessiffran till nästa siffra innan den multipliceras, i stället för till produkten.',
    sourceSv: MUL,
    openersSv: ['Be eleven säga högt i vilken ordning hen multiplicerar och lägger till.', 'Jämför (4 + 4) · 7 med 4 · 7 + 4.'],
  },
  mul_carry_always_one: {
    thinkingSv: 'Eleven för vidare en minnessiffra men skriver den alltid som 1, även när produkten är 20 eller mer. Minnessiffran uppfattas som en markering, inte som antalet tiotal.',
    sourceSv: MUL,
    openersSv: ['Fråga hur många tiotal det finns i 42 och vad minnessiffran ska visa.', 'Jämför 6 · 7 = 42 med 6 · 2 = 12: blir minnessiffran densamma?'],
  },
  add_left_to_right: {
    thinkingSv: 'Eleven räknar kolumnerna från vänster, som när man läser, och för minnessiffran till kolumnen till höger. Den sista minnessiffran får ingen plats.',
    sourceSv: WRITTEN_ADD,
    openersSv: ['Be eleven visa i vilken kolumn hen börjar och varför.', 'Fråga vart tiotalet från entalens summa ska ta vägen.'],
  },
  sub_left_to_right: {
    thinkingSv: 'Eleven räknar kolumnerna från vänster och växlar genom att låna från kolumnen till höger i stället för till vänster.',
    sourceSv: WRITTEN_SUB,
    openersSv: ['Be eleven visa varifrån tiotalet kommer när entalen inte räcker.', 'Låt eleven växla med tiobasmaterial: går det att få tio från entalen?'],
  },
  mul_partials_concatenated: {
    thinkingSv: 'Eleven skriver varje siffras produkt efter varandra utan att ta hänsyn till positionerna. Placeringen styr mer än talens värde.',
    sourceSv: MUL,
    openersSv: ['Fråga om svaret är rimligt: ungefär hur mycket är 46 · 7?'],
  },
  mul_columnwise: {
    thinkingSv: 'Eleven multiplicerar bara siffror som står i samma kolumn, som vid addition. Uppställningen styr i stället för innebörden.',
    sourceSv: MUL,
    openersSv: ['Fråga hur många omgångar av 46 det blir och låt eleven räkna med det.'],
  },
  mul_no_row_shift: {
    thinkingSv: 'Eleven flyttar inte den andra delprodukten ett steg åt vänster och behandlar tiotalssiffran i den andra faktorn som ental.',
    sourceSv: MUL_TWO,
    openersSv: ['Fråga vad tvåan i 23 betyder och vad 34 · 20 blir.'],
  },
  div_remainder_ignored: {
    thinkingSv: 'Eleven delar siffra för siffra men låter resten försvinna i stället för att föra den vidare som tiotal till nästa siffra.',
    sourceSv: DIV,
    openersSv: ['Fråga vad som händer med det som blir över när 16 delas med 6.', 'Låt eleven dela 168 kronor i sex lika delar med pengar.'],
  },
  div_remainder_as_ones: {
    thinkingSv: 'Eleven för vidare resten men lägger den till som ental i stället för som tiotal (4 + 8 i stället för 48).',
    sourceSv: DIV,
    openersSv: ['Fråga hur mycket resten 4 är värd när den flyttas till entalen.'],
  },
  div_zero_dropped: {
    thinkingSv: 'Eleven hoppar över nollan i kvoten när en siffra är mindre än nämnaren, så att svaret blir för litet.',
    sourceSv: DIV,
    openersSv: ['Fråga ungefär hur stort svaret borde vara: 648 delat med 6 är mer än 100.'],
  },
}
