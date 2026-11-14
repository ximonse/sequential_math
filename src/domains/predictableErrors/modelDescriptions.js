// Teacher-facing descriptions of computed error models for the directed
// follow-up results (Simon 2026-10-31: describe the thinking error and what the
// contrasts tested; conversation openers are optional and collapsed).
// Only claims that are anchored are attributed to NCM.
const WRITTEN_SUB = 'NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20.'
const MUL = 'NCM-område AS4 (skriftlig multiplikation), förkunskap AG6–AG7 (tabeller, positioner).'
const MUL_TWO = 'NCM-område AS7 (flersiffrig multiplikation, åk 7–9), förkunskap AS4.'
const DIV = 'NCM-område AS5 (kort division), förkunskap AG8.'
const WRITTEN_ADD = 'NCM-område AS1 (skriftlig addition), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20.'

const SIMON_2026_11_12 = 'Simons iakttagelse i riktiga elevsvar 2026-11-12.'
const REVIEWED_2026_11_14 = 'Agentens förslag, granskat och godkänt av Simon 2026-11-14.'
const SIMON_2026_11_14 = 'Simons tolkning av riktiga elevsvar 2026-11-14.'
const AGENT_2026_11_14 = 'Agentens förslag ur riktiga elevsvar, godkänt av Simon 2026-11-14.'

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
  if (scope === 'decimal_addition' && ['carry_forget', 'one_carry_forgotten'].includes(modelId)) return {
    thinkingSv: modelId === 'one_carry_forgotten'
      ? 'Svaret kan räknas fram med en av de två minnessiffrorna tappad. Båda positionerna ger möjliga svar; svaren visar inte vilken metod eleven använde.'
      : 'Svaret kan räknas fram utan överförda minnessiffror i decimalkolumnerna. I beroende kedjor kan samma svar passa en enda tappad minnessiffra.',
    openersSv: ['Be eleven förklara vad varje minnesetta är värd: en tiondel eller en hel. Hur bevaras värdet vid växlingen?'],
    sourceSv: 'Avgränsat decimalpaket och didaktiskt förslag granskat av Simon 2026-11-05. Modellträff är inte bevis på elevens metod.',
  }
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
  add_multiplied: {
    thinkingSv: 'Eleven multiplicerar talen fast uppgiften är addition, till exempel 4 + 5 = 20 eller 3 + 3 = 9. Det kan vara tecknet som förväxlas, att eleven inte läser tecknet eller att eleven inte vet när man adderar.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Be eleven läsa uppgiften högt: vad betyder tecknet?', 'Ge en textuppgift utan tecken, till exempel "Ali har 4 äpplen och får 5 till", och se vilket räknesätt eleven väljer.'],
  },
  decimal_tenths_as_hundredths: {
    thinkingSv: 'Eleven adderar tiondelarna men skriver summan som hundradelar: 4,5 + 6,6 blir 10,11 i stället för 11,1. Tio tiondelar blir inte en hel.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Fråga hur många tiondelar 5 + 6 tiondelar är, och vad tio tiondelar är tillsammans.'],
  },
  decimal_only_fraction_added: {
    thinkingSv: 'Eleven lägger bara till decimaldelen av det ena talet och tappar heltalsdelen: 2,7 + 1,1 blir 2,8.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Be eleven uppskatta svaret först: ungefär hur mycket är 3 + 1?'],
  },
  decimal_whole_under_last_decimal: {
    thinkingSv: 'Eleven ställer heltalet under den sista decimalen i stället för under heltalen: 6,4 − 2 blir 6,2 och 1 − 0,75 blir 0,74. Positionerna följer inte decimaltecknet.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Låt eleven skriva talen under varandra och fråga var tvåan i 6,4 − 2 ska stå.'],
  },
  bond_ten_friend: {
    thinkingSv: 'Eleven använder 10-kompisen till den kända termen fast måltalet är ett annat: ? + 8 = 15 blir 2. Kanske tror eleven att det fortfarande gäller tiokamrater.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Be eleven läsa måltalet högt och kontrollera svaret: blir 2 + 8 femton?'],
  },
  double_ten_too_many: {
    thinkingSv: 'Dubbeln blir tio för mycket, till exempel 24 + 24 = 58 eller 14 + 14 = 38. Eleven kan lägga till ett tiotal för mycket när entalen dubblas.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Be eleven dubbla tiotalen och entalen var för sig och berätta hur hen tänker.'],
  },
  decimal_mul_carry_forgotten: {
    thinkingSv: 'Eleven multiplicerar decimaltalet som ett heltal men för inte vidare minnessiffran: 3 × 2,4 blir 6,2 i stället för 7,2.',
    sourceSv: SIMON_2026_11_14,
    openersSv: ['Be eleven uppskatta först: är 3 × 2,4 mer eller mindre än 3 × 2?'],
  },
  decimal_mul_carry_added_before: {
    thinkingSv: 'Eleven lägger minnessiffran till siffran före multiplikationen: 3 × 2,4 blir 3 · (2 + 1) = 9 och svaret 9,2.',
    sourceSv: AGENT_2026_11_14,
    openersSv: ['Låt eleven visa i vilken ordning hen multiplicerar och lägger till minnessiffran.'],
  },
  decimal_factor_split_left_to_right: {
    thinkingSv: 'Två fel samtidigt: decimaltalets siffror blir egna tal (positionsfel), och uttrycket räknas från vänster: 7 × 6,7 läses som 7 + 6 · 7 och blir (7 + 6) · 7 = 91.',
    sourceSv: SIMON_2026_11_14,
    openersSv: ['Fråga vad 6,7 betyder: ungefär hur stort är talet?', 'Be eleven uppskatta 7 × 6,7 med 7 × 7.'],
  },
  decimal_mul_whole_part_kept: {
    thinkingSv: 'Eleven multiplicerar bara decimaldelen och låter heltalsdelen stå kvar: 3 × 2,4 blir 2 + 3 · 0,4 = 3,2. Heltal och decimaldel behandlas som skilda tal.',
    sourceSv: SIMON_2026_11_14,
    openersSv: ['Be eleven uppskatta 3 × 2,4: är svaret närmare 3 eller 7?'],
  },
  quotient_stops_at_twelve: {
    thinkingSv: 'Kvoten stannar vid 12 fast den är större: 84 / 6 blir 12. Kanske tar tabellen slut vid 12, eller så delas 84 som 6 · 10 + 6 · 2 utan att eleven kontrollerar att det blir 84. Oklart vilket; behöver granskas.',
    sourceSv: SIMON_2026_11_14,
    openersSv: ['Be eleven kontrollera sitt svar: blir 6 · 12 lika med 84?'],
  },
  fraction_mul_components_added: {
    thinkingSv: 'Eleven adderar täljare och nämnare var för sig fast det är multiplikation: 2/3 · 3/5 blir 5/8.',
    sourceSv: AGENT_2026_11_14,
    openersSv: ['Fråga vad 2/3 av 3/5 betyder: blir det mer eller mindre än 3/5?'],
  },
  fraction_mul_numerators_add_denominators: {
    thinkingSv: 'Eleven multiplicerar täljarna men adderar nämnarna: 2/3 · 3/5 blir 6/8. Reglerna för addition och multiplikation blandas.',
    sourceSv: AGENT_2026_11_14,
    openersSv: ['Be eleven rita 2/3 av 3/5 och jämföra med sitt svar.'],
  },
  fraction_numerators_only: {
    thinkingSv: 'Eleven adderar bara täljarna och lämnar nämnaren: 2/10 + 6/10 blir 8. Bråket uppfattas som två separata tal.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Fråga vad 2/10 betyder och hur stor delen är.'],
  },
  decimal_point_missing_with_error: {
    thinkingSv: 'Eleven räknar decimalerna som heltal, tappar en växling och skriver svaret utan decimaltecken: 1,76 + 2,58 blir 334.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Be eleven uppskatta svaret först: är 1,76 + 2,58 ungefär 4 eller ungefär 300?', 'Låt eleven ställa upp talen med decimaltecknen under varandra och följa växlingen.'],
  },
  fraction_inverted: {
    thinkingSv: 'Eleven får rätt delar men byter plats på täljare och nämnare: 2/4 + 1/4 blir 4/3. Det kan vara osäkerhet om vad som är täljare och nämnare.',
    sourceSv: SIMON_2026_11_12,
    openersSv: ['Fråga vilket tal som visar hur många delar helheten har.'],
  },
  // Step 1 debt, reviewed by Simon 2026-11-14 ("Listan ser bra ut").
  answer_zero: {
    thinkingSv: 'Eleven svarar 0 på flera olika uppgifter. Det säger inget om räknandet; troligen ger eleven upp eller klickar förbi.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga hur det kändes att göra uppgifterna och vad som gjorde att hen svarade 0.'],
  },
  answer_55: {
    thinkingSv: 'Eleven svarar 55 på flera olika uppgifter, oavsett tal. Ett snabbt tangenttryck snarare än ett räknesvar; troligen ger eleven upp eller klickar förbi.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga hur det kändes att göra uppgifterna och vad som gjorde att hen svarade 55.'],
  },
  operation_swap: {
    thinkingSv: 'Eleven räknar med ett annat räknesätt än uppgiften anger, till exempel adderar i en subtraktion: 574 − 238 blir 812.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven läsa uppgiften högt och fråga om svaret kan stämma: kan 574 − 238 bli större än 574?'],
  },
  place_value_scaling: {
    thinkingSv: 'Siffrorna stämmer men värdet är tio, hundra eller tusen gånger för stort eller för litet, till exempel 72 i stället för 7,2. Ofta hamnar decimaltecknet eller en nolla fel.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven uppskatta svaret först: ungefär hur stort borde det bli?'],
  },
  answer_off_by_one: {
    thinkingSv: 'Svaret är ett för mycket eller ett för lite, till exempel 3 · 3 = 8. Oftast plockas tabellen fram fel eller räknas upp ett steg för långt; det kan också vara fokus.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Låt eleven räkna högt från en känd produkt, till exempel 3 · 2, och se var det blir fel.'],
  },
  partial_answer_entry: {
    thinkingSv: 'Bara första siffran i rätt svar står i svarsrutan, till exempel 1 i stället för 12. Troligen avbruten inmatning, inget räknefel.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Titta i räknehäftet eller fråga eleven vad hen tänkte skriva.'],
  },
  last_two_digits_swapped: {
    thinkingSv: 'Svaret har rätt siffror men de två sista i omvänd ordning, till exempel 21 i stället för 12. Troligen fel vid avskrift eller inmatning, inget räknefel.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven läsa sitt svar högt och jämföra med uträkningen.'],
  },
  notebook_answer_mismatch: {
    thinkingSv: 'Uträkningen i räknehäftet ger rätt svar, men ett annat svar står i svarsrutan. Felet ligger i avskrivningen eller inmatningen, inte i räknandet.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Visa eleven båda svaren och fråga vilket som gäller.'],
  },
  ones_digits_only: {
    thinkingSv: 'Eleven multiplicerar bara entalssiffrorna och tappar tiotalen: 3 · 12 blir 6. Tiotalssiffran behandlas som om den inte fanns.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad 12 består av och be eleven räkna 3 · 10 och 3 · 2 för sig.'],
  },
  table_off_by_one: {
    thinkingSv: 'Svaret är en produkt från granntabellen, till exempel 3 · 4 = 9 (som 3 · 3). Tabellfaktumet plockas fram fel; det visas som mönster först över tre olika uppgifter.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Låt eleven räkna fram produkten från en känd granne, till exempel 3 · 4 från 3 · 3.'],
  },
  decimal_parts_multiplied_separately: {
    thinkingSv: 'Eleven multiplicerar heltalet och decimaldelen var för sig och skriver ihop dem: 7 · 6,7 blir 42,49 (7 · 6 = 42 och 7 · 7 = 49). Decimaldelen behandlas som ett eget heltal.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven uppskatta 7 · 6,7 med 7 · 7 och jämföra med sitt svar.'],
  },
  quotient_off_by_one: {
    thinkingSv: 'Kvoten är ett för stor eller för liten: 84 / 6 blir 13. Ofta plockas tabellen fram fel eller så kontrolleras inte svaret.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven kontrollera med multiplikation: blir 6 · 13 lika med 84?'],
  },
  dividend_as_answer: {
    thinkingSv: 'Eleven svarar med talet som ska delas: 84 / 6 blir 84. Det kan betyda att eleven inte vet hur man börjar, eller ett tryck förbi. Behöver granskas.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad uppgiften ber om: hur många sexor ryms i 84?'],
  },
  divisor_as_answer: {
    thinkingSv: 'Eleven svarar med talet man delar med: 84 / 6 blir 6. Oklart om det är en felförståelse eller ett sätt att ge upp; behöver granskas.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven berätta vad 84 / 6 betyder med egna ord eller en bild.'],
  },
  reversed_operands: {
    thinkingSv: 'Eleven delar det mindre talet med det större: 84 / 6 räknas som 6 / 84. Ordningen tros inte spela roll i division.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga om 84 / 6 och 6 / 84 är lika mycket, och låt eleven visa med föremål.'],
  },
  fraction_components_separately: {
    thinkingSv: 'Eleven adderar täljare med täljare och nämnare med nämnare: 1/3 + 1/4 blir 2/7. Bråket ses som två separata heltal.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Låt eleven rita 1/3 och 1/4 och jämföra summan med 2/7.'],
  },
  fraction_keep_first_denominator: {
    thinkingSv: 'Eleven adderar täljarna och behåller första nämnaren: 1/3 + 1/4 blir 2/3. Delarna görs inte lika stora först.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga om tredjedelar och fjärdedelar är lika stora delar.'],
  },
  fraction_integer_in_denominator: {
    thinkingSv: 'Eleven multiplicerar heltalet med nämnaren i stället för täljaren: 3/4 · 2 blir 3/8. Svaret blir mindre fast man tar fler delar.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga: blir två gånger tre fjärdedelar mer eller mindre än tre fjärdedelar?'],
  },
  fraction_add_instead_of_multiply: {
    thinkingSv: 'Eleven adderar bråket och talet i stället för att multiplicera: 3/4 · 2 blir 2 3/4.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Låt eleven läsa uppgiften som två gånger tre fjärdedelar och rita den.'],
  },
  percentage_number_as_amount: {
    thinkingSv: 'Eleven svarar med procenttalet som om det vore beloppet: 12 % av 250 blir 12. Procent uppfattas inte som en andel av något.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga: är 12 % av 250 lika mycket som 12 % av 1000?'],
  },
  percentage_missing_division_100: {
    thinkingSv: 'Eleven multiplicerar med procenttalet som med ett vanligt tal: 12 % av 250 blir 3000. Procent betyder hundradelar, men det delas inte med 100.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven uppskatta: är 12 % av 250 mer eller mindre än 250?'],
  },
  percentage_divide_by_percent_number: {
    thinkingSv: 'Eleven delar med procenttalet i stället för att ta en andel: 12 % av 250 blir 250 / 12, ungefär 20,8.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad 10 % av 250 är och bygg vidare därifrån.'],
  },
  percentage_change_amount_only: {
    thinkingSv: 'Eleven räknar ut rabatten men inte vad som blir kvar: 20 % rabatt på 200 kr blir 40 i stället för 160.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad varan kostar efter rabatten.'],
  },
  percentage_change_reversed: {
    thinkingSv: 'Eleven lägger på i stället för att dra av: 20 % rabatt på 200 kr blir 240.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga om priset blir högre eller lägre med rabatt.'],
  },
  percentage_ratio_not_converted: {
    thinkingSv: 'Eleven räknar ut andelen men skriver den som decimaltal: 12 av 48 blir 0,25 i stället för 25 %.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga hur 0,25 skrivs i hundradelar.'],
  },
  percentage_part_whole_reversed: {
    thinkingSv: 'Eleven delar helheten med delen: 12 av 48 räknas som 48 / 12 = 4, alltså 400 %.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga om delen kan vara mer än helheten.'],
  },
  algebra_constant_dropped: {
    thinkingSv: 'Eleven tar bort talet utan variabel: 3x + 5 förenklas till 3x. Oklart varför; kanske ses talet som färdigt. Behöver granskas.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Sätt in x = 1 i båda uttrycken och jämför.'],
  },
  algebra_unlike_terms_combined: {
    thinkingSv: 'Eleven lägger ihop termer som inte går att slå ihop: 3x + 5 blir 8x. Bokstaven ses som en etikett, inte som ett tal.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Låt eleven sätta in x = 2 i 3x + 5 och i 8x.'],
  },
  algebra_variable_dropped: {
    thinkingSv: 'Eleven räknar med talen och tappar bokstaven: 3x + 5 blir 8.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad x står för och vad 3x betyder.'],
  },
  algebra_coefficient_dropped: {
    thinkingSv: 'När x ska ersättas med ett tal tappar eleven talet framför: 3x + 2 med x = 4 blir 4 + 2 = 6.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad 3x betyder: tre gånger x.'],
  },
  algebra_coefficient_added: {
    thinkingSv: 'Eleven lägger ihop talet framför och värdet: 3x + 2 med x = 4 blir 3 + 4 + 2 = 9. 3x läses som 3 + x.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven skriva 3x med gångertecken.'],
  },
  algebra_square_as_double: {
    thinkingSv: 'Eleven räknar x · x som 2 · x: med x = 5 blir det 10 i stället för 25.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad 5 · 5 är och jämför med 5 + 5.'],
  },
  expression_left_to_right: {
    thinkingSv: 'Eleven räknar i skrivordning och låter inte multiplikation gå före addition: 2 + 3 · 4 blir 20 i stället för 14.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vilken ordning som gäller och låt eleven pröva med ett exempel med pengar.'],
  },
  expression_parentheses_ignored: {
    thinkingSv: 'Eleven räknar som om parenteserna inte fanns: (2 + 3) · 4 blir 14 i stället för 20.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vad parenteserna säger att man ska räkna först.'],
  },
  expression_left_to_right_no_parentheses: {
    thinkingSv: 'Eleven räknar i skrivordning och bortser från parenteserna: 18 / (3 + 3) · 2 blir 18 i stället för 6.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven ringa in det som ska räknas först.'],
  },
  bond_sum_instead_of_missing: {
    thinkingSv: 'I 3 + ? = 10 adderar eleven talen och svarar 13. Likhetstecknet läses som räkna ihop allt.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga vilket tal som behövs för att det ska bli 10.'],
  },
  bond_known_term_returned: {
    thinkingSv: 'I 3 + ? = 10 svarar eleven 3. Oklart om eleven missförstår uppgiften eller skriver av fel; behöver granskas.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven läsa uppgiften högt och peka på det som saknas.'],
  },
  bond_target_returned: {
    thinkingSv: 'I 3 + ? = 10 svarar eleven 10. Svaret blir talet efter likhetstecknet.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga: blir 3 + 10 lika med 10?'],
  },
  double_no_carry: {
    thinkingSv: 'Eleven dubblar utan att föra över tiotalet: dubbelt 7 blir 4 (14 utan ettan), dubbelt 16 blir 22.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven dubbla tiotalen och entalen var för sig.'],
  },
  double_original_returned: {
    thinkingSv: 'Eleven svarar med det givna talet: dubbelt 7 blir 7. Troligen läses uppgiften inte klart, eller så ger eleven upp.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Be eleven läsa uppgiften högt.'],
  },
  double_known_product_returned: {
    thinkingSv: 'När uppgiften ber om hälften svarar eleven med talet som ska halveras: hälften av 14 blir 14.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga: vad är hälften av 14?'],
  },
  double_instead_of_half: {
    thinkingSv: 'Eleven dubblar när uppgiften ber om hälften: hälften av 14 blir 28.',
    sourceSv: REVIEWED_2026_11_14,
    openersSv: ['Fråga om svaret ska bli större eller mindre än 14.'],
  },
}
