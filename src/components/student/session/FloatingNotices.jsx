// Short notices float above the page instead of taking space in it, so a notice
// that appears while the pupil answers can never move the number buttons (Simon
// 2026-11-07). They do not catch taps; whatever is underneath still works.
export default function FloatingNotices({ children }) {
  return <div data-floating-notices className="pointer-events-none fixed inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-3">
    {children}
  </div>
}
