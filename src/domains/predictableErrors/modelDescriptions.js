// Teacher-facing descriptions of computed error models for the directed
// follow-up results (Simon 2026-10-31: describe the thinking error and what the
// contrasts tested; conversation openers are optional and collapsed).
// Only claims that are anchored are attributed to NCM.
const WRITTEN_SUB = 'NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20.'
const WRITTEN_ADD = 'NCM-område AS1 (skriftlig addition), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20.'

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
}
