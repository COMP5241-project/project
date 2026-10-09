import { fetchOpenRouterChat } from '../openrouter'
import type { HallucinationChallenge } from './challenges'

/**
 * Grading model — one call per submission keeps the game cheap. Defaults to a
 * free-tier OpenRouter model (paid models return 403 on credit-less keys) and
 * can be overridden with `VITE_OPENROUTER_MODEL` in `.env`.
 */
export const JUDGE_MODEL =
  import.meta.env.VITE_OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free'

export type DiscernmentRating = 'novice' | 'developing' | 'sharp'

export interface JudgeVerdict {
  score: number
  rating: DiscernmentRating
  identified: string[]
  missed: string[]
  feedback: string
}

/**
 * Grades a student's critique against the challenge's hidden flaw list with a
 * single OpenRouter call. The judge is instructed to reward plain-language
 * explanations (most players are non-CS) and to reject invented problems.
 */
export async function judgeCritique(
  challenge: HallucinationChallenge,
  critique: string,
  tappedCorrectLine: boolean,
): Promise<JudgeVerdict> {
  const numberedCode = challenge.code.map((line, index) => `${index + 1}: ${line}`).join('\n')

  const systemPrompt = `You are a friendly but fair grader for "Spot the Hallucination", a code-review game for university students. Many players have NO programming background.

The student was shown this ${challenge.language} snippet:
${numberedCode}

The ONE real flaw in this snippet is on line ${challenge.flawLine + 1}:
${challenge.flawSummary}

${
  tappedCorrectLine
    ? 'The student correctly tapped this line as suspicious before writing their critique.'
    : 'The student tapped a different line before writing their critique.'
}

Grade the critique in the user message. Rules:
- Reward correctly identifying the flaw and explaining its real-world consequence.
- Plain-language explanations earn full credit; never require technical jargon.
- Do not reward claims about problems that do not exist in the snippet.
- Keep feedback encouraging, specific, and addressed directly to the student.

Respond with ONLY a JSON object - no markdown fences, no commentary - exactly in this shape:
{"score": <integer 0-100>, "rating": "novice" | "developing" | "sharp", "identified": ["<flaw points the student caught>"], "missed": ["<important points they did not mention>"], "feedback": "<2-3 encouraging sentences>"}`

  const raw = await fetchOpenRouterChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: critique },
    ],
    JUDGE_MODEL,
  )

  return parseVerdict(raw)
}

/** Defensive parser: tolerates stray text around the JSON and missing fields. */
function parseVerdict(raw: string): JudgeVerdict {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end <= start) {
      throw new Error('The AI tutor returned an unreadable verdict. Please try again.')
    }
    try {
      parsed = JSON.parse(raw.slice(start, end + 1))
    } catch {
      throw new Error('The AI tutor returned an unreadable verdict. Please try again.')
    }
  }

  const record = parsed as Record<string, unknown>
  const rawScore = typeof record.score === 'number' ? record.score : Number(record.score)
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0
  const rating: DiscernmentRating =
    record.rating === 'sharp' || record.rating === 'developing' || record.rating === 'novice'
      ? record.rating
      : score >= 75
        ? 'sharp'
        : score >= 45
          ? 'developing'
          : 'novice'

  return {
    score,
    rating,
    identified: toStringArray(record.identified),
    missed: toStringArray(record.missed),
    feedback:
      typeof record.feedback === 'string' && record.feedback.trim() !== ''
        ? record.feedback.trim()
        : 'Good effort — compare your critique with the revealed flaw, then try the next challenge.',
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string' || typeof item === 'number')
    .map((item) => String(item).trim())
    .filter((item) => item !== '')
    .slice(0, 5)
}
