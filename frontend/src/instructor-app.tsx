import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bold,
  Bookmark,
  Copy,
  FilePlus2,
  Image,
  Italic,
  List,
  Maximize2,
  MessageSquare,
  Plus,
  PlusSquare,
  Send,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createMaterial,
  createMaterialSource,
  deleteMaterial,
  deleteMaterialSource,
  fetchUserMaterials,
  generateCourseContent,
  getCurrentProfile,
  updateMaterial,
  type ChatMessage,
  type GeneratedArtifactContent,
  type GeneratedCourseContent,
  type GeneratedQuizContent,
  type GeneratedQuizQuestion,
  type GeneratedSlide,
  type Material,
  type SourceItem,
  type SlideTheme,
} from './lib/api'
import { SourcesPanel } from './components/SourcesPanel'

type ArtifactKind = 'slides' | 'quiz'
interface EditableSlide extends GeneratedSlide {
  titleMarkup?: string
  bodyMarkup?: string
  imageData?: string
}

interface SlideArtifactContent extends Omit<GeneratedCourseContent, 'content'> {
  content: EditableSlide[]
}

interface Artifact {
  id: string
  userId: string
  title: string
  kind: ArtifactKind
  content: SlideArtifactContent | GeneratedQuizContent | null
  messages: ChatMessage[]
  sources: SourceItem[]
  updatedAt: string
  createdAt: string
}
const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720
const DEFAULT_SLIDE_THEME: SlideTheme = {
  background: '#ffffff',
  textColor: '#0f172a',
  accentColor: '#A21942',
  cardBackground: '#F8FAFC',
}

function resolveSlideTheme(theme?: SlideTheme): SlideTheme {
  const validColor = (value: string | undefined, fallback: string) =>
    value && CSS.supports('color', value) ? value : fallback
  return {
    background: validColor(theme?.background, DEFAULT_SLIDE_THEME.background),
    textColor: validColor(theme?.textColor, DEFAULT_SLIDE_THEME.textColor),
    accentColor: validColor(theme?.accentColor, DEFAULT_SLIDE_THEME.accentColor),
    cardBackground: validColor(theme?.cardBackground, DEFAULT_SLIDE_THEME.cardBackground ?? '#F8FAFC'),
  }
}

function isQuizPrompt(prompt: string): boolean {
  return /\b(?:quiz|mc)\b|multiple[\s-]+choice/i.test(prompt)
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  className = '',
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      aria-label={label}
      className={`inline-grid size-9 shrink-0 place-items-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[#A21942] hover:text-[#A21942] focus:outline-none focus:ring-2 focus:ring-[#A21942]/30 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" size={17} />
    </button>
  )
}

function safeMarkup(markup: string): string {
  const parsed = new DOMParser().parseFromString(markup, 'text/html')
  const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'FONT'])
  const allowedStyles = new Set(['color', 'font-size', 'text-align'])
  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '')
    if (!(node instanceof HTMLElement)) return null
    if (!allowedTags.has(node.tagName)) {
      const fragment = document.createDocumentFragment()
      for (const child of [...node.childNodes]) {
        const clean = cleanNode(child)
        if (clean) fragment.append(clean)
      }
      return fragment
    }
    const clean = document.createElement(node.tagName === 'FONT' ? 'span' : node.tagName.toLowerCase())
    for (const property of allowedStyles) {
      const value = node.style.getPropertyValue(property) ||
        (property === 'color' && node.hasAttribute('color') ? node.getAttribute('color') ?? '' : '') ||
        (property === 'font-size' && node.tagName === 'FONT' && node.hasAttribute('size')
          ? ['0.625rem', '0.75rem', '1rem', '1.25rem', '1.5rem', '1.875rem', '2.25rem'][Number(node.getAttribute('size')) - 1] ?? ''
          : '') ||
        (property === 'text-align' && node.hasAttribute('align') ? node.getAttribute('align') ?? '' : '')
      const isSafeValue = property === 'color'
        ? CSS.supports('color', value)
        : property === 'font-size'
          ? /^\d+(\.\d+)?(px|rem|em|%)$/.test(value)
          : ['left', 'center', 'right', 'justify'].includes(value)
      if (value && isSafeValue) {
        clean.style.setProperty(property, value)
      }
    }
    for (const child of [...node.childNodes]) {
      const safeChild = cleanNode(child)
      if (safeChild) clean.append(safeChild)
    }
    return clean
  }
  const container = document.createElement('div')
  for (const child of [...parsed.body.childNodes]) {
    const safeChild = cleanNode(child)
    if (safeChild) container.append(safeChild)
  }
  return container.innerHTML
}

function initialMarkup(value: string): string {
  const escaped = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return `<p>${escaped}</p>`
}

function slideBulletsFromMarkup(markup: string): string[] {
  const parsed = new DOMParser().parseFromString(safeMarkup(markup), 'text/html')
  const items = [...parsed.body.querySelectorAll('li')].map((item) => item.textContent?.trim() ?? '')
  if (items.length) return items
  return (parsed.body.textContent ?? '').split('\n').map((item) => item.trim()).filter(Boolean)
}

function emptyContent(kind: ArtifactKind): GeneratedArtifactContent {
  return kind === 'quiz' ? { type: 'quiz', questions: [] } : { type: 'slides', content: [] }
}

function artifactFromMaterial(material: Material): Artifact {
  if (material.type !== 'slides' && material.type !== 'quiz') {
    throw new Error(`Unsupported material type: ${material.type}`)
  }
  return {
    id: material.id,
    userId: material.userId,
    title: material.title,
    kind: material.type,
    content: material.data,
    messages: material.chatHistory,
    sources: material.sources,
    updatedAt: material.updatedAt,
    createdAt: material.createdAt,
  }
}

function createArtifact(kind: ArtifactKind, userId: string): Artifact {
  const timestamp = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    userId,
    title: kind === 'quiz' ? 'Untitled Quiz' : 'Untitled Slide Deck',
    kind,
    content: emptyContent(kind),
    messages: [],
    sources: [],
    updatedAt: timestamp,
    createdAt: timestamp,
  }
}

function updateQuizQuestion(
  content: GeneratedQuizContent,
  questionId: string,
  update: (question: GeneratedQuizQuestion) => GeneratedQuizQuestion,
): GeneratedQuizContent {
  return {
    ...content,
    questions: content.questions.map((question) => question.id === questionId ? update(question) : question),
  }
}

function useWorkspace() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const saveTimers = useRef(new Map<string, number>())
  const saveQueues = useRef(new Map<string, Promise<void>>())

  useEffect(() => {
    const pendingTimers = saveTimers.current
    let cancelled = false
    async function load() {
      try {
        const profile = await getCurrentProfile()
        if (profile.profile.role !== 'instructor') {
          throw new Error('Only instructor accounts can load instructor materials.')
        }
        const materials = await fetchUserMaterials()
        if (cancelled) return
        setUserId(profile.profile.id)
        setArtifacts(materials
          .filter((material) => material.type === 'slides' || material.type === 'quiz')
          .map(artifactFromMaterial))
        setActiveMaterialId(materials.find((material) =>
          material.type === 'slides' || material.type === 'quiz',
        )?.id ?? null)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load saved materials.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
      for (const timer of pendingTimers.values()) window.clearTimeout(timer)
    }
  }, [])

  const persist = useCallback((artifact: Artifact) => {
    const previous = saveQueues.current.get(artifact.id) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(async () => {
      await updateMaterial(artifact.id, {
        title: artifact.title,
        data: artifact.content ?? emptyContent(artifact.kind),
        chatHistory: artifact.messages,
      })
    })
    saveQueues.current.set(artifact.id, next)
    return next
  }, [])

  const scheduleSave = useCallback((artifact: Artifact) => {
    const oldTimer = saveTimers.current.get(artifact.id)
    if (oldTimer !== undefined) window.clearTimeout(oldTimer)
    const timer = window.setTimeout(() => {
      saveTimers.current.delete(artifact.id)
      void persist(artifact).catch((saveError: unknown) => {
        setError(saveError instanceof Error ? saveError.message : 'Unable to save this material.')
      })
    }, 700)
    saveTimers.current.set(artifact.id, timer)
  }, [persist])

  const saveNow = useCallback(async (artifact: Artifact) => {
    const timer = saveTimers.current.get(artifact.id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      saveTimers.current.delete(artifact.id)
    }
    try {
      await persist(artifact)
      setError('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this material.')
      throw saveError
    }
  }, [persist])

  useEffect(() => {
    const handleSaveBeforeSignOut = (event: Event) => {
      const request = event as CustomEvent<{
        resolve: () => void
        reject: (error: unknown) => void
      }>
      void Promise.all(artifacts.map(saveNow))
        .then(() => request.detail.resolve())
        .catch((saveError: unknown) => request.detail.reject(saveError))
    }
    window.addEventListener('instructor-workspace-save', handleSaveBeforeSignOut)
    return () => window.removeEventListener('instructor-workspace-save', handleSaveBeforeSignOut)
  }, [artifacts, saveNow])

  const create = useCallback(async (kind: ArtifactKind) => {
    if (!userId) throw new Error('Your account is still loading. Please try again.')
    const draft = createArtifact(kind, userId)
    const saved = await createMaterial({
      id: draft.id,
      title: draft.title,
      type: draft.kind,
      data: draft.content ?? emptyContent(kind),
      chatHistory: draft.messages,
    })
    const artifact = artifactFromMaterial(saved)
    setArtifacts((previous) => [artifact, ...previous])
    setActiveMaterialId(artifact.id)
    return artifact
  }, [userId])

  const removeMaterial = useCallback(async (materialId: string) => {
    // Cancel any pending autosave so it cannot PATCH a deleted material.
    const timer = saveTimers.current.get(materialId)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      saveTimers.current.delete(materialId)
    }
    saveQueues.current.delete(materialId)
    try {
      await deleteMaterial(materialId)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this material.')
      throw deleteError
    }
    const remaining = artifacts.filter((artifact) => artifact.id !== materialId)
    setArtifacts(remaining)
    if (activeMaterialId === materialId) {
      setActiveMaterialId(remaining[0]?.id ?? null)
    }
  }, [artifacts, activeMaterialId, setError])

  return {
    artifacts,
    setArtifacts,
    userId,
    isLoading,
    error,
    setError,
    scheduleSave,
    saveNow,
    create,
    removeMaterial,
    activeMaterialId,
    setActiveMaterialId,
  }
}

export function InstructorApp() {
  const workspace = useWorkspace()
  const { artifacts, setArtifacts, isLoading, error: workspaceError, removeMaterial } = workspace
  const { activeMaterialId: activeArtifactId, setActiveMaterialId: setActiveArtifactId } = workspace
  const [slideSelection, setSlideSelection] = useState({ artifactId: null as string | null, index: 0 })
  const [prompt, setPrompt] = useState('')
  // Explicit chip choice; null means "follow the active resource's kind".
  const [chipChoice, setChipChoice] = useState<ArtifactKind | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [quizMode, setQuizMode] = useState<'edit' | 'preview'>('edit')
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, number>>>({})
  const stageRef = useRef<HTMLDivElement>(null)
  const slideViewportRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const [slideScale, setSlideScale] = useState(1)

  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) ?? null
  // The chips control the kind the next prompt targets. Choosing the other
  // kind while a resource is open genuinely retargets the next prompt at a
  // new resource of that kind (see submitPrompt); selecting or creating a
  // resource clears the explicit choice so the chips follow its kind again.
  const selectedKind = chipChoice ?? activeArtifact?.kind ?? 'slides'
  const activeSlides = activeArtifact?.content?.type === 'slides' ? activeArtifact.content.content : []
  const activeSlideIndex = slideSelection.artifactId === activeArtifactId ? slideSelection.index : 0
  const activeSlide = activeSlides[activeSlideIndex]
  const activeQuiz = activeArtifact?.content?.type === 'quiz' ? activeArtifact.content : null
  const activeQuizAnswers = activeArtifactId ? quizAnswers[activeArtifactId] ?? {} : {}
  const activeSlideTheme = resolveSlideTheme(activeSlide?.theme)
  const activeContentCount = activeArtifact?.content?.type === 'slides'
    ? activeArtifact.content.content.length
    : activeArtifact?.content?.type === 'quiz'
      ? activeArtifact.content.questions.length
      : 0
  const sourceContext = (activeArtifact?.sources ?? [])
    .map((source) => `Source: ${source.name}\n${source.rawContent || source.sourceUrl || ''}`)
    .join('\n\n')
    .slice(0, 20000)

  useEffect(() => {
    const viewport = slideViewportRef.current
    if (!viewport || activeArtifact?.kind !== 'slides') return
    const measure = () => setSlideScale(viewport.clientWidth / SLIDE_WIDTH)
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    measure()
    return () => observer.disconnect()
  }, [activeArtifactId, activeArtifact?.kind, activeSlides.length])

  useEffect(() => {
    if (activeArtifact?.kind !== 'slides' || activeSlides.length === 0) return
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) return
      if (
        target instanceof HTMLElement &&
        document.fullscreenElement !== stageRef.current &&
        target.closest('button, a, [role="button"]')
      ) return

      const forward = ['ArrowRight', 'ArrowDown', 'Enter', ' ', 'Spacebar'].includes(event.key)
      const backward = ['ArrowLeft', 'ArrowUp', 'Backspace'].includes(event.key)
      if (!forward && !backward) return
      event.preventDefault()
      setSlideSelection((selection) => {
        const currentIndex = selection.artifactId === activeArtifactId ? selection.index : 0
        return {
          artifactId: activeArtifactId,
          index: Math.max(0, Math.min(activeSlides.length - 1, currentIndex + (forward ? 1 : -1))),
        }
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeArtifactId, activeArtifact?.kind, activeSlides.length])

  function selectSlide(index: number) {
    setSlideSelection({ artifactId: activeArtifactId, index })
  }

  function updateArtifact(artifactId: string, update: (artifact: Artifact) => Artifact) {
    const current = artifacts.find((artifact) => artifact.id === artifactId)
    if (!current) return
    const updated = update({ ...current, updatedAt: new Date().toISOString() })
    setArtifacts((previous) => previous.map((artifact) => artifact.id === artifactId ? updated : artifact))
    workspace.scheduleSave(updated)
  }

  async function createAndSelectArtifact(kind: ArtifactKind): Promise<Artifact | null> {
    try {
      const artifact = await workspace.create(kind)
      setActiveArtifactId(artifact.id)
      setChipChoice(null)
      setFeedback('')
      return artifact
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to create this material.')
      return null
    }
  }

  async function deleteArtifact(artifact: Artifact) {
    if (deletingId) return
    const confirmed = window.confirm(
      `Delete "${artifact.title}"? This permanently removes the resource and its sources.`,
    )
    if (!confirmed) return
    setDeletingId(artifact.id)
    setFeedback('')
    try {
      await removeMaterial(artifact.id)
    } catch {
      // removeMaterial already surfaces the failure through the workspace alert.
    } finally {
      setDeletingId(null)
    }
  }

  async function submitPrompt(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const text = prompt.trim()
    if (!text || isSending) return
    if (isLoading) {
      setFeedback('Your saved materials are still loading. Please try again.')
      return
    }

    const requestedKind = isQuizPrompt(text) ? 'quiz' : selectedKind
    if (requestedKind !== selectedKind) setChipChoice(requestedKind)
    setPrompt('')
    setFeedback('')
    setIsSending(true)
    let artifactId: string | null = null

    try {
      let target = activeArtifact
      if (!target || target.kind !== requestedKind) {
        target = await createAndSelectArtifact(requestedKind)
      }
      if (!target) throw new Error('Unable to create this material.')
      artifactId = target.id
      const targetSourceContext = target.id === activeArtifact?.id ? sourceContext : ''
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      const existingContent: GeneratedArtifactContent | undefined =
        target.content?.type === 'slides' && target.content.content.length
          ? {
              type: 'slides',
              content: target.content.content.map(({ title, bullets, visual, theme }) => ({
                title,
                bullets,
                visual,
                theme,
              })),
            }
          : target.content?.type === 'quiz' && target.content.questions.length
            ? {
                type: 'quiz',
                questions: target.content.questions,
              }
            : undefined
      const isRevision = Boolean(existingContent)
      updateArtifact(artifactId, (artifact) => ({
        ...artifact,
        messages: [...artifact.messages, userMessage],
      }))
      const response = await generateCourseContent(
        target.kind,
        isRevision ? '' : text,
        targetSourceContext,
        isRevision ? text : '',
        existingContent ?? undefined,
      )
      if (response.type !== target.kind) {
        throw new Error('The AI returned a different resource type than requested.')
      }
      updateArtifact(artifactId, (artifact) => {
        let content: Artifact['content'] = response
        if (response.type === 'slides') {
          const previousSlides = artifact.content?.type === 'slides' ? artifact.content.content : []
          content = {
            ...response,
            content: response.content.map((slide, index) => {
              const previous = previousSlides[index]
              const preserveMarkup = previous?.title === slide.title &&
                JSON.stringify(previous.bullets) === JSON.stringify(slide.bullets)
              return {
                ...slide,
                theme: slide.theme ?? previous?.theme,
                imageData: slide.visual.kind === 'photo' && previous?.visual.kind === 'photo'
                  ? previous.imageData
                  : undefined,
                titleMarkup: previous?.title === slide.title ? previous.titleMarkup : undefined,
                bodyMarkup: preserveMarkup ? previous.bodyMarkup : undefined,
              }
            }),
          }
        }
        return {
          ...artifact,
          title: artifact.title.startsWith('Untitled') ? text.slice(0, 70) : artifact.title,
          content,
          messages: [...artifact.messages, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: response.type === 'quiz'
              ? `Quiz updated with ${response.questions.length} question${response.questions.length === 1 ? '' : 's'}.`
              : `Slide deck updated with ${response.content.length} slide${response.content.length === 1 ? '' : 's'}.`,
            timestamp: new Date().toISOString(),
          }],
        }
      })
      setSlideSelection({ artifactId, index: 0 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate this resource.'
      setFeedback(message)
      if (artifactId) updateArtifact(artifactId, (artifact) => ({
        ...artifact,
        messages: [...artifact.messages, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Generation failed: ${message}`,
          timestamp: new Date().toISOString(),
        }],
      }))
    } finally {
      setIsSending(false)
    }
  }

  function updateSlide(index: number, changes: Partial<EditableSlide>) {
    if (!activeArtifact || activeArtifact.content?.type !== 'slides') return
    updateArtifact(activeArtifact.id, (artifact) => {
      if (artifact.content?.type !== 'slides') return artifact
      const content: SlideArtifactContent = {
        ...artifact.content,
        content: artifact.content.content.map((slide, slideIndex) =>
          slideIndex === index ? { ...slide, ...changes } : slide,
        ),
      }
      return { ...artifact, content }
    })
  }

  function addSlide() {
    if (!activeArtifact || activeArtifact.content?.type !== 'slides') return
    const slide: EditableSlide = {
      title: 'New slide',
      bullets: ['Add slide content'],
      visual: { kind: 'diagram', description: 'Add a visual explanation', steps: ['Concept', 'Outcome'] },
    }
    updateArtifact(activeArtifact.id, (artifact) => {
      if (artifact.content?.type !== 'slides') return artifact
      return { ...artifact, content: { ...artifact.content, content: [...artifact.content.content, slide] } }
    })
    selectSlide(activeSlides.length)
  }

  function duplicateSlide(index: number) {
    if (!activeArtifact || activeArtifact.content?.type !== 'slides') return
    const slides = activeArtifact.content.content
    const copy = structuredClone(slides[index])
    copy.title = `${copy.title} (copy)`
    updateArtifact(activeArtifact.id, (artifact) => {
      if (artifact.content?.type !== 'slides') return artifact
      const content = [...artifact.content.content]
      content.splice(index + 1, 0, copy)
      return { ...artifact, content: { ...artifact.content, content } }
    })
    selectSlide(index + 1)
  }

  function removeSlide(index: number) {
    if (!activeArtifact || activeArtifact.content?.type !== 'slides') return
    updateArtifact(activeArtifact.id, (artifact) => {
      if (artifact.content?.type !== 'slides') return artifact
      return {
        ...artifact,
        content: { ...artifact.content, content: artifact.content.content.filter((_, i) => i !== index) },
      }
    })
    selectSlide(Math.max(0, Math.min(index, activeSlides.length - 2)))
  }

  function reorderSlide(from: number, to: number) {
    if (!activeArtifact || activeArtifact.content?.type !== 'slides' || from === to) return
    updateArtifact(activeArtifact.id, (artifact) => {
      if (artifact.content?.type !== 'slides') return artifact
      const content = [...artifact.content.content]
      const [moved] = content.splice(from, 1)
      content.splice(to, 0, moved)
      return { ...artifact, content: { ...artifact.content, content } }
    })
    selectSlide(to)
  }

  function updateQuiz(update: (content: GeneratedQuizContent) => GeneratedQuizContent) {
    if (!activeArtifact || activeArtifact.content?.type !== 'quiz') return
    updateArtifact(activeArtifact.id, (artifact) => ({
      ...artifact,
      content: artifact.content?.type === 'quiz' ? update(artifact.content) : artifact.content,
    }))
  }

  function addQuestion() {
    updateQuiz((content) => ({
      ...content,
      questions: [...content.questions, {
        id: crypto.randomUUID(),
        question: 'Enter a question',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswerIndex: 0,
        explanation: 'Explain why the correct answer is right.',
      }],
    }))
  }

  async function addFiles(materialId: string, files: FileList | null) {
    if (!files?.length) return
    for (const file of [...files]) {
      if (file.size > 5 * 1024 * 1024) {
        setFeedback(`${file.name} is larger than the 5 MB source limit.`)
        continue
      }
      try {
        const source = await createMaterialSource(materialId, { type: 'file', file })
        setArtifacts((previous) => previous.map((artifact) =>
          artifact.id === materialId ? { ...artifact, sources: [...artifact.sources, source] } : artifact,
        ))
      } catch (error) {
        setFeedback(error instanceof Error ? `${file.name}: ${error.message}` : `Unable to upload ${file.name}.`)
      }
    }
  }

  async function addTextSource(materialId: string, value: string) {
    const source = await createMaterialSource(materialId, {
      type: 'text',
      name: value.split('\n')[0].slice(0, 80) || 'Text source',
      rawContent: value,
    })
    setArtifacts((previous) => previous.map((artifact) =>
      artifact.id === materialId ? { ...artifact, sources: [...artifact.sources, source] } : artifact,
    ))
  }

  async function addWebsiteSource(materialId: string, value: string) {
    const source = await createMaterialSource(materialId, {
      type: 'url',
      name: value.replace(/^https?:\/\//i, '').slice(0, 255),
      sourceUrl: value,
    })
    setArtifacts((previous) => previous.map((artifact) =>
      artifact.id === materialId ? { ...artifact, sources: [...artifact.sources, source] } : artifact,
    ))
  }

  async function removeSource(materialId: string, source: SourceItem) {
    try {
      await deleteMaterialSource(materialId, source.id)
      setArtifacts((previous) => previous.map((artifact) =>
        artifact.id === materialId
          ? { ...artifact, sources: artifact.sources.filter((item) => item.id !== source.id) }
          : artifact,
      ))
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to remove this source.')
    }
  }

  async function uploadSlideImage(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Photos must be 2 MB or smaller.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback('Choose a JPG, PNG, or WebP photo.')
      return
    }
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1280 / bitmap.width, 720 / bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      throw new Error('Unable to process this photo.')
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const imageData = canvas.toDataURL('image/jpeg', 0.78)
    if (activeSlide) {
      updateSlide(activeSlideIndex, { imageData, visual: { ...activeSlide.visual, kind: 'photo' } })
    }
  }

  function executeStyle(command: string, value?: string) {
    document.execCommand(command, false, value)
    stageRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus()
  }

  function saveArtifact() {
    if (!activeArtifact) {
      setFeedback('Create or select a resource before saving.')
      return
    }
    void workspace.saveNow(activeArtifact)
      .then(() => setFeedback('Saved to your instructor account.'))
      .catch((error: unknown) => setFeedback(
        error instanceof Error ? error.message : 'Unable to save this material.',
      ))
  }

  function renameArtifact(title: string) {
    if (!activeArtifact) return
    updateArtifact(activeArtifact.id, (artifact) => ({ ...artifact, title }))
  }

  function editMarkup(target: 'titleMarkup' | 'bodyMarkup', index: number, element: HTMLElement) {
    const markup = safeMarkup(element.innerHTML)
    if (target === 'titleMarkup') {
      updateSlide(index, { titleMarkup: markup, title: element.textContent?.trim() || 'Untitled slide' })
      return
    }
    updateSlide(index, {
      bodyMarkup: markup,
      bullets: slideBulletsFromMarkup(markup),
    })
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] flex-col px-3 py-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-lg font-bold">Instructor workspace</h1>
          {activeArtifact && (
            <input
              aria-label="Resource name"
              className="min-w-0 max-w-xs rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:border-[#A21942] focus:outline-none"
              onChange={(event) => renameArtifact(event.target.value)}
              value={activeArtifact.title}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <IconButton icon={FilePlus2} label="New slide deck" disabled={isLoading} onClick={() => void createAndSelectArtifact('slides')} />
          <IconButton icon={MessageSquare} label="New quiz" disabled={isLoading} onClick={() => void createAndSelectArtifact('quiz')} />
          <IconButton
            icon={Maximize2}
            label="Toggle fullscreen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen()
              else void stageRef.current?.requestFullscreen()
            }}
          />
          <IconButton icon={Bookmark} label="Save to library" onClick={saveArtifact} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[250px_minmax(0,1fr)_340px]">
        <aside className="flex min-h-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm" aria-label="Sources and documents">
          <SourcesPanel
            key={activeArtifact?.id ?? 'no-active-material'}
            sources={activeArtifact?.sources ?? []}
            disabled={!activeArtifact || isLoading}
            canCreateMaterial={!activeArtifact && !isLoading && Boolean(workspace.userId)}
            onAddUrl={(url) => activeArtifact ? addWebsiteSource(activeArtifact.id, url) : Promise.resolve()}
            onAddText={(text) => activeArtifact ? addTextSource(activeArtifact.id, text) : Promise.resolve()}
            onAddFiles={(files) => activeArtifact ? addFiles(activeArtifact.id, files) : Promise.resolve()}
            onRemove={(source) => activeArtifact
              ? removeSource(activeArtifact.id, source)
              : Promise.resolve()}
            onCreateMaterial={async (kind) => {
              await createAndSelectArtifact(kind)
            }}
          />

          <section className="flex min-h-0 flex-1 flex-col border-t border-gray-100 pt-3">
            <h2 className="mb-2 text-sm font-semibold">My resources</h2>
            <div className="space-y-1 overflow-y-auto" aria-busy={isLoading}>
              {artifacts.map((artifact) => (
                <div
                  className={`group flex items-center rounded-md transition-colors ${artifact.id === activeArtifactId ? 'bg-[#A21942]/10' : 'hover:bg-gray-100'}`}
                  key={artifact.id}
                >
                  <button
                    className={`min-w-0 flex-1 truncate px-2.5 py-2 text-left text-xs ${artifact.id === activeArtifactId ? 'font-semibold text-[#A21942]' : ''}`}
                    onClick={() => {
                      setActiveArtifactId(artifact.id)
                      setChipChoice(null)
                    }}
                    type="button"
                  >
                    {artifact.kind === 'quiz' ? 'Quiz · ' : 'Slides · '}{artifact.title}
                  </button>
                  <button
                    aria-label={`Delete ${artifact.title}`}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-[#A21942]/30 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isLoading || deletingId !== null}
                    onClick={() => void deleteArtifact(artifact)}
                    title="Delete this resource"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={13} />
                  </button>
                </div>
              ))}
              {isLoading && <p className="text-xs text-gray-500">Loading saved materials…</p>}
              {!isLoading && artifacts.length === 0 && (
                <p className="text-xs text-gray-500">New resources will appear here.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="flex min-h-[540px] min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" aria-label="Resource editor">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
            <div className="flex items-center gap-1">
              {activeArtifact?.kind === 'slides' && (
                <>
                  <select aria-label="Text size" className="h-9 rounded-md border border-gray-200 bg-white px-2 text-xs" defaultValue="3" onChange={(event) => executeStyle('fontSize', event.target.value)}>
                    <option value="2">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="7">Title</option>
                  </select>
                  <IconButton icon={Bold} label="Bold" onClick={() => executeStyle('bold')} />
                  <IconButton icon={Italic} label="Italic" onClick={() => executeStyle('italic')} />
                  <label className="grid size-9 cursor-pointer place-items-center rounded-md border border-gray-200 text-gray-600 hover:text-[#A21942]" title="Text color">
                    <Type size={16} />
                    <input aria-label="Text color" className="sr-only" onChange={(event) => executeStyle('foreColor', event.target.value)} type="color" defaultValue="#262626" />
                  </label>
                  <span className="mx-1 h-6 border-l border-gray-200" />
                  <IconButton icon={AlignLeft} label="Align left" onClick={() => executeStyle('justifyLeft')} />
                  <IconButton icon={AlignCenter} label="Align center" onClick={() => executeStyle('justifyCenter')} />
                  <IconButton icon={AlignRight} label="Align right" onClick={() => executeStyle('justifyRight')} />
                  <IconButton icon={List} label="Bullet list" onClick={() => executeStyle('insertUnorderedList')} />
                </>
              )}
              {activeArtifact?.kind === 'quiz' && (
                <div className="inline-flex rounded-md bg-gray-100 p-1" role="group" aria-label="Quiz mode">
                  <button className={`rounded px-3 py-1.5 text-xs ${quizMode === 'edit' ? 'bg-white font-semibold text-[#A21942] shadow-sm' : 'text-gray-600'}`} onClick={() => setQuizMode('edit')} type="button">Instructor Edit</button>
                  <button className={`rounded px-3 py-1.5 text-xs ${quizMode === 'preview' ? 'bg-white font-semibold text-[#A21942] shadow-sm' : 'text-gray-600'}`} onClick={() => setQuizMode('preview')} type="button">Student Preview</button>
                </div>
              )}
            </div>
            {activeArtifact?.kind === 'slides' && (
              <div className="flex items-center gap-1">
                <IconButton icon={PlusSquare} label="Add slide" onClick={addSlide} />
                <IconButton icon={Copy} label="Duplicate slide" disabled={!activeSlide} onClick={() => duplicateSlide(activeSlideIndex)} />
                <IconButton icon={Trash2} label="Delete slide" disabled={!activeSlide} onClick={() => removeSlide(activeSlideIndex)} />
              </div>
            )}
          </div>

          {activeArtifact?.kind === 'slides' && activeArtifact.content?.type === 'slides' ? (
            <div className="flex min-h-0 flex-1">
              <nav className="w-32 shrink-0 space-y-2 overflow-y-auto border-r border-gray-200 bg-slate-50 p-2 sm:w-44" aria-label="Slide thumbnails">
                {activeSlides.map((slide, index) => (
                  <div
                    aria-label={`Slide ${index + 1}: ${slide.title}`}
                    className={`group relative cursor-grab rounded-md border p-1.5 ${index === activeSlideIndex ? 'border-[#A21942] ring-1 ring-[#A21942]' : 'border-gray-200 hover:border-gray-400'}`}
                    draggable
                    key={`${activeArtifact.id}-${index}`}
                    onClick={() => selectSlide(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const from = Number(event.dataTransfer.getData('text/plain'))
                      if (Number.isInteger(from)) reorderSlide(from, index)
                    }}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') selectSlide(index)
                    }}
                  >
                    <div
                      className="aspect-video overflow-hidden rounded border border-gray-100 p-2 text-[8px]"
                      style={{
                        backgroundColor: resolveSlideTheme(slide.theme).background,
                        color: resolveSlideTheme(slide.theme).textColor,
                      }}
                    >
                      <p className="line-clamp-2 font-bold">{slide.title}</p>
                      <ul className="mt-1 list-disc pl-3">{slide.bullets.slice(0, 3).map((bullet, i) => <li className="line-clamp-1" key={i}>{bullet}</li>)}</ul>
                    </div>
                    <p className="mt-1 truncate text-center text-[10px] text-gray-500">{index + 1} · {slide.title}</p>
                  </div>
                ))}
                <IconButton className="w-full" icon={PlusSquare} label="Add slide" onClick={addSlide} />
              </nav>

              <div className="flex min-w-0 flex-1 flex-col items-center overflow-auto bg-slate-100 p-3 sm:p-6">
                {activeSlide ? (
                  <div className="slide-stage w-full max-w-5xl" ref={stageRef}>
                    <div className="slide-viewport relative aspect-video w-full overflow-hidden" ref={slideViewportRef}>
                      <article
                        className="slide-canvas absolute top-0 flex flex-col overflow-hidden rounded-md border border-gray-200 shadow-lg"
                        style={{
                          width: SLIDE_WIDTH,
                          height: SLIDE_HEIGHT,
                          left: '50%',
                          marginLeft: -SLIDE_WIDTH / 2,
                          transform: `scale(${slideScale})`,
                          transformOrigin: 'top center',
                          backgroundColor: activeSlideTheme.background,
                          color: activeSlideTheme.textColor,
                        }}
                      >
                        <div className="flex h-full flex-col justify-between p-16">
                          <div className="flex min-h-0 flex-col gap-5">
                            <h2
                              aria-label="Slide title; click to edit"
                              className="text-5xl font-bold leading-tight outline-none focus:ring-1 focus:ring-[#A21942]/30"
                              contentEditable
                              onBlur={(event) => editMarkup('titleMarkup', activeSlideIndex, event.currentTarget)}
                              style={{ color: activeSlideTheme.textColor }}
                              suppressContentEditableWarning
                              dangerouslySetInnerHTML={{ __html: safeMarkup(activeSlide.titleMarkup ?? initialMarkup(activeSlide.title)) }}
                            />
                            <div className="grid min-h-0 flex-1 grid-cols-2 items-center gap-12 pt-5">
                              <div
                                aria-label="Slide bullets; click to edit"
                                className="min-h-0 overflow-auto text-2xl leading-relaxed outline-none focus:ring-1 focus:ring-[#A21942]/30"
                                contentEditable
                                onBlur={(event) => editMarkup('bodyMarkup', activeSlideIndex, event.currentTarget)}
                                style={{ color: activeSlideTheme.textColor }}
                                suppressContentEditableWarning
                                dangerouslySetInnerHTML={{
                                  __html: safeMarkup(activeSlide.bodyMarkup ?? `<ul>${activeSlide.bullets.map((bullet) => `<li>${initialMarkup(bullet).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>`),
                                }}
                              />
                              <div
                                className="flex max-h-full min-h-0 flex-col items-center justify-center gap-5 overflow-auto rounded-xl border-2 border-dashed p-6 text-center"
                                style={{
                                  borderColor: activeSlideTheme.accentColor,
                                  backgroundColor: activeSlideTheme.cardBackground,
                                  color: activeSlideTheme.textColor,
                                }}
                              >
                                {activeSlide.visual.kind === 'photo' && activeSlide.imageData ? (
                                  <img
                                    alt={activeSlide.visual.description}
                                    className="max-h-full max-w-full rounded-lg object-contain"
                                    src={activeSlide.imageData}
                                  />
                                ) : (
                                  <>
                                    {activeSlide.visual.kind === 'photo'
                                      ? <Image style={{ color: activeSlideTheme.accentColor }} size={28} />
                                      : <Shapes style={{ color: activeSlideTheme.accentColor }} size={28} />}
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                      {activeSlide.visual.steps.map((step, index) => (
                                        <span className="flex items-center gap-2" key={index}>
                                          {index > 0 && (
                                            <ArrowRight
                                              aria-hidden="true"
                                              style={{ color: activeSlideTheme.accentColor }}
                                              size={16}
                                            />
                                          )}
                                          <span
                                            aria-label={`Visual step ${index + 1}; click to edit`}
                                            className="min-w-12 rounded-lg border px-3 py-2 text-sm font-semibold"
                                            contentEditable
                                            onBlur={(event) => {
                                              const steps = [...activeSlide.visual.steps]
                                              steps[index] = event.currentTarget.textContent?.trim() || 'Step'
                                              updateSlide(activeSlideIndex, {
                                                visual: { ...activeSlide.visual, steps },
                                              })
                                            }}
                                            style={{
                                              backgroundColor: activeSlideTheme.background,
                                              borderColor: activeSlideTheme.accentColor,
                                              color: activeSlideTheme.textColor,
                                            }}
                                            suppressContentEditableWarning
                                          >{step}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </>
                                )}
                                <p
                                  aria-label="Visual description; click to edit"
                                  className="max-w-full text-sm outline-none focus:ring-1 focus:ring-[#A21942]/30"
                                  contentEditable
                                  style={{ color: activeSlideTheme.textColor }}
                                  onBlur={(event) => updateSlide(activeSlideIndex, {
                                    visual: {
                                      ...activeSlide.visual,
                                      description: event.currentTarget.textContent?.trim() || 'Slide visual',
                                    },
                                  })}
                                  suppressContentEditableWarning
                                >{activeSlide.visual.description}</p>
                              </div>
                            </div>
                          </div>
                          <footer
                            className="flex items-center justify-between border-t pt-2 text-xs"
                            style={{ borderColor: activeSlideTheme.accentColor, color: activeSlideTheme.textColor }}
                          >
                            <span>EduGenAI · Editable slide</span>
                            <span>{activeSlideIndex + 1} / {activeSlides.length}</span>
                          </footer>
                        </div>
                      </article>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <IconButton icon={Shapes} label="Use diagram" onClick={() => updateSlide(activeSlideIndex, { visual: { ...activeSlide.visual, kind: 'diagram' } })} />
                        <label className="grid size-9 cursor-pointer place-items-center rounded-md border border-gray-200 bg-white text-gray-600 hover:text-[#A21942]" title="Upload photo">
                          <Image aria-hidden="true" size={16} />
                          <span className="sr-only">Upload photo</span>
                          <input accept="image/*" className="sr-only" onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void uploadSlideImage(file).catch((error: unknown) => setFeedback(error instanceof Error ? error.message : 'Unable to upload photo.'))
                            event.target.value = ''
                          }} type="file" />
                        </label>
                        <IconButton icon={ArrowUp} label="Move slide earlier" disabled={activeSlideIndex === 0} onClick={() => reorderSlide(activeSlideIndex, activeSlideIndex - 1)} />
                        <IconButton icon={ArrowDown} label="Move slide later" disabled={activeSlideIndex >= activeSlides.length - 1} onClick={() => reorderSlide(activeSlideIndex, activeSlideIndex + 1)} />
                      </div>
                      <span className="text-xs text-gray-500">Click any slide text or visual to edit it inline.</span>
                    </div>
                  </div>
                ) : (
                  <div className="m-auto max-w-sm p-8 text-center">
                    <Sparkles className="mx-auto text-[#A21942]" size={28} />
                    <h2 className="mt-3 font-semibold">Start your slide deck</h2>
                    <p className="mt-1 text-sm text-gray-500">Ask the AI to create slides or add a blank slide with the toolbar.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeArtifact?.kind === 'quiz' && activeQuiz ? (
            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 sm:p-7">
              <div className="mx-auto max-w-3xl space-y-4">
                {activeQuiz.questions.map((question, questionIndex) => {
                  const selectedAnswer = activeQuizAnswers[question.id]
                  const isCorrect = selectedAnswer === question.correctAnswerIndex
                  return (
                    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" key={question.id}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-[#A21942]">Question {questionIndex + 1}</span>
                        {quizMode === 'edit' && (
                          <IconButton icon={Trash2} label="Delete question" onClick={() => updateQuiz((content) => ({ ...content, questions: content.questions.filter((item) => item.id !== question.id) }))} />
                        )}
                      </div>
                      {quizMode === 'edit' ? (
                        <>
                          <textarea aria-label={`Question ${questionIndex + 1} text`} className="w-full resize-y rounded-md border border-gray-200 p-3 text-base font-semibold focus:border-[#A21942] focus:outline-none" onChange={(event) => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => ({ ...item, question: event.target.value })))} value={question.question} />
                          <div className="mt-3 space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div className="flex items-center gap-2" key={`${question.id}-${optionIndex}`}>
                                <input aria-label={`Mark option ${optionIndex + 1} correct`} checked={question.correctAnswerIndex === optionIndex} className="accent-[#A21942]" name={`correct-${question.id}`} onChange={() => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => ({ ...item, correctAnswerIndex: optionIndex })))} type="radio" />
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-gray-600">{String.fromCharCode(65 + optionIndex)}</span>
                                <input aria-label={`Option ${optionIndex + 1}`} className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#A21942] focus:outline-none" onChange={(event) => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => ({ ...item, options: item.options.map((value, i) => i === optionIndex ? event.target.value : value) })))} value={option} />
                                <IconButton icon={ArrowUp} label="Move option up" disabled={optionIndex === 0} onClick={() => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => {
                                  const options = [...item.options]
                                  ;[options[optionIndex - 1], options[optionIndex]] = [options[optionIndex], options[optionIndex - 1]]
                                  const correctAnswerIndex = item.correctAnswerIndex === optionIndex ? optionIndex - 1 : item.correctAnswerIndex === optionIndex - 1 ? optionIndex : item.correctAnswerIndex
                                  return { ...item, options, correctAnswerIndex }
                                }))} />
                                <IconButton icon={ArrowDown} label="Move option down" disabled={optionIndex === question.options.length - 1} onClick={() => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => {
                                  const options = [...item.options]
                                  ;[options[optionIndex + 1], options[optionIndex]] = [options[optionIndex], options[optionIndex + 1]]
                                  const correctAnswerIndex = item.correctAnswerIndex === optionIndex ? optionIndex + 1 : item.correctAnswerIndex === optionIndex + 1 ? optionIndex : item.correctAnswerIndex
                                  return { ...item, options, correctAnswerIndex }
                                }))} />
                                <IconButton icon={X} label="Remove option" disabled={question.options.length <= 2} onClick={() => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => {
                                  const options = item.options.filter((_, i) => i !== optionIndex)
                                  return { ...item, options, correctAnswerIndex: item.correctAnswerIndex === optionIndex ? 0 : item.correctAnswerIndex > optionIndex ? item.correctAnswerIndex - 1 : item.correctAnswerIndex }
                                }))} />
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <button className="text-xs font-semibold text-[#A21942] hover:underline" disabled={question.options.length >= 6} onClick={() => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => ({ ...item, options: [...item.options, `Option ${String.fromCharCode(65 + item.options.length)}`] })))} type="button">Add option</button>
                            <label className="flex items-center gap-2 text-xs text-gray-600">Explanation
                              <input className="w-64 max-w-full rounded-md border border-gray-200 px-2 py-1.5" onChange={(event) => updateQuiz((content) => updateQuizQuestion(content, question.id, (item) => ({ ...item, explanation: event.target.value })))} value={question.explanation ?? ''} />
                            </label>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-base font-semibold">{question.question}</h3>
                          <fieldset className="mt-3 space-y-2">
                            <legend className="sr-only">Choose an answer for question {questionIndex + 1}</legend>
                            {question.options.map((option, optionIndex) => (
                              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                                selectedAnswer === optionIndex
                                  ? quizMode === 'preview'
                                    ? isCorrect
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                      : 'border-red-400 bg-red-50 text-red-900'
                                    : 'border-[#A21942] bg-[#A21942]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`} key={`${question.id}-${optionIndex}`}>
                                <input checked={selectedAnswer === optionIndex} className="accent-[#A21942]" name={`answer-${question.id}`} onChange={() => {
                                  if (!activeArtifactId) return
                                  setQuizAnswers((answers) => ({
                                    ...answers,
                                    [activeArtifactId]: { ...answers[activeArtifactId], [question.id]: optionIndex },
                                  }))
                                }} type="radio" />
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-gray-600">{String.fromCharCode(65 + optionIndex)}</span>
                                <span>{option}</span>
                              </label>
                            ))}
                          </fieldset>
                          {selectedAnswer !== undefined && (
                            <p className={`mt-3 rounded-md p-3 text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`} role="status">
                              <strong>{isCorrect ? 'Correct.' : `Not quite. Correct answer: ${question.options[question.correctAnswerIndex]}.`}</strong> {question.explanation}
                            </p>
                          )}
                        </>
                      )}
                    </article>
                  )
                })}
                {quizMode === 'edit' && (
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white py-3 text-sm font-medium text-[#A21942] hover:border-[#A21942]" onClick={addQuestion} type="button">
                    <Plus size={16} /> Add question
                  </button>
                )}
                {activeQuiz.questions.length === 0 && <p className="py-12 text-center text-sm text-gray-500">Ask the AI to create quiz questions, or add a question.</p>}
              </div>
            </div>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div><Sparkles className="mx-auto text-[#A21942]" size={30} /><h2 className="mt-3 font-semibold">Create a resource with AI</h2><p className="mt-1 text-sm text-gray-500">Choose slide deck or quiz, then enter a prompt.</p></div>
            </div>
          )}
        </section>

        <aside className="flex min-h-[540px] min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" aria-label="AI conversation">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div><h2 className="text-sm font-semibold">AI assistant</h2><p className="text-[11px] text-gray-500">{activeArtifact ? `Conversation · ${activeArtifact.title}` : 'Create a file-scoped conversation'}</p></div>
            <Sparkles className="text-[#A21942]" size={17} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-3" aria-live="polite">
            {activeArtifact?.messages.map((message) => (
              <div className={`max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-5 ${message.role === 'user' ? 'self-end rounded-br-sm bg-[#A21942] text-white' : 'self-start rounded-bl-sm border border-gray-200 bg-white text-gray-700'}`} key={message.id}>
                {message.content}
                <time className="mt-1 block text-[9px] opacity-60" dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            ))}
            {(!activeArtifact || activeArtifact.messages.length === 0) && <p className="m-auto max-w-52 text-center text-xs leading-5 text-gray-500">Each resource keeps its own conversation. Ask to create it, or send a prompt to refine the active file.</p>}
            {isSending && <p className="self-start rounded-xl bg-white px-3 py-2 text-xs text-gray-500">Working on this resource…</p>}
          </div>
          <div className="border-t border-gray-200 p-3">
            <div className="mb-2 flex gap-1">
              <button className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${selectedKind === 'slides' ? 'border-[#A21942] bg-[#A21942]/5 text-[#A21942]' : 'border-gray-200 text-gray-600 hover:border-[#A21942]/50 hover:text-[#A21942]'}`} title="Target slide decks" type="button" onClick={() => setChipChoice('slides')}>Slides</button>
              <button className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${selectedKind === 'quiz' ? 'border-[#A21942] bg-[#A21942]/5 text-[#A21942]' : 'border-gray-200 text-gray-600 hover:border-[#A21942]/50 hover:text-[#A21942]'}`} title="Target MC quizzes" type="button" onClick={() => setChipChoice('quiz')}>MC Quiz</button>
            </div>
            <form className="flex items-end gap-2" onSubmit={(event) => void submitPrompt(event)}>
              <textarea
                aria-label="Message the AI about this resource"
                className="min-h-10 min-w-0 flex-1 resize-y rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-[#A21942] focus:outline-none"
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void submitPrompt()
                  }
                }}
                placeholder={
                  activeArtifact && selectedKind !== activeArtifact.kind
                    ? `This will create a new ${selectedKind === 'quiz' ? 'MC quiz' : 'slide deck'}…`
                    : activeContentCount
                      ? 'Prompt a change to this file…'
                      : 'Create a resource from your sources…'
                }
                ref={promptRef}
                value={prompt}
              />
              <button aria-label="Send prompt" className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#A21942] text-white hover:bg-[#801333] disabled:opacity-50" disabled={isSending || !prompt.trim()} title="Send prompt" type="submit">
                <Send aria-hidden="true" size={16} />
              </button>
            </form>
            {(feedback || workspaceError) && (
              <p className="mt-2 text-xs text-red-700" role="alert">{feedback || workspaceError}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

const rootElement = document.querySelector<HTMLElement>('#instructor-app')
if (!rootElement) throw new Error('The instructor app mount point is missing.')
createRoot(rootElement).render(<InstructorApp />)
