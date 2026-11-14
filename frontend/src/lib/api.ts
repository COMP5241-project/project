export type DashboardRole = 'student' | 'instructor'

export interface Profile {
  id: string
  email: string | null
  role: DashboardRole
  cs_qualified: boolean
  assessment_completed: boolean
  non_cs_introduction_completed: boolean
}

export interface CurrentProfile {
  email: string
  profile: Profile
}

export type CoursePresentationFormat =
  | 'text-and-images'
  | 'interactive-simulations'
  | 'interactive-role-play-activities'
  | 'games'
  | 'animations'
  | 'slides-based'
  | 'online-coding'

export interface CourseDraftRequest {
  topic: string
  learning_goal: string | null
  target_audience: string | null
  experience_level: string | null
  time_budget_minutes: number | null
  constraints: string[]
  preferred_formats: CoursePresentationFormat[]
}

export interface SuggestedCourseActivity {
  title: string
  description: string
  presentation_format: CoursePresentationFormat
}

export interface CourseLessonPlan {
  lesson_id: string
  title: string
  purpose: string
  objectives: string[]
  key_topics: string[]
  suggested_activity: SuggestedCourseActivity
  completion_check: string
  prerequisite_lesson_ids: string[]
  estimated_minutes: number | null
}

export interface CourseModulePlan {
  module_id: string
  title: string
  description: string
  lessons: CourseLessonPlan[]
}

export interface CoursePlan {
  overview: string
  target_audience: string
  assumptions: string[]
  learning_outcomes: string[]
  prerequisites: string[]
  modules: CourseModulePlan[]
  milestones: string[]
  capstone: string
}

export interface CourseDraftProposal {
  title: string
  description: string
  default_presentation_format: CoursePresentationFormat
  visibility: 'public' | 'restricted'
  plan: CoursePlan
}

export interface CourseDraftSaveResponse {
  course_id: string
  version_id: string
  version_number: number
  status: 'draft'
  visibility: 'public' | 'restricted'
}

export interface CoursePublishResponse {
  course_id: string
  status: 'published'
  published_at: string
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

export async function completeAssessment(csQualified: boolean): Promise<CurrentProfile> {
  const data = await request<CurrentProfile>('/profiles/assessment', {
    cs_qualified: csQualified,
  })
  if (!data) throw new ApiError('Unable to save your assessment result.', 503)
  return data
}

export async function completeNonCsIntroduction(): Promise<CurrentProfile> {
  const data = await request<CurrentProfile>('/profiles/non-cs-introduction', {})
  if (!data) throw new ApiError('Unable to save your introduction progress.', 503)
  return data
}

export async function login(email: string, password: string): Promise<CurrentProfile> {
  const data = await request<CurrentProfile>('/auth/login', { email, password })
  if (!data) throw new ApiError('Sign-in failed. Try again.', 503)
  return data
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request('/auth/password-reset/request', { email })
}

export async function verifyPasswordReset(
  email: string,
  code: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await request('/auth/password-reset/verify', {
    email,
    code,
    password,
    password_confirmation: passwordConfirmation,
  })
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
  published: boolean
  publishedAt: string | null
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

/** Publishes (or unpublishes) a material so students can open it. */
export async function setMaterialPublished(materialId: string, published: boolean): Promise<Material> {
  const data = await request<Material>(
    `/materials/${encodeURIComponent(materialId)}/publish`,
    { published },
  )
  if (!data) throw new ApiError('Unable to update this material.', 503)
  return data
}

export interface MaterialVersion {
  id: string
  materialId: string
  userId: string
  title: string
  data: GeneratedArtifactContent
  label: string
  createdAt: string
}

/** Saves a server-side snapshot of a material's current content. */
export async function createMaterialVersion(materialId: string, label: string): Promise<MaterialVersion> {
  const data = await request<MaterialVersion>(
    `/materials/${encodeURIComponent(materialId)}/versions`,
    { label },
  )
  if (!data) throw new ApiError('Unable to save this version.', 503)
  return data
}

/** Lists the material's most recent saved versions (newest first). */
export async function fetchMaterialVersions(materialId: string): Promise<MaterialVersion[]> {
  const data = await request<MaterialVersion[]>(`/materials/${encodeURIComponent(materialId)}/versions`)
  if (!data) throw new ApiError('Unable to load saved versions.', 503)
  return data
}

/** Restores a saved version's content into the material. */
export async function restoreMaterialVersion(materialId: string, versionId: string): Promise<Material> {
  const data = await request<Material>(
    `/materials/${encodeURIComponent(materialId)}/versions/${encodeURIComponent(versionId)}/restore`,
    {},
    'POST',
  )
  if (!data) throw new ApiError('Unable to restore this version.', 503)
  return data
}

/* --- Published courses (student delivery pipeline) --- */

export interface PublishedCourseSummary {
  id: string
  title: string
  type: 'slides' | 'quiz'
  publishedAt: string | null
  /** This student's delivery status: 'none', 'in_progress', or 'completed'. */
  status?: 'none' | 'in_progress' | 'completed'
  completedAt?: string | null
}

export interface StudentSlide {
  title: string
  bullets: string[]
  visual: {
    kind: 'diagram' | 'photo'
    description: string
    steps: string[]
  }
  theme?: SlideTheme
  imageData?: string | null
}

export interface StudentQuizQuestion {
  id: string
  question: string
  options: string[]
}

export type StudentCourseContent =
  | { type: 'slides'; content: StudentSlide[] }
  | { type: 'quiz'; questions: StudentQuizQuestion[] }

export interface StudentCourse {
  id: string
  title: string
  publishedAt: string | null
  content: StudentCourseContent
}

export interface PublicCurriculumCourseSummary {
  id: string
  title: string
  description: string
  publishedAt: string | null
}

export interface PublicCurriculumCourse extends PublicCurriculumCourseSummary {
  default_presentation_format: CoursePresentationFormat
  plan: CoursePlan
}

export type InstructorManagedCourseStatus = 'draft' | 'published' | 'archived'
export type InstructorManagedCourseVisibility = 'public' | 'restricted'

export interface InstructorManagedCourseSummary {
  id: string
  title: string
  description: string
  status: InstructorManagedCourseStatus
  visibility: InstructorManagedCourseVisibility
  default_presentation_format: CoursePresentationFormat
  publishedAt: string | null
  updatedAt: string
}

export interface InstructorManagedCourse extends InstructorManagedCourseSummary {
  version_number: number
  plan: CoursePlan
}

export interface InstructorCourseAccessEntry {
  user_id: string
  email: string
  grantedAt: string
}

/** Lists the instructor's saved curriculum plans. */
export async function fetchInstructorCourses(): Promise<InstructorManagedCourseSummary[]> {
  const data = await request<InstructorManagedCourseSummary[]>('/instructor/courses')
  if (!data) throw new ApiError('Unable to load your saved courses.', 503)
  return data
}

/** Loads one saved curriculum plan for its instructor. */
export async function fetchInstructorCourse(courseId: string): Promise<InstructorManagedCourse> {
  const data = await request<InstructorManagedCourse>(
    `/instructor/courses/${encodeURIComponent(courseId)}`,
  )
  if (!data) throw new ApiError('Unable to load this course plan.', 503)
  return data
}

export async function updateInstructorCourseVisibility(
  courseId: string,
  visibility: InstructorManagedCourseVisibility,
): Promise<{ course_id: string; visibility: InstructorManagedCourseVisibility }> {
  const data = await request<{ course_id: string; visibility: InstructorManagedCourseVisibility }>(
    `/instructor/courses/${encodeURIComponent(courseId)}/visibility`,
    { visibility },
    'PATCH',
  )
  if (!data) throw new ApiError('Unable to update course visibility.', 503)
  return data
}

export async function updateInstructorCourseStatus(
  courseId: string,
  status: 'draft' | 'published',
): Promise<{ course_id: string; status: 'draft' | 'published'; published_at: string | null }> {
  const data = await request<{ course_id: string; status: 'draft' | 'published'; published_at: string | null }>(
    `/instructor/courses/${encodeURIComponent(courseId)}/status`,
    { status },
    'PATCH',
  )
  if (!data) throw new ApiError('Unable to update course status.', 503)
  return data
}

export async function fetchInstructorCourseAccess(
  courseId: string,
): Promise<InstructorCourseAccessEntry[]> {
  const data = await request<InstructorCourseAccessEntry[]>(
    `/instructor/courses/${encodeURIComponent(courseId)}/access`,
  )
  if (!data) throw new ApiError('Unable to load student access.', 503)
  return data
}

export async function grantInstructorCourseAccess(
  courseId: string,
  email: string,
): Promise<InstructorCourseAccessEntry> {
  const data = await request<InstructorCourseAccessEntry>(
    `/instructor/courses/${encodeURIComponent(courseId)}/access`,
    { email },
  )
  if (!data) throw new ApiError('Unable to grant student access.', 503)
  return data
}

export async function revokeInstructorCourseAccess(
  courseId: string,
  learnerId: string,
): Promise<void> {
  await request(
    `/instructor/courses/${encodeURIComponent(courseId)}/access/${encodeURIComponent(learnerId)}`,
    undefined,
    'DELETE',
  )
}

/** Lists the published courses available to the signed-in student. */
export async function fetchPublishedCourses(): Promise<PublishedCourseSummary[]> {
  const data = await request<PublishedCourseSummary[]>('/courses')
  if (!data) throw new ApiError('Unable to load your courses.', 503)
  return data
}

/** Lists published instructor curriculum plans available to this student. */
export async function fetchPublicCurriculumCourses(): Promise<PublicCurriculumCourseSummary[]> {
  const data = await request<PublicCurriculumCourseSummary[]>('/curriculum-courses')
  if (!data) throw new ApiError('Unable to load instructor-created courses.', 503)
  return data
}

/** Loads an instructor curriculum plan available to this student. */
export async function fetchPublicCurriculumCourse(courseId: string): Promise<PublicCurriculumCourse> {
  const data = await request<PublicCurriculumCourse>(
    `/curriculum-courses/${encodeURIComponent(courseId)}`,
  )
  if (!data) throw new ApiError('Unable to load this course plan.', 503)
  return data
}

/** Loads a published course. Quiz answer keys are withheld server-side. */
export async function fetchStudentCourse(courseId: string): Promise<StudentCourse> {
  const data = await request<StudentCourse>(`/courses/${encodeURIComponent(courseId)}`)
  if (!data) throw new ApiError('Unable to load this course.', 503)
  return data
}

export interface StudentAnswerResult {
  correct: boolean
  correct_index: number
  explanation: string | null
}

/** Submits one quiz answer; the server checks it and records the attempt. */
export async function submitCourseAnswer(
  courseId: string,
  questionId: string,
  selectedIndex: number,
): Promise<StudentAnswerResult> {
  const data = await request<StudentAnswerResult>(`/courses/${encodeURIComponent(courseId)}/answers`, {
    question_id: questionId,
    selected_index: selectedIndex,
  })
  if (!data) throw new ApiError('Unable to save your answer. Try again.', 503)
  return data
}

/** Records course start/completion for participation tracking. */
export async function reportCourseProgress(courseId: string, event: 'start' | 'complete'): Promise<void> {
  await request(`/courses/${encodeURIComponent(courseId)}/progress`, { event })
}

/* --- Roster import & participation analytics (instructor) --- */

export interface RosterSummary {
  id: string
  name: string
  createdAt: string
  studentCount: number
}

export interface RosterStudent {
  id: string
  name: string
  email: string
  matched: boolean
  importedAt: string
  lastActiveAt: string | null
  coursesCompleted: number
  quizAverage: number | null
}

export interface RosterCourseAnalytics {
  courseId: string
  title: string
  started: number
  completed: number
  quizAverage: number | null
}

export interface RosterDetail {
  roster: { id: string; name: string; createdAt: string }
  students: RosterStudent[]
  analytics: {
    enrolled: number
    matched: number
    active: number
    participationRate: number
    quizAverage: number | null
    courses: RosterCourseAnalytics[]
  }
}

export interface RosterImportResult {
  roster: { id: string; name: string; createdAt: string | null }
  imported: number
  matched: number
}

export async function fetchRosters(): Promise<RosterSummary[]> {
  const data = await request<RosterSummary[]>('/rosters')
  if (!data) throw new ApiError('Unable to load rosters.', 503)
  return data
}

/** Imports a CSV roster (columns: name,email) and links matching accounts. */
export async function importRoster(file: File, name?: string): Promise<RosterImportResult> {
  const form = new FormData()
  form.set('file', file)
  if (name) form.set('name', name)
  const data = await request<RosterImportResult>('/rosters/import', form)
  if (!data) throw new ApiError('Unable to import this roster.', 503)
  return data
}

export async function fetchRosterDetail(rosterId: string): Promise<RosterDetail> {
  const data = await request<RosterDetail>(`/rosters/${encodeURIComponent(rosterId)}`)
  if (!data) throw new ApiError('Unable to load this roster.', 503)
  return data
}

export async function deleteRoster(rosterId: string): Promise<void> {
  await request(`/rosters/${encodeURIComponent(rosterId)}`, {}, 'DELETE')
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

/** Downloads the material's PPTX file (generated server-side from the saved content). */
export async function downloadMaterialPptx(materialId: string, title: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(`/api/materials/${encodeURIComponent(materialId)}/export/pptx`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch {
    throw new ApiError('Unable to connect to the export service. Check your connection and try again.', 0)
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null) as ErrorResponse | null
    throw new ApiError(
      data?.error?.message ?? 'Unable to export this material as PPTX.',
      response.status,
      data?.error?.signed_out === true,
    )
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'material'}.pptx`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
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

export async function generateInstructorCourseProposal(
  input: CourseDraftRequest,
): Promise<CourseDraftProposal> {
  const data = await request<CourseDraftProposal>('/instructor/courses/generate', input)
  if (!data) throw new ApiError('Unable to generate a course proposal. Try again.', 503)
  return data
}

export async function saveInstructorCourseProposal(
  proposal: CourseDraftProposal,
  courseId?: string,
): Promise<CourseDraftSaveResponse> {
  const path = courseId
    ? `/instructor/courses/${encodeURIComponent(courseId)}`
    : '/instructor/courses'
  const data = await request<CourseDraftSaveResponse>(
    path,
    proposal,
    courseId ? 'PATCH' : 'POST',
  )
  if (!data) throw new ApiError('Unable to save this course draft. Try again.', 503)
  return data
}

export async function publishInstructorCourse(courseId: string): Promise<CoursePublishResponse> {
  const data = await request<CoursePublishResponse>(
    `/instructor/courses/${encodeURIComponent(courseId)}/publish`,
    {},
  )
  if (!data) throw new ApiError('Unable to publish this course. Try again.', 503)
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
  category: string
  scenario: string
  segments: string[]
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
  flaw_segment: number
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

/* --- Sample mini-course (public preview with quota-limited AI tutor) --- */

export interface SampleDecisionOption {
  id: string
  text: string
}

export interface SampleDecision {
  id: string
  scenario: string
  question: string
  options: SampleDecisionOption[]
}

export interface SampleSlide {
  id: string
  title: string
  bullets: string[]
  steps: string[]
}

export interface SampleQuizQuestion {
  id: string
  question: string
  options: string[]
}

export interface SamplePromptCompare {
  id: string
  story: string
  vague_prompt: string
  precise_prompt: string
  vague_outcome: string
  precise_outcome: string
  task: string
}

export interface SampleBotInput {
  id: string
  label: string
  emoji: string
}

export interface SampleBotGame {
  moment_id: string
  title: string
  intro: string
  attempts: number
  flaws_total: number
  inputs: SampleBotInput[]
  win_title: string
  win_message: string
  lesson_lines: string[]
  teaser: string
}

export interface SampleReflection {
  id: string
  prompt: string
}

export interface SampleCourseContent {
  title: string
  tagline: string
  minutes: string
  tutor_moments: number
  decisions: SampleDecision[]
  slides: SampleSlide[]
  quiz: SampleQuizQuestion[]
  prompt_compare: SamplePromptCompare
  bot: SampleBotGame
  reflection: SampleReflection
}

/** Loads the public sample course (player view — answer keys stay server-side). */
export async function getSampleCourseContent(): Promise<SampleCourseContent> {
  const data = await request<SampleCourseContent>('/sample-course/content')
  if (!data) throw new ApiError('Unable to load the sample course. Try again.', 503)
  return data
}

export type SampleAnswerResult =
  | { type: 'decision'; correct: boolean; feedback: string }
  | { type: 'quiz'; correct: boolean; correct_index: number; explanation: string }
  | { type: 'bot'; kind: 'success' | 'near_miss' | 'flaw'; reaction: string; lesson: string | null }

/** Server-checks a deterministic answer (decision option, quiz index, bot input). */
export async function submitSampleAnswer(
  momentId: string,
  choice: string,
): Promise<SampleAnswerResult> {
  const data = await request<SampleAnswerResult>('/sample-course/answer', {
    moment_id: momentId,
    choice,
  })
  if (!data) throw new ApiError('Unable to check that answer. Try again.', 503)
  return data
}

export interface SampleTutorVerdict {
  score: number
  feedback: string
  key_points: string[]
  remaining_uses: number
}

/** Asks the quota-limited AI tutor to grade a free-response moment. */
export async function askSampleTutor(
  momentId: string,
  answer: string,
): Promise<SampleTutorVerdict> {
  const data = await request<SampleTutorVerdict>('/sample-course/tutor', {
    moment_id: momentId,
    answer,
  })
  if (!data) throw new ApiError('The AI tutor is unavailable. Try again.', 503)
  return data
}

export interface SampleCourseResultInput {
  overall_score: number
  simulation_score: number
  quiz_score: number
  bot_score: number
  prompt_compare_score: number | null
  reflection_score: number | null
}

/** Persists a completed sample course run for the signed-in student. */
export async function saveSampleCourseResult(input: SampleCourseResultInput): Promise<void> {
  await request('/profiles/sample-course-results', input)
}