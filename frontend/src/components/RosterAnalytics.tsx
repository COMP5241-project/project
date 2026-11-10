import { LoaderCircle, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteRoster,
  fetchRosterDetail,
  fetchRosters,
  importRoster,
  type RosterDetail,
  type RosterSummary,
} from '../lib/api'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function formatPercent(value: number | null) {
  return value === null ? '—' : `${Math.round(value)}%`
}

/** Instructor-facing roster import + participation analytics dashboard. */
export function RosterAnalyticsView() {
  const [rosters, setRosters] = useState<RosterSummary[] | null>(null)
  const [rostersError, setRostersError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RosterDetail | null>(null)
  const [detailError, setDetailError] = useState('')
  const [importName, setImportName] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadRosters = useCallback(() => {
    fetchRosters()
      .then((data) => {
        setRosters(data)
        setRostersError('')
      })
      .catch((error: unknown) => setRostersError(error instanceof Error ? error.message : 'Unable to load rosters.'))
  }, [])

  useEffect(() => {
    loadRosters()
  }, [loadRosters])

  function selectRoster(id: string | null) {
    setSelectedId(id)
    setDetail(null)
    setDetailError('')
  }

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    fetchRosterDetail(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetailError(error instanceof Error ? error.message : 'Unable to load this roster.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const detailLoading = selectedId !== null && detail === null && detailError === ''

  async function handleImport(event: React.FormEvent) {
    event.preventDefault()
    if (!importFile || isImporting) return
    setIsImporting(true)
    setImportMessage('')
    try {
      const result = await importRoster(importFile, importName.trim() || undefined)
      setImportMessage(`Imported ${result.imported} students — ${result.matched} matched to accounts.`)
      setImportName('')
      setImportFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadRosters()
      selectRoster(result.roster.id)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Unable to import this roster.')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleDelete(id: string) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id)
      return
    }
    setConfirmingDeleteId(null)
    try {
      await deleteRoster(id)
      if (selectedId === id) selectRoster(null)
      loadRosters()
    } catch (error) {
      setRostersError(error instanceof Error ? error.message : 'Unable to delete this roster.')
    }
  }

  return (
    <div className="grid flex-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside aria-label="Rosters" className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <form className="border-b border-gray-100 pb-3" onSubmit={(event) => void handleImport(event)}>
          <h2 className="text-sm font-semibold">Import roster</h2>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">
            Upload a CSV with <code className="rounded bg-gray-100 px-1">name,email</code> columns. Matching
            accounts are linked automatically for participation tracking.
          </p>
          <input
            aria-label="Roster CSV file"
            accept=".csv,.txt,text/csv"
            className="mt-2 block w-full text-xs text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-[#A21942] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#801333]"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            ref={fileInputRef}
            type="file"
          />
          <input
            aria-label="Roster name"
            className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#A21942] focus:outline-none"
            placeholder="Roster name (optional)"
            value={importName}
            onChange={(event) => setImportName(event.target.value)}
          />
          <button
            className="mt-2 w-full rounded-md bg-[#A21942] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!importFile || isImporting}
            type="submit"
          >
            {isImporting ? 'Importing…' : 'Import roster'}
          </button>
          {importMessage && (
            <p className="mt-2 text-[11px] text-gray-600" role="status">{importMessage}</p>
          )}
        </form>

        <div className="min-h-0 flex-1">
          <h2 className="mb-2 text-sm font-semibold">Your rosters</h2>
          <div className="space-y-1 overflow-y-auto">
            {rosters === null && rostersError === '' && <p className="text-xs text-gray-500">Loading rosters…</p>}
            {rostersError !== '' && (
              <p className="text-xs text-red-700" role="alert">{rostersError}</p>
            )}
            {rosters !== null && rosters.length === 0 && (
              <p className="text-xs text-gray-500">No rosters yet. Import a CSV to start tracking participation.</p>
            )}
            {rosters?.map((roster) => (
              <div
                key={roster.id}
                className={`group flex items-center rounded-md transition-colors ${roster.id === selectedId ? 'bg-[#A21942]/10' : 'hover:bg-gray-100'}`}
              >
                <button
                  className="min-w-0 flex-1 px-2.5 py-2 text-left text-xs"
                  onClick={() => selectRoster(roster.id)}
                  type="button"
                >
                  <span className={`block truncate ${roster.id === selectedId ? 'font-semibold text-[#A21942]' : 'font-medium text-[#262626]'}`}>
                    {roster.name}
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    {roster.studentCount} students · {formatDate(roster.createdAt)}
                  </span>
                </button>
                <button
                  aria-label={confirmingDeleteId === roster.id ? `Confirm delete ${roster.name}` : `Delete ${roster.name}`}
                  className="mr-1 grid size-7 shrink-0 place-items-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700"
                  onClick={() => void handleDelete(roster.id)}
                  title={confirmingDeleteId === roster.id ? 'Click again to confirm' : 'Delete this roster'}
                  type="button"
                >
                  {confirmingDeleteId === roster.id ? (
                    <span className="text-[10px] font-bold">Sure?</span>
                  ) : (
                    <Trash2 aria-hidden="true" size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section aria-label="Roster analytics" className="min-w-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        {detailLoading && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
            <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={26} />
            <p className="text-sm">Loading participation data…</p>
          </div>
        )}
        {detailError !== '' && !detailLoading && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{detailError}</p>
        )}
        {!detailLoading && detailError === '' && !detail && (
          <div className="py-16 text-center text-sm text-gray-500">
            Select a roster to see participation rates, quiz performance, and per-student activity.
          </div>
        )}
        {detail && <RosterDetailPanel detail={detail} />}
      </section>
    </div>
  )
}

function RosterDetailPanel({ detail }: { detail: RosterDetail }) {
  const { analytics, students } = detail
  const stats = [
    { label: 'Enrolled', value: String(analytics.enrolled) },
    { label: 'Matched accounts', value: String(analytics.matched) },
    { label: 'Active · 30 days', value: String(analytics.active) },
    { label: 'Participation', value: formatPercent(analytics.participationRate * 100) },
    { label: 'Quiz average', value: formatPercent(analytics.quizAverage) },
  ]
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Student Roster &amp; Engagement</p>
        <h2 className="mt-1 text-xl font-bold text-[#262626]">{detail.roster.name}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((stat) => (
          <div className="rounded-lg border border-gray-200 bg-slate-50 p-3" key={stat.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-[#262626]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Students</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-semibold">Student</th>
                <th className="py-2 pr-4 font-semibold">Account</th>
                <th className="py-2 pr-4 font-semibold">Last active</th>
                <th className="py-2 pr-4 font-semibold">Courses done</th>
                <th className="py-2 font-semibold">Quiz average</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr className="border-b border-gray-100" key={student.id}>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-[#262626]">{student.name}</span>
                    <span className="block text-gray-500">{student.email}</span>
                  </td>
                  <td className="py-2 pr-4">
                    {student.matched ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Users aria-hidden="true" size={10} /> Linked
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                        No account
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{formatDate(student.lastActiveAt)}</td>
                  <td className="py-2 pr-4">{student.coursesCompleted || '—'}</td>
                  <td className="py-2">{formatPercent(student.quizAverage)}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">No students in this roster.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {analytics.courses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Courses</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-semibold">Course</th>
                  <th className="py-2 pr-4 font-semibold">Started</th>
                  <th className="py-2 pr-4 font-semibold">Completed</th>
                  <th className="py-2 font-semibold">Quiz average</th>
                </tr>
              </thead>
              <tbody>
                {analytics.courses.map((course) => (
                  <tr className="border-b border-gray-100" key={course.courseId}>
                    <td className="py-2 pr-4 font-medium text-[#262626]">{course.title}</td>
                    <td className="py-2 pr-4">{course.started}</td>
                    <td className="py-2 pr-4">{course.completed}</td>
                    <td className="py-2">{formatPercent(course.quizAverage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
