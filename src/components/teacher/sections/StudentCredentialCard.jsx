import {
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
  fitFontPt,
  pinText,
  rgb
} from '../../../lib/studentCardLayout'

const mm = value => `${value}mm`
const pt = value => `${value}pt`

function StepRow({ step }) {
  return (
    <div
      className="absolute flex items-center"
      style={{
        left: mm(MARGIN_MM),
        top: mm(step.centerMm - BADGE_RADIUS_MM),
        height: mm(2 * BADGE_RADIUS_MM),
        gap: mm(1.7)
      }}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
        style={{
          width: mm(2 * BADGE_RADIUS_MM),
          height: mm(2 * BADGE_RADIUS_MM),
          background: rgb(COLORS.teal),
          fontSize: pt(BADGE_PT)
        }}
      >
        {step.number}
      </span>
      <span style={{ fontSize: pt(STEP_LABEL_PT), color: rgb(COLORS.ink) }}>{step.label}</span>
    </div>
  )
}

function ValueBox({ box, text }) {
  const fontPt = fitFontPt(text, BOX_WIDTH_MM - 6, box.fontPt, box.minFontPt)
  return (
    <div
      className="absolute flex items-center justify-center font-bold"
      style={{
        left: mm(MARGIN_MM),
        top: mm(box.topMm),
        width: mm(BOX_WIDTH_MM),
        height: mm(BOX_HEIGHT_MM),
        borderRadius: mm(BOX_RADIUS_MM),
        background: rgb(COLORS.boxFill),
        border: `0.3mm solid ${rgb(COLORS.boxLine)}`,
        color: rgb(COLORS.ink),
        fontSize: pt(fontPt),
        whiteSpace: 'nowrap'
      }}
    >
      {text}
    </div>
  )
}

/**
 * The pupil login card exactly as it is printed. Layout and texts come from
 * studentCardLayout, which the PDF generator reads too, so the two cannot
 * drift apart. The card deliberately carries no QR code and no pupil id:
 * pupils log in with code name and PIN.
 */
export default function StudentCredentialCard({ credential }) {
  const name = cardLabel(credential)
  const namePt = fitFontPt(name, CARD_WIDTH_MM - 10, NAME_PT, NAME_MIN_PT)
  return (
    <article
      className="student-credential-card relative overflow-hidden bg-white"
      style={{
        width: mm(CARD_WIDTH_MM),
        height: mm(CARD_HEIGHT_MM),
        border: `0.35mm solid ${rgb(COLORS.boxLine)}`,
        color: rgb(COLORS.ink)
      }}
    >
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center font-bold text-white"
        style={{ height: mm(HEADER_HEIGHT_MM), background: rgb(COLORS.teal), fontSize: pt(HEADER_PT) }}
      >
        {HEADER_TEXT}
      </div>
      <p
        className="absolute"
        style={{ left: mm(MARGIN_MM), top: mm(ADDRESS_BASELINE_MM - 3.6), fontSize: pt(ADDRESS_LEAD_PT) }}
      >
        {ADDRESS_LEAD}
        <span className="font-bold" style={{ fontSize: pt(ADDRESS_PT) }}>{ADDRESS_TEXT}</span>
      </p>

      <StepRow step={STEPS[0]} />
      <ValueBox box={ALIAS_BOX} text={aliasText(credential)} />
      <StepRow step={STEPS[1]} />
      <ValueBox box={PIN_BOX} text={pinText(credential)} />
      <StepRow step={STEPS[2]} />

      {/* Tear-off strip: the name can be read while the login details stay hidden. */}
      <div
        className="absolute flex items-center justify-center font-bold"
        style={{
          left: mm(MARGIN_MM),
          right: mm(MARGIN_MM),
          top: mm(NAME_STRIP_TOP_MM),
          height: mm(CARD_HEIGHT_MM - NAME_STRIP_TOP_MM),
          borderTop: `0.25mm dashed ${rgb(COLORS.stripLine)}`,
          fontSize: pt(namePt),
          whiteSpace: 'nowrap'
        }}
      >
        {name}
      </div>
    </article>
  )
}
