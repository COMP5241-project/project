const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY

/** True when the OpenRouter API key environment variable is present. */
export const isOpenRouterConfigured = openRouterApiKey !== undefined && openRouterApiKey !== ''

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Shared OpenRouter client used by every AI-powered feature (currently the
 * "Spot the Hallucination" judge; later the instructor course generator).
 * Uses the public key from `.env`, matching the existing prototype pattern —
 * acceptable for this course project, but the key is visible to clients.
 */
export async function fetchOpenRouterChat(
  messages: ChatMessage[],
  model: string,
): Promise<string> {
  if (!openRouterApiKey) {
    throw new Error(
      'The OpenRouter API key is missing. Set VITE_OPENROUTER_API_KEY in your .env file.',
    )
  }

  let response: Response
  try {
    response = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages }),
    })
  } catch {
    throw new Error(
      'Unable to reach the AI tutor service. Check your internet connection and try again.',
    )
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    let upstreamMessage = ''
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: unknown } }
      if (typeof parsed.error?.message === 'string' && parsed.error.message.trim() !== '') {
        upstreamMessage = parsed.error.message.trim()
      }
    } catch {
      // Non-JSON error body — fall through with the status-only message.
    }
    throw new Error(
      `The AI tutor service returned an error (${response.status})${
        upstreamMessage ? `: ${upstreamMessage}` : ''
      }. Please try again in a moment.`,
    )
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[]
  }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('The AI tutor returned an empty response. Please try again.')
  }
  return content
}
