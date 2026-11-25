// One source of truth for the pupil login card. The PDF (jsPDF, millimetres)
// and the card on screen (CSS, the same millimetres) both read this file, so
// the teacher sees on screen exactly what comes out of the printer.
//
// Simon 2026-11-24: the card in the admin view must look like the printable
// PDF. The QR code and the pupil id were dropped at the same time: pupils log
// in with code name and PIN, and the login screen has no QR scanner.

export const A7_CARDS_PER_A4 = 8
export const CARDS_PER_ROW = 4
export const CARD_WIDTH_MM = 297 / CARDS_PER_ROW
export const CARD_HEIGHT_MM = 105
export const HEADER_HEIGHT_MM = 8.6
export const NAME_STRIP_TOP_MM = 93.5
export const MARGIN_MM = 4.1
export const BOX_WIDTH_MM = CARD_WIDTH_MM - 2 * MARGIN_MM
export const BOX_HEIGHT_MM = 16.3
export const BADGE_RADIUS_MM = 2.5
export const BOX_RADIUS_MM = 1.8

export const HEADER_TEXT = 'MATEMATIK.XIMON.SE'
export const ADDRESS_LEAD = 'Gå till '
export const ADDRESS_TEXT = 'matematik.ximon.se'
export const ADDRESS_BASELINE_MM = 13.9
export const ADDRESS_LEAD_PT = 8.8
export const ADDRESS_PT = 10.5
export const HEADER_PT = 8.5
export const STEP_LABEL_PT = 10
export const BADGE_PT = 8.5
export const NAME_PT = 20
export const NAME_MIN_PT = 8

// The numbers match the steps the pupil sees on the login screen.
export const STEPS = [
  { number: 1, label: 'Skriv ditt kodnamn:', centerMm: 24.1 },
  { number: 2, label: 'Skriv din PIN:', centerMm: 54 },
  { number: 3, label: 'Tryck på Logga in', centerMm: 84 }
]

export const ALIAS_BOX = { topMm: 28.4, fontPt: 13, minFontPt: 8 }
export const PIN_BOX = { topMm: 58.4, fontPt: 22, minFontPt: 22 }

export const COLORS = {
  teal: [15, 118, 110],
  ink: [15, 23, 42],
  boxFill: [241, 245, 249],
  boxLine: [203, 213, 225],
  stripLine: [100, 116, 139]
}

export const rgb = channels => `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`

export function cardLabel(credential) {
  return String(credential?.name || credential?.displayAlias || 'Elev').trim() || 'Elev'
}

export function aliasText(credential) {
  return String(credential?.displayAlias || '–')
}

// Wide spacing makes each digit readable from across a table.
export function pinText(credential) {
  return String(credential?.pin ?? '').split('').join('  ')
}

// Helvetica bold is roughly this wide per character. The PDF measures text for
// real; on screen this estimate keeps the same text from overflowing its box.
const BOLD_CHAR_WIDTH_RATIO = 0.56
const PT_TO_MM = 0.3528

export function estimateTextWidthMm(text, fontPt) {
  return String(text).length * fontPt * PT_TO_MM * BOLD_CHAR_WIDTH_RATIO
}

export function fitFontPt(text, maxWidthMm, startPt, minPt) {
  let size = startPt
  while (size > minPt && estimateTextWidthMm(text, size) > maxWidthMm) size -= 0.5
  return size
}
