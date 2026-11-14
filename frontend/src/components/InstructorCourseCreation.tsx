import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import {
  generateInstructorCourseProposal,
  publishInstructorCourse,
  saveInstructorCourseProposal,
  type CourseDraftProposal,
  type CourseDraftRequest,
  type CourseLessonPlan,
  type CourseModulePlan,
  type CoursePresentationFormat,
} from '../lib/api'

const formats: { value: CoursePresentationFormat; label: string }[] = [
  { value: 'text-and-images', label: 'Text and images' },
  { value: 'interactive-simulations', label: 'Interactive simulations' },
  { value: 'interactive-role-play-activities', label: 'Role-play activities' },
  { value: 'games', label: 'Games' },
  { value: 'animations', label: 'Animations' },
  { value: 'slides-based', label: 'Slides' },
  { value: 'online-coding', label: 'Online coding' },
]

const fieldClassName =
  'mt-2 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#262626] focus:border-[#A21942] focus:outline-none focus:ring-2 focus:ring-[#A21942]/20'

export function InstructorCourseCreation({ onClose }: { onClose: () => void }) {
  const [topic, setTopic] = useState('')
  const [learningGoal, setLearningGoal] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [timeBudget, setTimeBudget] = useState('')
  const [constraints, setConstraints] = useState('')
  const [preferredFormat, setPreferredFormat] =
    useState<CoursePresentationFormat>('text-and-images')
  const [proposal, setProposal] = useState<CourseDraftProposal | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [busy, setBusy] = useState<'generate' | 'save' | 'publish' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function generateProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy('generate')
    const request: CourseDraftRequest = {
      topic: topic.trim(),
      learning_goal: learningGoal.trim() || null,
      target_audience: targetAudience.trim() || null,
      experience_level: experienceLevel.trim() || null,
      time_budget_minutes: timeBudget ? Number(timeBudget) : null,
      constraints: constraints.split('\n').map((item) => item.trim()).filter(Boolean),
      preferred_formats: [preferredFormat],
    }
    try {
      setProposal(await generateInstructorCourseProposal(request))
      setDraftId(null)
      setPublished(false)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Unable to generate a course proposal.')
    } finally {
      setBusy(null)
    }
  }

  function updateProposal(update: (current: CourseDraftProposal) => CourseDraftProposal) {
    setProposal((current) => current ? update(current) : current)
  }

  function updateModule(index: number, changes: Partial<CourseModulePlan>) {
    updateProposal((current) => ({
      ...current,
      plan: {
        ...current.plan,
        modules: current.plan.modules.map((module, moduleIndex) =>
          moduleIndex === index ? { ...module, ...changes } : module,
        ),
      },
    }))
  }

  function updateLesson(
    moduleIndex: number,
    lessonIndex: number,
    changes: Partial<CourseLessonPlan>,
  ) {
    updateProposal((current) => ({
      ...current,
      plan: {
        ...current.plan,
        modules: current.plan.modules.map((module, currentModuleIndex) =>
          currentModuleIndex === moduleIndex
            ? {
                ...module,
                lessons: module.lessons.map((lesson, currentLessonIndex) =>
                  currentLessonIndex === lessonIndex
                    ? { ...lesson, ...changes }
                    : lesson,
                ),
              }
            : module,
        ),
      },
    }))
  }

  async function saveProposal(currentProposal: CourseDraftProposal): Promise<string> {
    const saved = await saveInstructorCourseProposal(currentProposal, draftId ?? undefined)
    setDraftId(saved.course_id)
    return saved.course_id
  }

  async function saveDraft() {
    if (!proposal) return
    setError('')
    setNotice('')
    setBusy('save')
    try {
      await saveProposal(proposal)
      setNotice('Draft saved. Save again after making further edits.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this course draft.')
    } finally {
      setBusy(null)
    }
  }

  async function saveAndPublish() {
    if (!proposal) return
    setError('')
    setNotice('')
    setBusy('publish')
    try {
      const courseId = await saveProposal(proposal)
      await publishInstructorCourse(courseId)
      setPublished(true)
      setNotice(
        proposal.visibility === 'public'
          ? 'Course published. Its plan is now available in the Student Learning Hub.'
          : 'Course published as restricted. Add students from Manage Courses to grant access.',
      )
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Unable to publish this course.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 py-3">
      <button
        className="inline-flex items-center gap-2 text-sm font-medium text-[#A21942] hover:underline"
        onClick={onClose}
        type="button"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to studio
      </button>

      <header>
        <p className="text-sm font-semibold text-[#A21942]">Course authoring</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#262626]">
          Create a course with AI
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Describe the course, review and edit its structured curriculum, then save it as a draft or publish it.
        </p>
      </header>

      <form
        className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        onSubmit={(event) => void generateProposal(event)}
      >
        <h3 className="text-base font-semibold text-[#262626]">Course brief</h3>
        <TextField
          label="Topic"
          required
          value={topic}
          minLength={3}
          maxLength={200}
          onChange={setTopic}
          placeholder="For example, using AI coding agents effectively"
        />
        <TextField
          label="Learning goal"
          value={learningGoal}
          maxLength={1000}
          multiline
          onChange={setLearningGoal}
          placeholder="What should learners be able to do?"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Target audience"
            value={targetAudience}
            maxLength={500}
            onChange={setTargetAudience}
            placeholder="Who is this course for?"
          />
          <TextField
            label="Experience level"
            value={experienceLevel}
            maxLength={100}
            onChange={setExperienceLevel}
            placeholder="Beginner, intermediate…"
          />
          <label className="block text-sm font-medium text-gray-700">
            Time budget (minutes)
            <input
              className={fieldClassName}
              type="number"
              min={1}
              max={10080}
              step={1}
              value={timeBudget}
              onChange={(event) => setTimeBudget(event.target.value)}
              placeholder="e.g. 120"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Preferred activity format
            <select
              className={fieldClassName}
              value={preferredFormat}
              onChange={(event) => setPreferredFormat(event.target.value as CoursePresentationFormat)}
            >
              {formats.map((format) => (
                <option key={format.value} value={format.value}>{format.label}</option>
              ))}
            </select>
          </label>
        </div>
        <TextField
          label="Requirements or constraints (one per line)"
          value={constraints}
          multiline
          onChange={setConstraints}
          placeholder={'Use practical examples\nAvoid assuming programming experience'}
        />
        {!proposal && error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        <button
          className="inline-flex items-center gap-2 rounded-md bg-[#A21942] px-4 py-2 font-medium text-white transition-colors hover:bg-[#801333] disabled:cursor-wait disabled:opacity-60"
          disabled={busy !== null}
          type="submit"
        >
          <Sparkles aria-hidden="true" size={16} />
          {busy === 'generate' ? 'Generating proposal…' : 'Generate course proposal'}
        </button>
      </form>

      {proposal && (
        <section className="space-y-5">
          <header>
            <p className="text-sm font-semibold text-[#A21942]">Review and edit</p>
            <h3 className="mt-1 text-xl font-bold text-[#262626]">Course proposal</h3>
          </header>

          <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <TextField
              label="Course title"
              required
              value={proposal.title}
              maxLength={200}
              onChange={(title) => updateProposal((current) => ({ ...current, title }))}
            />
            <TextField
              label="Course description"
              required
              value={proposal.description}
              multiline
              onChange={(description) => updateProposal((current) => ({ ...current, description }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Course access
                <select
                  className={fieldClassName}
                  value={proposal.visibility}
                  onChange={(event) =>
                    updateProposal((current) => ({
                      ...current,
                      visibility: event.target.value as CourseDraftProposal['visibility'],
                    }))
                  }
                >
                  <option value="restricted">Restricted</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Default activity format
                <select
                  className={fieldClassName}
                  value={proposal.default_presentation_format}
                  onChange={(event) =>
                    updateProposal((current) => ({
                      ...current,
                      default_presentation_format: event.target.value as CoursePresentationFormat,
                    }))
                  }
                >
                  {formats.map((format) => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <TextField
              label="Course overview"
              required
              value={proposal.plan.overview}
              multiline
              onChange={(overview) =>
                updateProposal((current) => ({
                  ...current,
                  plan: { ...current.plan, overview },
                }))
              }
            />
            <TextField
              label="Target audience"
              required
              value={proposal.plan.target_audience}
              onChange={(target_audience) =>
                updateProposal((current) => ({
                  ...current,
                  plan: { ...current.plan, target_audience },
                }))
              }
            />
            <StringListField
              label="Learning outcomes"
              required
              values={proposal.plan.learning_outcomes}
              onChange={(learning_outcomes) =>
                updateProposal((current) => ({
                  ...current,
                  plan: { ...current.plan, learning_outcomes },
                }))
              }
            />
            <div className="border-t border-gray-200 pt-5">
              <h4 className="font-semibold text-[#262626]">Modules and lessons</h4>
              <div className="mt-4 space-y-4">
                {proposal.plan.modules.map((module, moduleIndex) => (
                  <article
                    className="space-y-4 rounded-lg border border-gray-200 bg-slate-50 p-4"
                    key={module.module_id}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#A21942]">
                      Module {moduleIndex + 1}
                    </p>
                    <TextField
                      label="Module title"
                      required
                      value={module.title}
                      maxLength={200}
                      onChange={(title) => updateModule(moduleIndex, { title })}
                    />
                    <TextField
                      label="Module description"
                      required
                      value={module.description}
                      multiline
                      onChange={(description) => updateModule(moduleIndex, { description })}
                    />
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4" key={lesson.lesson_id}>
                        <p className="text-sm font-semibold text-gray-700">Lesson {lessonIndex + 1}</p>
                        <TextField
                          label="Lesson title"
                          required
                          value={lesson.title}
                          maxLength={200}
                          onChange={(title) => updateLesson(moduleIndex, lessonIndex, { title })}
                        />
                        <TextField
                          label="Lesson purpose"
                          required
                          value={lesson.purpose}
                          multiline
                          onChange={(purpose) => updateLesson(moduleIndex, lessonIndex, { purpose })}
                        />
                        <StringListField
                          label="Learning objectives"
                          required
                          values={lesson.objectives}
                          onChange={(objectives) => updateLesson(moduleIndex, lessonIndex, { objectives })}
                        />
                        <StringListField
                          label="Key topics"
                          required
                          values={lesson.key_topics}
                          onChange={(key_topics) => updateLesson(moduleIndex, lessonIndex, { key_topics })}
                        />
                        <TextField
                          label="Completion check"
                          required
                          value={lesson.completion_check}
                          multiline
                          onChange={(completion_check) =>
                            updateLesson(moduleIndex, lessonIndex, { completion_check })
                          }
                        />
                        <p className="text-xs text-gray-600">
                          Suggested activity: {lesson.suggested_activity.title} ·{' '}
                          {formatLabel(lesson.suggested_activity.presentation_format)}
                        </p>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            </div>
            <StringListField
              label="Prerequisites"
              values={proposal.plan.prerequisites}
              onChange={(prerequisites) =>
                updateProposal((current) => ({
                  ...current,
                  plan: { ...current.plan, prerequisites },
                }))
              }
            />
            <StringListField
              label="Milestones"
              values={proposal.plan.milestones}
              onChange={(milestones) =>
                updateProposal((current) => ({
                  ...current,
                  plan: { ...current.plan, milestones },
                }))
              }
            />
            <StringListField
              label="Assumptions"
              values={proposal.plan.assumptions}
              onChange={(assumptions) =>
                updateProposal((current) => ({
                  ...current,
                  plan: { ...current.plan, assumptions },
                }))
              }
            />
            <TextField
              label="Capstone"
              required
              value={proposal.plan.capstone}
              multiline
              onChange={(capstone) =>
                updateProposal((current) => ({
                  ...current,
                  plan: { ...current.plan, capstone },
                }))
              }
            />
          </div>

          {notice && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-md border border-[#A21942] px-4 py-2 font-medium text-[#A21942] transition-colors hover:bg-[#A21942]/5 disabled:opacity-60"
              disabled={busy !== null || published}
              onClick={() => void saveDraft()}
              type="button"
            >
              {busy === 'save' ? 'Saving draft…' : 'Save as draft'}
            </button>
            <button
              className="rounded-md bg-[#A21942] px-4 py-2 font-medium text-white transition-colors hover:bg-[#801333] disabled:opacity-60"
              disabled={busy !== null || published}
              onClick={() => void saveAndPublish()}
              type="button"
            >
              {busy === 'publish' ? 'Publishing…' : 'Save and publish'}
            </button>
          </div>
          <p className="text-xs leading-5 text-gray-500">
            Public plans are listed to students in the Student Learning Hub. Restricted plans remain instructor-only. This exposes the outline, not interactive lesson delivery or progress tracking.
          </p>
          {draftId && <p className="text-xs text-gray-500">Course ID: {draftId}</p>}
        </section>
      )}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
  minLength,
  maxLength,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  required?: boolean
  minLength?: number
  maxLength?: number
  placeholder?: string
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {multiline ? (
        <textarea
          className={fieldClassName}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={fieldClassName}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  )
}

function StringListField({
  label,
  values,
  onChange,
  required = false,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  required?: boolean
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label} (one per line)
      <textarea
        className={fieldClassName}
        required={required}
        rows={Math.max(3, values.length)}
        value={values.join('\n')}
        onChange={(event) => onChange(event.target.value.split('\n'))}
        onBlur={() => onChange(values.map((value) => value.trim()).filter(Boolean))}
      />
    </label>
  )
}

function formatLabel(format: CoursePresentationFormat): string {
  return formats.find((option) => option.value === format)?.label ?? format
}
