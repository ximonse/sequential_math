import { jsPDF } from 'jspdf'
import {
  A7_CARDS_PER_A4,
  ADDRESS_BASELINE_MM,
  ADDRESS_LEAD,
  ADDRESS_LEAD_PT,
  ADDRESS_PT,
  ADDRESS_TEXT,
  ALIAS_BOX,
  BADGE_PT,
  BADGE_RADIUS_MM,
  BOX_HEIGHT_MM,
  BOX_RADIUS_MM,
  BOX_WIDTH_MM,
  CARDS_PER_ROW,
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  COLORS,
  HEADER_HEIGHT_MM,
  HEADER_PT,
  HEADER_TEXT,
  MARGIN_MM,
  NAME_MIN_PT,
  NAME_PT,
  NAME_STRIP_TOP_MM,
  PIN_BOX,
  STEPS,
  STEP_LABEL_PT,
  aliasText,
  cardLabel,
  pinText
} from './studentCardLayout.js'

export { A7_CARDS_PER_A4 }

function shrinkToFit(doc, text, maxWidth, startSize, minSize) {
  let size = startSize
  doc.setFontSize(size)
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5
    doc.setFontSize(size)
  }
  return size
}

function printHeader(doc, x, y) {
  doc.setFillColor(...COLORS.teal)
  doc.rect(x, y, CARD_WIDTH_MM, HEADER_HEIGHT_MM, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(HEADER_PT)
  doc.text(HEADER_TEXT, x + CARD_WIDTH_MM / 2, y + 5.3, { align: 'center' })
}

function printAddress(doc, x, y) {
  const baseline = y + ADDRESS_BASELINE_MM
  doc.setTextColor(...COLORS.ink)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(ADDRESS_LEAD_PT)
  doc.text(ADDRESS_LEAD, x + MARGIN_MM, baseline)
  const offset = doc.getTextWidth(ADDRESS_LEAD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(ADDRESS_PT)
  doc.text(ADDRESS_TEXT, x + MARGIN_MM + offset, baseline)
}

function printStep(doc, x, y, number, label, centerY) {
  const cx = x + MARGIN_MM + BADGE_RADIUS_MM
  doc.setFillColor(...COLORS.teal)
  doc.circle(cx, y + centerY, BADGE_RADIUS_MM, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(BADGE_PT)
  doc.text(String(number), cx, y + centerY + 1.05, { align: 'center' })
  doc.setTextColor(...COLORS.ink)
  doc.setFontSize(STEP_LABEL_PT)
  doc.text(label, x + MARGIN_MM + 2 * BADGE_RADIUS_MM + 1.7, y + centerY + 1.3)
}

function printBox(doc, x, y, top, text, fontSize, minFontSize) {
  doc.setFillColor(...COLORS.boxFill)
  doc.setDrawColor(...COLORS.boxLine)
  doc.setLineWidth(0.3)
  doc.roundedRect(x + MARGIN_MM, y + top, BOX_WIDTH_MM, BOX_HEIGHT_MM, BOX_RADIUS_MM, BOX_RADIUS_MM, 'FD')
  doc.setTextColor(...COLORS.ink)
  doc.setFont('helvetica', 'bold')
  const size = shrinkToFit(doc, text, BOX_WIDTH_MM - 6, fontSize, minFontSize)
  const capHeightMm = 0.72 * size * 0.3528
  doc.text(text, x + CARD_WIDTH_MM / 2, y + top + BOX_HEIGHT_MM / 2 + capHeightMm / 2, { align: 'center' })
}

// The name sits on a tear-off strip so a teacher can hand out cards by name
// without the login details being readable across the table.
function printTearOffName(doc, name, x, y) {
  doc.setDrawColor(...COLORS.stripLine)
  doc.setLineWidth(0.25)
  doc.setLineDashPattern([1.2, 0.9], 0)
  doc.line(x + MARGIN_MM, y + NAME_STRIP_TOP_MM, x + CARD_WIDTH_MM - MARGIN_MM, y + NAME_STRIP_TOP_MM)
  doc.setLineDashPattern([], 0)
  doc.setTextColor(...COLORS.ink)
  doc.setFont('helvetica', 'bold')
  const size = shrinkToFit(doc, name, CARD_WIDTH_MM - 10, NAME_PT, NAME_MIN_PT)
  const stripCenter = NAME_STRIP_TOP_MM + (CARD_HEIGHT_MM - NAME_STRIP_TOP_MM) / 2
  const capHeightMm = 0.72 * size * 0.3528
  doc.text(name, x + CARD_WIDTH_MM / 2, y + stripCenter + capHeightMm / 2, { align: 'center' })
}

export function credentialCardsFilename(credentials) {
  const first = cardLabel(credentials?.[0]).replace(/[^a-zA-Z0-9ÅÄÖåäö_-]+/g, '-').slice(0, 30) || 'elevkort'
  return `elevkort-${first}-${new Date().toISOString().slice(0, 10)}.pdf`
}

/**
 * Generates a one-time download. Raw PINs are only read from the in-memory
 * credential response and are never persisted by this helper.
 */
export async function downloadStudentCredentialPdf(credentials, filename = credentialCardsFilename(credentials)) {
  const valid = (Array.isArray(credentials) ? credentials : []).filter(item => (
    item && typeof item.studentId === 'string' && item.studentId
      && String(item.displayAlias || '').trim() && /^\d{4}$/.test(String(item.pin || ''))
  ))
  if (!valid.length) throw new Error('Det finns inga kompletta elevkort att skapa PDF av.')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })

  valid.forEach((credential, index) => {
    if (index > 0 && index % A7_CARDS_PER_A4 === 0) doc.addPage('a4', 'landscape')
    const slot = index % A7_CARDS_PER_A4
    const column = slot % CARDS_PER_ROW
    const row = Math.floor(slot / CARDS_PER_ROW)
    const x = column * CARD_WIDTH_MM
    const y = row * CARD_HEIGHT_MM
    const name = cardLabel(credential)

    doc.setDrawColor(...COLORS.boxLine)
    doc.setLineWidth(0.3)
    doc.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM)
    printHeader(doc, x, y)
    printAddress(doc, x, y)
    printStep(doc, x, y, STEPS[0].number, STEPS[0].label, STEPS[0].centerMm)
    printBox(doc, x, y, ALIAS_BOX.topMm, aliasText(credential), ALIAS_BOX.fontPt, ALIAS_BOX.minFontPt)
    printStep(doc, x, y, STEPS[1].number, STEPS[1].label, STEPS[1].centerMm)
    printBox(doc, x, y, PIN_BOX.topMm, pinText(credential), PIN_BOX.fontPt, PIN_BOX.minFontPt)
    printStep(doc, x, y, STEPS[2].number, STEPS[2].label, STEPS[2].centerMm)
    printTearOffName(doc, name, x, y)
  })

  doc.save(filename)
  return { count: valid.length, pages: Math.ceil(valid.length / A7_CARDS_PER_A4), filename }
}
