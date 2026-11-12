/**
 * Full-page lock shown while a sign-out is in flight: the overlay swallows
 * every pointer event so nothing underneath can be clicked. Pages render it
 * as a sibling of their `inert` page content, so focus and keyboard
 * interaction are locked as well. Mirrors the overlay on instructor.html.
 */
export function SigningOutOverlay() {
  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm"
      role="status"
    >
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-lg">
        <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#A21942]" />
        <p className="text-sm font-semibold text-gray-700">Signing you out…</p>
      </div>
    </div>
  )
}