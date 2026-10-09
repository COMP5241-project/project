"""Static challenge bank for the "Spot the Hallucination" game.

Every snippet hides exactly ONE flaw that a non-CS student can spot with
common sense — no programming knowledge required. ``flaw_line`` (0-based
index into ``code``) and ``flaw_summary`` are the answers: they power the
line-tap check and the AI judge prompt, so they live on the backend and are
never returned by the player-facing endpoint.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class HallucinationChallenge:
    id: str
    title: str
    emoji: str
    language: str
    category: str
    scenario: str
    code: tuple[str, ...]
    flaw_line: int
    hint_mild: str
    hint_strong: str
    flaw_summary: str

    def to_player_view(self) -> dict:
        """Everything the game UI renders — never includes the answers."""
        return {
            "id": self.id,
            "title": self.title,
            "emoji": self.emoji,
            "language": self.language,
            "category": self.category,
            "scenario": self.scenario,
            "code": list(self.code),
            "hint_mild": self.hint_mild,
            "hint_strong": self.hint_strong,
        }


HALLUCINATION_CHALLENGES: tuple[HallucinationChallenge, ...] = (
    HallucinationChallenge(
        id="ncs-01",
        title="The Time-Travel Booking App",
        emoji="\U0001F4C5",
        language="Python",
        category="Hallucinated API",
        scenario=(
            "Your AI intern was asked to schedule the project kickoff. It proudly handed you "
            "this script and insists the function it calls is “standard Python”."
        ),
        code=(
            "# AI intern draft v1 - meeting scheduler",
            "import calendar",
            "",
            "def schedule_kickoff(year, month):",
            '    calendar.set_month_name(month, "Launch Month")',
            '    event_date = f"{year}-{month}-03"',
            '    print("Kickoff scheduled for", event_date)',
            "    return event_date",
        ),
        flaw_line=4,
        hint_mild="AI models sound confident, but not every function they write actually exists.",
        hint_strong="Look at what the calendar module is being asked to do. Can a calendar really rename a month?",
        flaw_summary=(
            "calendar.set_month_name() does not exist in Python’s calendar module — the AI "
            "hallucinated this function. The script crashes immediately and the meeting never "
            "gets scheduled."
        ),
    ),
    HallucinationChallenge(
        id="ncs-02",
        title="The Weather Bot With Amnesia",
        emoji="\U0001F326️",
        language="Python",
        category="Missing parameter",
        scenario=(
            "Your AI intern built a weather bot. Ask it about Tokyo, Paris or your own street "
            "— it gives the exact same confident answer every time."
        ),
        code=(
            "# AI intern draft v1 - weather bot",
            "import requests",
            "",
            "def get_weather(city):",
            '    response = requests.get("https://api.weather.example/current")',
            "    data = response.json()",
            '    return f"{city}: {data[\'temperature\']}°C and {data[\'summary\']}"',
        ),
        flaw_line=4,
        hint_mild="Watch what the bot actually does with the city you give it.",
        hint_strong=(
            "The web address it calls is always identical — the requested city (and any API "
            "key) never appear in it."
        ),
        flaw_summary=(
            "The request never includes the requested city (or any API key), so the bot "
            "fetches the same data no matter which city is asked about. Every city gets the "
            "same “forecast”."
        ),
    ),
    HallucinationChallenge(
        id="ncs-03",
        title="The Playlist That Skips Your Favourite Song",
        emoji="\U0001F3B5",
        language="Python",
        category="Off-by-one error",
        scenario=(
            "Your AI intern wrote the player for your 5-song workout playlist. Every workout "
            "ends one song early and you can’t figure out why."
        ),
        code=(
            "# AI intern draft v1 - playlist player",
            'playlist = ["Sunrise", "Neon Lights", "Ocean Drive", "Midnight Run", "Encore"]',
            "",
            "def play_all_songs(songs):",
            "    for index in range(len(songs) - 1):",
            '        print("Now playing:", songs[index])',
            "",
            "play_all_songs(playlist)",
        ),
        flaw_line=4,
        hint_mild="Count the songs in the list, then count how many actually get played.",
        hint_strong="range(len(songs) - 1) counts up to one less than the number of songs.",
        flaw_summary=(
            "Off-by-one error: range(len(songs) - 1) loops one time too few, so the final song "
            "(“Encore”) is silently skipped and never plays."
        ),
    ),
    HallucinationChallenge(
        id="ncs-04",
        title="The Chatbot That Overshares",
        emoji="\U0001F910",
        language="Python",
        category="Privacy leak",
        scenario=(
            "Your AI intern built a study-buddy chatbot. Users love it — until one of them "
            "reads something that was never written for them."
        ),
        code=(
            "# AI intern draft v1 - study buddy chatbot",
            'last_user_note = "I am really nervous about my exam tomorrow..."',
            "",
            "def greet_new_user(name):",
            '    print("Hello " + name + ", welcome to Study Buddy!")',
            '    print("A previous user wrote: " + last_user_note)',
            '    return "session started"',
        ),
        flaw_line=5,
        hint_mild="Think about who exactly can read the message this bot prints.",
        hint_strong="Would you be happy if a stranger read your private diary entry out loud?",
        flaw_summary=(
            "Privacy leak: the bot prints the previous user’s private note to every new user. "
            "One user’s personal data must never be shown to someone else."
        ),
    ),
)


def find_challenge(challenge_id: str) -> HallucinationChallenge | None:
    for challenge in HALLUCINATION_CHALLENGES:
        if challenge.id == challenge_id:
            return challenge
    return None

