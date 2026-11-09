"""Static challenge bank for the "Spot the Hallucination" game.

Every AI-authored note hides exactly ONE flaw that any learner can spot with
everyday knowledge — no programming required. The planted flaw is always
absurd or plainly impossible so it is unmistakable. ``flaw_segment`` (0-based
index into ``segments``) and ``flaw_summary`` are the answers: they power the
tap check and the AI judge prompt, so they live on the backend and are never
returned by the player-facing endpoint.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class HallucinationChallenge:
    id: str
    title: str
    emoji: str
    category: str
    scenario: str
    segments: tuple[str, ...]
    flaw_segment: int
    hint_mild: str
    hint_strong: str
    flaw_summary: str

    def to_player_view(self) -> dict:
        """Everything the game UI renders — never includes the answers."""
        return {
            "id": self.id,
            "title": self.title,
            "emoji": self.emoji,
            "category": self.category,
            "scenario": self.scenario,
            "segments": list(self.segments),
            "hint_mild": self.hint_mild,
            "hint_strong": self.hint_strong,
        }


HALLUCINATION_CHALLENGES: tuple[HallucinationChallenge, ...] = (
    HallucinationChallenge(
        id="ncs-01",
        title="The Breakfast Recipe",
        emoji="\U0001F363",
        category="Impossible recipe",
        scenario=(
            "Your AI intern drafted a 10-minute breakfast recipe for the office coffee corner. "
            "Everything looks appetising — except one line that is impossible to do."
        ),
        segments=(
            "Melt a knob of butter in a pan until it bubbles.",
            "Crack in two eggs and scramble them for a minute.",
            "Top with a handful of fresh cherry tomatoes.",
            "Fold in a spoonful of peanut butter, then pour in half a cup of milk and drink.",
        ),
        flaw_segment=3,
        hint_mild="AI sounds confident about recipes, but not every combination you could mix is something you'd actually serve.",
        hint_strong="Read that last line again. Would you really pour peanut butter and cold milk together into a pan, then drink it?",
        flaw_summary=(
            "Line 4 is absurd: it tells you to fold peanut butter into scrambled eggs and then "
            "pour in milk and drink the pan. No sensible breakfast combines peanut butter and "
            "soured, lumpy egg-milk into a drink — the AI invented a step that simply cannot be "
            "right."
        ),
    ),
    HallucinationChallenge(
        id="ncs-02",
        title="The Morning Weather Forecast",
        emoji="\U0001F326",
        category="Impossible forecast",
        scenario=(
            "Your AI intern drafted tomorrow's weather forecast for the company newsletter. It "
            "reads like a proper forecast — but one line could never actually happen."
        ),
        segments=(
            "Expect light rain before 9 AM, clearing to sunny skies by lunch.",
            "High temperature of 24°C, with a light breeze from the west.",
            "Sunrise at 2:00 PM, sunset at 8:00 AM.",
            "Ultraviolet index of 5 — wear sunscreen if you will be outside after noon.",
        ),
        flaw_segment=2,
        hint_mild="Forecasts are usually written in a calm, factual tone — but does every line actually make sense?",
        hint_strong="Read line 3 twice. Which of the two events is written to come first, and how does that feel?",
        flaw_summary=(
            "Line 3 says the sun rises at 2:00 PM and sets at 8:00 AM — but the sun cannot set "
            "before it rises, and a 2 PM sunrise never happens. The AI swapped the order and "
            "wrote times that are simply impossible."
        ),
    ),
    HallucinationChallenge(
        id="ncs-03",
        title="The City Travel Guide",
        emoji="\U0001F3DB",
        category="Made-up fact",
        scenario=(
            "Your AI intern wrote a short guide to a famous landmark for the visitors' blog. It "
            "sounds knowledgeable — until one detail is completely made up."
        ),
        segments=(
            "The landmark was completed in the 1880s and has welcomed millions of visitors since.",
            "You can take a lift to the top terrace for a view of the whole city.",
            "On clear days, the terrace offers a 360-degree panorama of the skyline.",
            "The entire tower is built from loose glass marbles and stands on no foundation at all.",
        ),
        flaw_segment=3,
        hint_mild="Guides love to add impressive-sounding details, but not every detail is physically possible.",
        hint_strong="A tower made of loose glass marbles, with nothing underneath it? Could that really stand up?",
        flaw_summary=(
            "Line 4 is nonsense: a tower cannot be built from loose glass marbles and have no "
            "foundation — it would collapse straight away. The AI invented a physically "
            "impossible “fact” and presented it as if it were true."
        ),
    ),
    HallucinationChallenge(
        id="ncs-04",
        title="The AI Health Coach",
        emoji="\U0001F4AA",
        category="Bad advice",
        scenario=(
            "Your AI intern wrote a short “stay healthy” tip sheet for the staff noticeboard. "
            "Most of it is reasonable — but one tip is the opposite of good sense."
        ),
        segments=(
            "Aim for around eight hours of sleep each night.",
            "Take a short walk after lunch to keep your energy up.",
            "Drink two litres of fizzy soda every day to stay hydrated.",
            "Put on sunscreen before you spend the afternoon outdoors.",
        ),
        flaw_segment=2,
        hint_mild="Health tips should make sense of your body — does every one of these actually help you?",
        hint_strong="Line 3 suggests hydrating with soda. How much sugar is really in two litres of it?",
        flaw_summary=(
            "Line 3 is absurd: two litres of fizzy soda a day is loaded with sugar and is the "
            "opposite of healthy hydration — you would recommend water instead. The AI gave "
            "dangerous “advice” that sounds casual but is plainly wrong."
        ),
    ),
)


def find_challenge(challenge_id: str) -> HallucinationChallenge | None:
    for challenge in HALLUCINATION_CHALLENGES:
        if challenge.id == challenge_id:
            return challenge
    return None

