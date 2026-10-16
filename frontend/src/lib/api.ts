export type DashboardRole = 'student' | 'instructor'

export interface Profile {
  id: string
  email: string | null
  role: DashboardRole
  cs_qualified: boolean
  assessment_completed: boolean
}

export interface CurrentProfile {
  email: string
  profile: Profile
}

interface ErrorResponse {
  error?: { code?: string; message?: string; signed_out?: boolean }
}

export class ApiError extends Error {
  readonly status: number
  readonly signedOut: boolean

  constructor(
    message: string,
    status: number,
    signedOut = false,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.signedOut = signedOut
  }
}

async function request<T>(
  path: string,
  body?: object | FormData,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T | undefined> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined || body instanceof FormData
        ? undefined
        : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Unable to connect to the sign-in service. Check your connection and try again.', 0)
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null) as ErrorResponse | null
    throw new ApiError(
      data?.error?.message ?? 'The sign-in service is unavailable. Try again later.',
      response.status,
      data?.error?.signed_out === true,
    )
  }
  if (response.status === 204) return undefined
  return response.json() as Promise<T>
}

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const data = await request<CurrentProfile>('/profiles/me')
  if (!data) throw new ApiError('Unable to load your profile.', 503)
  return data
}

export async function login(email: string, password: string): Promise<CurrentProfile> {
  const data = await request<CurrentProfile>('/auth/login', { email, password })
  if (!data) throw new ApiError('Sign-in failed. Try again.', 503)
  return data
}

export async function logout(): Promise<void> {
  await request('/auth/logout', {})
}

export interface GeneratedCourseContent {
  type: 'slides'
  content: GeneratedSlide[]
}

export interface GeneratedQuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswerIndex: number
  explanation?: string
}

export interface GeneratedQuizContent {
  type: 'quiz'
  questions: GeneratedQuizQuestion[]
}

export type GeneratedArtifactContent = GeneratedCourseContent | GeneratedQuizContent

export interface GeneratedSlide {
  title: string
  bullets: string[]
  visual: {
    kind: 'diagram' | 'photo'
    description: string
    steps: string[]
  }
  theme?: SlideTheme
}

export interface SlideTheme {
  background: string
  textColor: string
  accentColor: string
  cardBackground?: string
}

export type SourceType = 'file' | 'url' | 'text'

export interface SourceItem {
  id: string
  materialId: string
  type: SourceType
  name: string
  rawContent?: string
  fileUrl?: string
  sourceUrl?: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type MaterialType = 'slides' | 'quiz' | 'flashcards' | 'summary'

export interface Material {
  id: string
  userId: string
  title: string
  type: MaterialType
  sources: SourceItem[]
  data: GeneratedArtifactContent
  chatHistory: ChatMessage[]
  updatedAt: string
  createdAt: string
}

export async function fetchUserMaterials(): Promise<Material[]> {
  const data = await request<Material[]>('/materials')
  if (!data) throw new ApiError('Unable to load your saved materials.', 503)
  return data
}

export async function createMaterial(
  material: Pick<Material, 'id' | 'title' | 'type' | 'data' | 'chatHistory'>,
): Promise<Material> {
  const data = await request<Material>('/materials', {
    id: material.id,
    title: material.title,
    type: material.type,
    data: material.data,
    chatHistory: material.chatHistory,
  })
  if (!data) throw new ApiError('Unable to create this material.', 503)
  return data
}

export async function updateMaterial(
  materialId: string,
  changes: Pick<Material, 'title' | 'data' | 'chatHistory'>,
): Promise<Material> {
  const data = await request<Material>(
    `/materials/${encodeURIComponent(materialId)}`,
    changes,
    'PATCH',
  )
  if (!data) throw new ApiError('Unable to save this material.', 503)
  return data
}

export async function deleteMaterial(materialId: string): Promise<void> {
  await request(`/materials/${encodeURIComponent(materialId)}`, {}, 'DELETE')
}

export async function createMaterialSource(
  materialId: string,
  input: { type: 'text'; name: string; rawContent: string } |
    { type: 'url'; name: string; sourceUrl: string } |
    { type: 'file'; file: File },
): Promise<SourceItem> {
  const body = input.type === 'file'
    ? (() => {
        const form = new FormData()
        form.set('file', input.file)
        return form
      })()
    : input
  const data = await request<SourceItem>(
    `/materials/${encodeURIComponent(materialId)}/sources`,
    body,
  )
  if (!data) throw new ApiError('Unable to save this source.', 503)
  return data
}

export async function deleteMaterialSource(materialId: string, sourceId: string): Promise<void> {
  await request(
    `/materials/${encodeURIComponent(materialId)}/sources/${encodeURIComponent(sourceId)}`,
    {},
    'DELETE',
  )
}

export async function generateCourseContent(
  artifactType: 'slides' | 'quiz',
  prompt: string,
  sourceContext: string,
  revisionPrompt = '',
  existingContent?: GeneratedArtifactContent,
): Promise<GeneratedArtifactContent> {
  const data = await request<GeneratedArtifactContent>('/instructor/generate', {
    artifact_type: artifactType,
    prompt,
    source_context: sourceContext,
    revision_prompt: revisionPrompt,
    existing_content: existingContent,
  })
  if (!data) throw new ApiError('Unable to generate course content. Try again.', 503)
  return data
}

export interface HallucinationResultInput {
  challenge_id: string
  score: number
  critique: string
  feedback: string | null
}

/** Persists a finished "Spot the Hallucination" attempt for the signed-in user. */
export async function saveHallucinationResult(input: HallucinationResultInput): Promise<void> {
  await request('/profiles/hallucination-results', input)
}

/* --- Spot the Hallucination game (challenges + AI judge live on the backend) --- */

export interface HallucinationChallenge {
  id: string
  title: string
  emoji: string
  language: string
  category: string
  scenario: string
  code: string[]
  hint_mild: string
  hint_strong: string
}

export type DiscernmentRating = 'novice' | 'developing' | 'sharp'

export interface JudgeVerdict {
  score: number
  rating: DiscernmentRating
  identified: string[]
  missed: string[]
  feedback: string
  flaw_line: number
  flaw_summary: string
}

/** Loads the playable challenge bank (answer fields stay server-side). */
export async function getHallucinationChallenges(): Promise<HallucinationChallenge[]> {
  const data = await request<HallucinationChallenge[]>('/hallucination/challenges')
  if (!data) throw new ApiError('Unable to load the game. Try again.', 503)
  return data
}

/** Grades a critique with the server-side AI tutor. */
export async function judgeHallucinationCritique(
  challengeId: string,
  critique: string,
  tappedLine: number,
): Promise<JudgeVerdict> {
  const data = await request<JudgeVerdict>('/hallucination/judge', {
    challenge_id: challengeId,
    critique,
    tapped_line: tappedLine,
  })
  if (!data) throw new ApiError('The AI tutor is unavailable. Try again.', 503)
  return data
}