/**
 * Static challenge bank for the "Spot the Hallucination" game. Every snippet
 * hides exactly ONE flaw that a non-CS student can spot with common sense —
 * no programming knowledge required. `flawLine` (0-based index into `code`)
 * and `flawSummary` are never shown to the student; they power the local
 * line-tap check and the AI judge prompt respectively.
 */
export interface HallucinationChallenge {
  id: string
  title: string
  emoji: string
  language: string
  category: string
  scenario: string
  code: string[]
  flawLine: number
  hintMild: string
  hintStrong: string
  flawSummary: string
}

export const HALLUCINATION_CHALLENGES: HallucinationChallenge[] = [
  {
    id: 'ncs-01',
    title: 'The Time-Travel Booking App',
    emoji: '📅',
    language: 'Python',
    category: 'Hallucinated API',
    scenario:
      'Your AI intern was asked to schedule the project kickoff. It proudly handed you this script and insists the function it calls is “standard Python”.',
    code: [
      '# AI intern draft v1 - meeting scheduler',
      'import calendar',
      '',
      'def schedule_kickoff(year, month):',
      '    calendar.set_month_name(month, "Launch Month")',
      '    event_date = f"{year}-{month}-03"',
      '    print("Kickoff scheduled for", event_date)',
      '    return event_date',
    ],
    flawLine: 4,
    hintMild: 'AI models sound confident, but not every function they write actually exists.',
    hintStrong:
      'Look at what the calendar module is being asked to do. Can a calendar really rename a month?',
    flawSummary:
      'calendar.set_month_name() does not exist in Python’s calendar module — the AI hallucinated this function. The script crashes immediately and the meeting never gets scheduled.',
  },
  {
    id: 'ncs-02',
    title: 'The Weather Bot With Amnesia',
    emoji: '🌦️',
    language: 'Python',
    category: 'Missing parameter',
    scenario:
      'Your AI intern built a weather bot. Ask it about Tokyo, Paris or your own street — it gives the exact same confident answer every time.',
    code: [
      '# AI intern draft v1 - weather bot',
      'import requests',
      '',
      'def get_weather(city):',
      '    response = requests.get("https://api.weather.example/current")',
      '    data = response.json()',
      `    return f"{city}: {data['temperature']}°C and {data['summary']}"`,
    ],
    flawLine: 4,
    hintMild: 'Watch what the bot actually does with the city you give it.',
    hintStrong:
      'The web address it calls is always identical — the requested city (and any API key) never appear in it.',
    flawSummary:
      'The request never includes the requested city (or any API key), so the bot fetches the same data no matter which city is asked about. Every city gets the same “forecast”.',
  },
  {
    id: 'ncs-03',
    title: 'The Playlist That Skips Your Favourite Song',
    emoji: '🎵',
    language: 'Python',
    category: 'Off-by-one error',
    scenario:
      'Your AI intern wrote the player for your 5-song workout playlist. Every workout ends one song early and you can’t figure out why.',
    code: [
      '# AI intern draft v1 - playlist player',
      'playlist = ["Sunrise", "Neon Lights", "Ocean Drive", "Midnight Run", "Encore"]',
      '',
      'def play_all_songs(songs):',
      '    for index in range(len(songs) - 1):',
      '        print("Now playing:", songs[index])',
      '',
      'play_all_songs(playlist)',
    ],
    flawLine: 4,
    hintMild: 'Count the songs in the list, then count how many actually get played.',
    hintStrong: 'range(len(songs) - 1) counts up to one less than the number of songs.',
    flawSummary:
      'Off-by-one error: range(len(songs) - 1) loops one time too few, so the final song (“Encore”) is silently skipped and never plays.',
  },
  {
    id: 'ncs-04',
    title: 'The Chatbot That Overshares',
    emoji: '🤐',
    language: 'Python',
    category: 'Privacy leak',
    scenario:
      'Your AI intern built a study-buddy chatbot. Users love it — until one of them reads something that was never written for them.',
    code: [
      '# AI intern draft v1 - study buddy chatbot',
      'last_user_note = "I am really nervous about my exam tomorrow..."',
      '',
      'def greet_new_user(name):',
      '    print("Hello " + name + ", welcome to Study Buddy!")',
      '    print("A previous user wrote: " + last_user_note)',
      '    return "session started"',
    ],
    flawLine: 5,
    hintMild: 'Think about who exactly can read the message this bot prints.',
    hintStrong: 'Would you be happy if a stranger read your private diary entry out loud?',
    flawSummary:
      'Privacy leak: the bot prints the previous user’s private note to every new user. One user’s personal data must never be shown to someone else.',
  },
]
