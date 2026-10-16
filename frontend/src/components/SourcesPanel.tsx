import { ArrowRight, Link2, Upload, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { SourceItem } from '../lib/api'

export function SourcesPanel({
  sources,
  disabled,
  canCreateMaterial,
  onAddUrl,
  onAddText,
  onAddFiles,
  onRemove,
  onCreateMaterial,
}: {
  sources: SourceItem[]
  disabled: boolean
  canCreateMaterial: boolean
  onAddUrl: (url: string) => Promise<void>
  onAddText: (text: string) => Promise<void>
  onAddFiles: (files: FileList | null) => Promise<void>
  onRemove: (source: SourceItem) => Promise<void>
  onCreateMaterial: (kind: 'slides' | 'quiz') => Promise<void>
}) {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [operationError, setOperationError] = useState('')

  async function addUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const url = websiteUrl.trim()
    if (!url) return
    setOperationError('')
    try {
      await onAddUrl(url)
      setWebsiteUrl('')
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Unable to add this URL.')
    }
  }

  async function addText() {
    const text = sourceText.trim()
    if (!text) return
    setOperationError('')
    try {
      await onAddText(text)
      setSourceText('')
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Unable to add this text.')
    }
  }

  async function addFiles(files: FileList | null) {
    setIsUploading(true)
    setOperationError('')
    try {
      await onAddFiles(files)
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Unable to upload source files.')
    } finally {
      setIsUploading(false)
    }
  }

  async function removeSource(source: SourceItem) {
    setOperationError('')
    try {
      await onRemove(source)
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Unable to remove this source.')
    }
  }

  return (
    <section aria-label="Material sources">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sources</h2>
        <label
          className={`grid size-8 place-items-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-[#A21942] ${disabled || isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          title="Upload source file"
        >
          <Upload aria-hidden="true" size={16} />
          <span className="sr-only">Upload TXT, PDF, or PPTX source</span>
          <input
            accept=".txt,.pdf,.pptx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="sr-only"
            disabled={disabled || isUploading}
            multiple
            onChange={(event) => {
              void addFiles(event.target.files).finally(() => {
                event.target.value = ''
              })
            }}
            type="file"
          />
        </label>
      </div>
      <form className="mb-2 flex gap-1" onSubmit={(event) => void addUrl(event)}>
        <input
          aria-label="Website URL"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#A21942] focus:outline-none"
          disabled={disabled}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          placeholder="Add website URL"
          type="url"
          value={websiteUrl}
        />
        <button
          aria-label="Add website source"
          className="grid size-8 place-items-center rounded-md bg-[#A21942] text-white hover:bg-[#801333] disabled:opacity-50"
          disabled={disabled || !websiteUrl.trim()}
          title="Add website source"
          type="submit"
        >
          <Link2 aria-hidden="true" size={15} />
        </button>
      </form>
      <div className="flex gap-1">
        <textarea
          aria-label="Paste source text"
          className="min-h-9 min-w-0 flex-1 resize-y rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#A21942] focus:outline-none"
          disabled={disabled}
          onChange={(event) => setSourceText(event.target.value)}
          placeholder="Paste notes or source text"
          value={sourceText}
        />
        <button
          aria-label="Add text source"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-[#A21942] text-white hover:bg-[#801333] disabled:opacity-50"
          disabled={disabled || !sourceText.trim()}
          title="Add text source"
          onClick={() => void addText()}
          type="button"
        >
          <ArrowRight aria-hidden="true" size={15} />
        </button>
      </div>
      {!disabled && sources.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">No sources are attached to this material yet.</p>
      ) : null}
      <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
        {sources.map((source) => (
          <li className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1.5 text-xs" key={source.id}>
            <span className="min-w-0 flex-1 truncate" title={source.name}>{source.name}</span>
            <button
              aria-label={`Remove ${source.name}`}
              className="text-gray-400 hover:text-red-700"
              onClick={() => void removeSource(source)}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </li>
        ))}
      </ul>
      {operationError && <p className="mt-2 text-xs text-red-700" role="alert">{operationError}</p>}
      {disabled && canCreateMaterial && (
        <div className="mt-3 rounded-md bg-slate-50 p-2.5">
          <p className="text-xs text-gray-600">Create a resource first to attach sources to it.</p>
          <div className="mt-2 flex gap-2">
            <button
              className="rounded-md bg-[#A21942] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#801333]"
              onClick={() => void onCreateMaterial('slides')}
              type="button"
            >
              New slide deck
            </button>
            <button
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-[#A21942]"
              onClick={() => void onCreateMaterial('quiz')}
              type="button"
            >
              New quiz
            </button>
          </div>
        </div>
      )}
      {disabled && !canCreateMaterial && (
        <p className="mt-2 text-xs text-gray-500">Create or select a material to manage its sources.</p>
      )}
    </section>
  )
}
