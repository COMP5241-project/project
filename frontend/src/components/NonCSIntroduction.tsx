import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type DragEvent } from 'react'
import { completeNonCsIntroduction } from '../lib/api'

const phases = ['Planning', 'Architecture & Design', 'Implementation', 'Testing & Review', 'Deployment & Maintenance']
const parts = [
  { id: 'title', label: 'Text: "HK Weather"', className: 'font-bold' },
  { id: 'icon', label: '☀️', className: 'text-3xl' },
  { id: 'temp', label: '-- °C', className: 'font-mono text-xl' },
] as const
type PartId = (typeof parts)[number]['id']
type DeploymentState = 'ready' | 'maintenance' | 'complete'

export function NonCSIntroduction() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [uiParts, setUiParts] = useState<PartId[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [apiConnecting, setApiConnecting] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  const [backendAdded, setBackendAdded] = useState(false)
  const [bugFixed, setBugFixed] = useState(false)
  const [deployment, setDeployment] = useState<DeploymentState>('ready')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiConnecting) return
    const timer = window.setTimeout(() => {
      setApiConnected(true)
      setApiConnecting(false)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [apiConnecting])

  function addPart(id: PartId) {
    setUiParts((previous) => previous.includes(id) ? previous : [...previous, id])
  }

  function dropUI(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const id = event.dataTransfer.getData('text/plain')
    const part = parts.find((item) => item.id === id)
    if (part) addPart(part.id)
  }

  async function finishGame() {
    if (isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await completeNonCsIntroduction()
      await navigate({ to: '/student' })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your introduction progress.')
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#262626] flex flex-col items-center py-10 px-4 selection:bg-[#A21942] selection:text-white">
      <header className="w-full max-w-5xl bg-white rounded-t-xl border-b-4 border-[#A21942] p-6 shadow-sm flex flex-wrap gap-3 justify-between items-center z-10 relative">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Non-CS Track // Interactive SDLC</span>
          <h1 className="text-2xl font-bold text-[#262626] mt-1">The App Factory 📱</h1>
        </div>
        <div className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors duration-300 ${deployment === 'complete' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : step === 5 ? 'bg-[#262626] text-white border-[#262626]' : 'text-[#A21942] bg-red-50 border-red-100'}`} aria-live="polite">
          {deployment === 'complete' ? 'SDLC Complete!' : `Phase ${step}: ${phases[step - 1]}`}
        </div>
      </header>

      <main className="w-full max-w-5xl bg-white rounded-b-xl shadow-lg border border-t-0 border-gray-200 p-6 sm:p-8 min-h-[550px] flex flex-col relative overflow-hidden">
        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-2">1. Planning &amp; Analysis</h2>
            <p className="text-gray-600 mb-8 max-w-lg text-center">Every software project starts with a business need. Review the client's request before writing any code.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md w-full relative">
              <div className="absolute -top-4 -left-4 w-10 h-8 bg-[#A21942] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">Client</div>
              <p className="text-gray-700 italic">"We need a mobile weather app for Hong Kong. It just needs to show the current temperature and a weather icon."</p>
            </div>
            <button type="button" onClick={() => setStep(2)} className="mt-8 px-8 py-3 bg-[#A21942] text-white font-bold rounded-md hover:bg-[#801333] transition-colors shadow-md">
              Approve Scope &amp; Start Building →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">2. Architecture &amp; Design (Frontend)</h2>
              <p className="text-gray-600">Drag the UI components onto the blank smartphone screen to design the Frontend architecture, or select each component to add it.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 w-full items-center justify-center">
              <div onDrop={dropUI} onDragOver={(event) => event.preventDefault()} onDragEnter={() => setDragOver(true)} onDragLeave={() => setDragOver(false)} className={`w-64 h-[400px] border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-start p-6 gap-4 transition-colors relative shadow-inner ${dragOver ? 'bg-red-50 border-[#A21942]' : 'border-gray-300 bg-gray-50'}`}>
                <div className="absolute top-2 w-16 h-1 bg-gray-300 rounded-full" />
                {uiParts.length === 0 && <span className="text-gray-500 font-medium mt-10 text-center pointer-events-none">Drop UI Elements Here</span>}
                {uiParts.map((id) => {
                  const part = parts.find((item) => item.id === id)
                  return part && <div key={id} className={`text-center mb-2 w-full ${part.className}`}>{part.label}</div>
                })}
              </div>
              <div className="flex flex-col gap-4 justify-center">
                {parts.filter((part) => !uiParts.includes(part.id)).map((part) => (
                  <button key={part.id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', part.id)} onClick={() => addPart(part.id)} className={`bg-white border-2 border-[#262626] p-3 rounded shadow cursor-grab text-center ${part.className}`}>
                    {part.label}
                  </button>
                ))}
              </div>
            </div>
            {uiParts.length === parts.length && (
              <button type="button" onClick={() => setStep(3)} className="mt-8 px-8 py-3 bg-[#A21942] text-white font-bold rounded-md hover:bg-[#801333] transition-colors">Proceed to Implementation →</button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">3. Implementation (API &amp; Backend)</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">The Frontend is built, but it's empty. We need an API to fetch data, and a Backend to process it.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-4 w-full mt-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center shadow-sm z-10 w-48">
                <div className="text-3xl mb-2">☁️</div>
                <div className="font-bold text-[#A21942] text-sm">HK Observatory DB</div>
              </div>
              <div className="w-48 h-12 relative flex items-center">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden absolute">
                  <div className={`h-full bg-[#A21942] transition-[width] duration-1000 motion-reduce:transition-none ${apiConnecting || apiConnected ? 'w-full' : 'w-0'}`} />
                </div>
                {!apiConnected && (
                  <button type="button" disabled={apiConnecting} onClick={() => setApiConnecting(true)} className="absolute left-1/2 -translate-x-1/2 bg-red-50 text-[#A21942] text-xs font-bold px-3 py-2 rounded border border-red-200 disabled:opacity-70">
                    {apiConnecting ? 'Connecting API…' : 'Connect API'}
                  </button>
                )}
                {apiConnected && (
                  <button type="button" disabled={backendAdded} onClick={() => setBackendAdded(true)} className={`absolute left-1/2 -translate-x-1/2 w-12 h-12 text-white rounded-lg flex items-center justify-center border-2 border-white shadow-lg z-20 ${backendAdded ? 'bg-emerald-500' : 'bg-[#262626] hover:bg-black'}`} aria-label={backendAdded ? 'Backend added' : 'Add backend server'}>
                    {backendAdded ? '✓' : '⚙️'}
                    {!backendAdded && <span className="absolute -top-8 w-32 bg-gray-100 text-[#262626] text-[10px] font-bold px-2 py-1 rounded border border-gray-300 text-center">Add Backend Server</span>}
                  </button>
                )}
              </div>
              <div className="w-56 h-[350px] border-[6px] border-[#262626] rounded-[2rem] bg-white flex flex-col items-center p-4 shadow-lg z-10">
                <div className="font-bold text-lg mb-4">HK Weather</div>
                <div className="text-5xl mb-4">☀️</div>
                <div className={`bg-gray-100 p-2 rounded w-full break-words ${backendAdded ? 'text-center text-3xl font-bold text-[#262626]' : apiConnected ? 'font-mono text-[10px] text-left text-[#A21942] whitespace-pre-wrap' : 'font-mono text-sm text-center text-gray-500'}`}>
                  {backendAdded ? '32°C' : apiConnected ? '{\n  "temp": 32,\n  "unit": "C",\n  "icon": "sun"\n}' : 'No Data Connected'}
                </div>
              </div>
            </div>
            {backendAdded && <button type="button" onClick={() => setStep(4)} className="mt-8 px-8 py-3 bg-[#A21942] text-white font-bold rounded-md hover:bg-[#801333] transition-colors">Proceed to Testing →</button>}
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2 text-[#A21942]">4. Testing &amp; Review (QA)</h2>
              <p className="text-gray-600 max-w-xl mx-auto">The app works, but QA found a logic bug! The temperature is 32°C, but the icon shows snow. Select the bug to patch the code.</p>
            </div>
            <div className="w-64 h-[400px] border-[6px] border-[#262626] rounded-[2rem] bg-white flex flex-col items-center p-6 shadow-lg relative mx-auto mt-4">
              <div className="font-bold text-xl mb-6">HK Weather</div>
              <button type="button" onClick={() => setBugFixed(true)} disabled={bugFixed} aria-label={bugFixed ? 'Weather icon fixed' : 'Fix weather icon bug'} className="text-6xl mb-6 transform hover:scale-110 transition-transform relative group">
                {bugFixed ? '☀️' : '☃️'}
                {!bugFixed && <span className="absolute -right-4 -top-4 bg-[#A21942] text-white text-[10px] font-bold px-2 py-1 rounded-full">Bug!</span>}
              </button>
              <div className="font-mono text-3xl font-bold text-[#262626]">32°C</div>
            </div>
            {bugFixed && <button type="button" onClick={() => setStep(5)} className="mt-8 px-8 py-3 bg-[#A21942] text-white font-bold rounded-md hover:bg-[#801333] transition-colors">Code Approved. Proceed to Deployment →</button>}
          </div>
        )}

        {step === 5 && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">5. Deployment &amp; Maintenance</h2>
              <p className="text-gray-600 max-w-lg mx-auto">It is time to go live! Push the app to the cloud server.</p>
            </div>
            <div className="w-full max-w-md flex flex-col items-center bg-gray-50 border border-gray-200 rounded-xl p-8 shadow-sm min-h-64 justify-center">
              {deployment === 'ready' && <button type="button" onClick={() => setDeployment('maintenance')} className="px-10 py-4 bg-[#A21942] text-white text-xl font-bold rounded-lg shadow-lg hover:bg-[#801333] transition-colors flex items-center gap-2">🚀 Deploy to Cloud</button>}
              {deployment === 'maintenance' && (
                <div className="flex flex-col items-center text-center w-full">
                  <div className="text-[#A21942] font-bold mb-2 text-lg">⚠️ High Traffic Alert! Servers Overloaded!</div>
                  <div className="w-full bg-red-200 h-4 rounded-full mb-4 overflow-hidden border border-red-300"><div className="bg-[#A21942] h-full w-[95%]" /></div>
                  <button type="button" onClick={() => setDeployment('complete')} className="px-6 py-2 bg-[#262626] text-white font-bold rounded hover:bg-black transition-colors">Scale Up Servers</button>
                </div>
              )}
              {deployment === 'complete' && <div className="flex flex-col items-center text-center w-full"><div className="text-emerald-500 text-5xl mb-2">✅</div><div className="font-bold text-emerald-700 text-lg">App is Live and Stable!</div></div>}
            </div>
            {deployment === 'complete' && <button type="button" disabled={isSaving} onClick={finishGame} className="mt-8 px-8 py-3 bg-[#A21942] text-white font-bold rounded-md hover:bg-[#801333] transition-colors shadow-md disabled:opacity-70">{isSaving ? 'Saving progress…' : 'Enter Student Learning Hub →'}</button>}
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
