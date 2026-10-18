"""Static content bank for the sample mini-course.

"Fundamentals of AI-Assisted Software Engineering" is the public preview
course linked from the landing page. Answer keys (decision correctness,
quiz correct indices/explanations, bot input kinds/lessons, tutor rubrics)
power the server-checked endpoints and are never included in the
player-facing view — the same pattern as the Spot-the-Hallucination bank.
"""
from dataclasses import dataclass
from typing import Literal

BotKind = Literal["success", "near_miss", "flaw"]


@dataclass(frozen=True)
class DecisionOption:
    id: str
    text: str
    correct: bool
    feedback: str

    def to_player_view(self) -> dict:
        return {"id": self.id, "text": self.text}


@dataclass(frozen=True)
class Decision:
    id: str
    scenario: str
    question: str
    options: tuple[DecisionOption, ...]

    def to_player_view(self) -> dict:
        return {
            "id": self.id,
            "scenario": self.scenario,
            "question": self.question,
            "options": [option.to_player_view() for option in self.options],
        }


@dataclass(frozen=True)
class CourseSlide:
    id: str
    title: str
    bullets: tuple[str, ...]
    steps: tuple[str, ...]

    def to_player_view(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "bullets": list(self.bullets),
            "steps": list(self.steps),
        }


@dataclass(frozen=True)
class QuizQuestion:
    id: str
    question: str
    options: tuple[str, ...]
    correct_index: int
    explanation: str

    def to_player_view(self) -> dict:
        # correct_index and explanation stay server-side until the
        # student commits an answer through POST /answer.
        return {"id": self.id, "question": self.question, "options": list(self.options)}


@dataclass(frozen=True)
class PromptCompare:
    id: str
    story: str
    vague_prompt: str
    precise_prompt: str
    vague_outcome: str
    precise_outcome: str
    task: str

    def to_player_view(self) -> dict:
        return {
            "id": self.id,
            "story": self.story,
            "vague_prompt": self.vague_prompt,
            "precise_prompt": self.precise_prompt,
            "vague_outcome": self.vague_outcome,
            "precise_outcome": self.precise_outcome,
            "task": self.task,
        }


@dataclass(frozen=True)
class BotInput:
    id: str
    label: str
    emoji: str
    kind: BotKind
    reaction: str
    lesson: str | None = None

    def to_player_view(self) -> dict:
        # Only the tray chip ships to the browser; kind/reaction/lesson are
        # revealed by POST /answer after the player commits the input.
        return {"id": self.id, "label": self.label, "emoji": self.emoji}


@dataclass(frozen=True)
class BotGame:
    moment_id: str
    title: str
    intro: str
    attempts: int
    flaws_total: int
    inputs: tuple[BotInput, ...]
    win_title: str
    win_message: str
    lesson_lines: tuple[str, ...]
    teaser: str

    def to_player_view(self) -> dict:
        return {
            "moment_id": self.moment_id,
            "title": self.title,
            "intro": self.intro,
            "attempts": self.attempts,
            "flaws_total": self.flaws_total,
            "inputs": [bot_input.to_player_view() for bot_input in self.inputs],
            "win_title": self.win_title,
            "win_message": self.win_message,
            "lesson_lines": list(self.lesson_lines),
            "teaser": self.teaser,
        }


@dataclass(frozen=True)
class Reflection:
    id: str
    prompt: str

    def to_player_view(self) -> dict:
        return {"id": self.id, "prompt": self.prompt}


@dataclass(frozen=True)
class TutorMoment:
    id: str
    system_prompt: str
    key_points: tuple[str, ...]


COURSE_TITLE = "Fundamentals of AI-Assisted Software Engineering"
COURSE_TAGLINE = (
    "Go from a fuzzy idea to a working prototype. Learn how to brief AI well, "
    "shape what it makes, and check it like a pro."
)
COURSE_MINUTES = "≈ 20 min"

DECISIONS: tuple[Decision, ...] = (
    Decision(
        id="sim-1",
        scenario=(
            "You and two friends have an idea: a campus lost-and-found app. Your friend Leo "
            "is already opening his laptop: “Let's just get AI to write it tonight!”"
        ),
        question="What's the best first step?",
        options=(
            DecisionOption(
                id="sim-1-gen",
                text="Have the AI generate the whole app right away",
                correct=False,
                feedback=(
                    "You can generate something fast — but nobody has agreed what the app "
                    "should even do. Fast in the wrong direction is still wrong."
                ),
            ),
            DecisionOption(
                id="sim-1-reqs",
                text="Write down who the app is for and what problem it solves",
                correct=True,
                feedback=(
                    "Exactly. Requirements first: users, problem, must-have features. Every "
                    "later decision — including what you ask the AI — gets easier from here."
                ),
            ),
            DecisionOption(
                id="sim-1-framework",
                text="Pick the trendiest framework so it looks impressive",
                correct=False,
                feedback=(
                    "Tools come after you know what you're building. A trendy framework "
                    "can't rescue an unclear idea."
                ),
            ),
        ),
    ),
    Decision(
        id="sim-2",
        scenario=(
            "You described the idea carefully, and the AI produced a first working draft "
            "of the app. It even looks plausible."
        ),
        question="Now what?",
        options=(
            DecisionOption(
                id="sim-2-ship",
                text="Ship it — AI doesn't make mistakes",
                correct=False,
                feedback=(
                    "AI output can look right and still hide bugs or security holes. Shipping "
                    "without checking is how broken apps meet real users."
                ),
            ),
            DecisionOption(
                id="sim-2-review",
                text="Review the output and test the main flows yourself",
                correct=True,
                feedback=(
                    "Yes. AI drafts, you verify. Try the important flows — report an item, "
                    "search, contact the finder — before anyone else does."
                ),
            ),
            DecisionOption(
                id="sim-2-regen",
                text="Keep regenerating until the code looks pretty",
                correct=False,
                feedback=(
                    "Pretty isn't correct. Re-rolling forever burns time; review and test the "
                    "draft you have instead."
                ),
            ),
        ),
    ),
    Decision(
        id="sim-3",
        scenario=(
            "A week after launch, a student reports: photos of found items never show up. "
            "Your team looks at you."
        ),
        question="What's the strongest response?",
        options=(
            DecisionOption(
                id="sim-3-fix",
                text="Fix the bug and add a test so it can't silently come back",
                correct=True,
                feedback=(
                    "Right. Fix it, then lock it in with a test — that's how teams keep "
                    "quality up as software grows."
                ),
            ),
            DecisionOption(
                id="sim-3-wait",
                text="Wait and see if more people complain first",
                correct=False,
                feedback=(
                    "Every day it stays broken, more students lose their stuff. Known bugs "
                    "deserve prompt fixes, not popularity contests."
                ),
            ),
            DecisionOption(
                id="sim-3-rewrite",
                text="Have the AI rebuild the whole app from scratch",
                correct=False,
                feedback=(
                    "A rewrite throws working software away for one bug. A targeted fix "
                    "plus a regression test is cheaper and safer."
                ),
            ),
        ),
    ),
)

SLIDES: tuple[CourseSlide, ...] = (
    CourseSlide(
        id="slide-1",
        title="Code is becoming a conversation",
        bullets=(
            "Developers now describe what they want in plain language — and AI writes a first draft of the code.",
            "Most professional developers already use AI tools weekly, and people with zero coding background have shipped full apps in days.",
            "The scarce skill is no longer typing syntax — it's saying what you mean.",
        ),
        steps=("Describe", "Generate", "Review"),
    ),
    CourseSlide(
        id="slide-2",
        title="Vibe coding vs. structured AI coding",
        bullets=(
            "Vibe coding: throw ideas at the AI, accept whatever comes back, fix errors by pasting them in. Great for throwaway experiments.",
            "Structured AI coding: clear spec → AI draft → human review → tests. Slower, but this is how real products get built.",
            "Same tools, opposite habits. The habit you pick decides whether AI helps you or haunts you later.",
        ),
        steps=("Spec", "Draft", "Review", "Test"),
    ),
    CourseSlide(
        id="slide-3",
        title="How coding agents actually work",
        bullets=(
            "A coding agent follows a loop: read your brief → plan → write code → run it → fix what broke → repeat.",
            "Agents can open files, run commands, and search for context — but they can only work with what you give them.",
            "Thin brief in, thin result out. Rich context in, useful result out.",
        ),
        steps=("Brief", "Plan", "Code", "Run", "Iterate"),
    ),
    CourseSlide(
        id="slide-4",
        title="What AI confidently gets wrong",
        bullets=(
            "Hallucinated APIs: functions and libraries that don't exist, described with total confidence.",
            "Missing parameters and off-by-one errors: logic that almost works.",
            "Security holes: hardcoded secrets, unchecked input, missing validation.",
            "A confident tone is not evidence. Check it, run it, test it.",
        ),
        steps=("Confident output", "Human check"),
    ),
    CourseSlide(
        id="slide-5",
        title="Your job: define, review, own it",
        bullets=(
            "Delegation: decide what to hand to AI and what needs your judgement.",
            "Description: brief it with goals, context, and constraints.",
            "Discernment: question and improve what comes back.",
            "Diligence: verify the result and own the outcome.",
        ),
        steps=("Delegate", "Describe", "Discern", "Diligence"),
    ),
)

QUIZ: tuple[QuizQuestion, ...] = (
    QuizQuestion(
        id="quiz-1",
        question=(
            "Your teammate says: “I had AI write the code and never read it — it works on my "
            "machine!” What's the biggest risk?"
        ),
        options=(
            "AI-written code can't run on other machines",
            "Unreviewed code can hide bugs or security holes that only show up later",
            "The AI company now owns the app",
            "Reading code voids the AI's warranty",
        ),
        correct_index=1,
        explanation=(
            "AI code often looks right but fails on edge cases or hides vulnerabilities. "
            "Running once on one machine isn't verification — review and testing are the "
            "human part of the loop."
        ),
    ),
    QuizQuestion(
        id="quiz-2",
        question="Which request is most likely to get a useful result from an AI coding agent?",
        options=(
            "“Build me an app”",
            "“Build a study-room booking page: students pick a date, time slot, and room; no double bookings; must work on phones”",
            "“Make something cool for the library”",
            "“Write good code quickly”",
        ),
        correct_index=1,
        explanation=(
            "Goal + context + constraints = better output. The more precisely you describe "
            "what “done” means, the less the AI has to guess — and guessing is where bugs "
            "are born."
        ),
    ),
    QuizQuestion(
        id="quiz-3",
        question=(
            "The AI confidently calls a function that doesn't exist in any library. This is "
            "called…"
        ),
        options=(
            "A syntax error",
            "A hallucination",
            "Refactoring",
            "A version conflict",
        ),
        correct_index=1,
        explanation=(
            "Language models can invent APIs that sound plausible but don't exist. That's "
            "exactly why discernment — verifying what AI gives you — is a core skill."
        ),
    ),
)

PROMPT_COMPARE = PromptCompare(
    id="prompt-compare",
    story=(
        "A designer asked an AI animation tool for a short clip for a class demo. Here's what "
        "they typed — and the two very different results."
    ),
    vague_prompt="Make a whip animation with a bicycle and a person",
    precise_prompt=(
        "Make a short 2D animation: a person rides a bicycle left to right across the screen, "
        "swinging a whip forward with their right hand. The person sits on top of the bicycle, "
        "and the bicycle is never above the person."
    ),
    vague_outcome=(
        "The tool produced a bicycle riding on top of a person while whipping them. Technically "
        "“a whip animation with a bicycle and a person” — just not what anyone wanted."
    ),
    precise_outcome=(
        "The tool produced exactly the intended clip: rider on the bike, whip swinging forward, "
        "nothing ambiguous about who rides what."
    ),
    task="In 1–2 sentences: what did the precise prompt do better than the vague one?",
)

BOT_GAME = BotGame(
    moment_id="bot",
    title="Break the Bot",
    intro=(
        "Team Alpha shipped WOKbot, the campus canteen pre-order bot. “It's 100% ready,” they "
        "say. You're the tester. Find the flaws before 3,000 hungry students do."
    ),
    attempts=8,
    flaws_total=2,
    inputs=(
        BotInput(
            id="ok-rice",
            label="1× roast duck rice, pickup 12:30",
            emoji="\U0001F35A",
            kind="success",
            reaction="Order #A12 confirmed! See you at the canteen at 12:30. \U0001F514",
        ),
        BotInput(
            id="ok-noodles",
            label="2× wonton noodles, no spring onion",
            emoji="\U0001F35C",
            kind="success",
            reaction="Order #A13 confirmed — no spring onion, noted like a true professional. \U0001FAE1",
        ),
        BotInput(
            id="flaw-empty",
            label="(send an empty order)",
            emoji="\U0001FAD9",
            kind="flaw",
            reaction=(
                "WOKbot happily accepted an order of nothing and printed a $0.00 receipt. The "
                "kitchen received a blank ticket and briefly considered serving it."
            ),
            lesson="WOKbot never validates empty input — an order of nothing is still an order.",
        ),
        BotInput(
            id="flaw-negative",
            label="-3× dumplings",
            emoji="\U0001F95F",
            kind="flaw",
            reaction=(
                "WOKbot accepted −3 dumplings and “refunded” $18 to a card it never charged. "
                "Finance has questions. Many questions."
            ),
            lesson="Quantities are never checked for negative or boundary values.",
        ),
        BotInput(
            id="near-999",
            label="999× bubble tea",
            emoji="\U0001F9CB",
            kind="near_miss",
            reaction=(
                "Accepted. WOKbot is now preparing 999 cups. The canteen is 40% bubble. It "
                "survived — but is this really what you ordered?"
            ),
        ),
        BotInput(
            id="near-emoji",
            label="\U0001F35C\U0001F35C\U0001F35C\U0001F35C",
            emoji="\U0001F3A8",
            kind="near_miss",
            reaction=(
                "Interpreting… WOKbot guessed “four mystery soups” and charged $52. Whether "
                "that's a bug or modern art is above our pay grade."
            ),
        ),
        BotInput(
            id="near-sql",
            label="1× rice; DROP TABLE orders;",
            emoji="\U0001F6E2️",
            kind="near_miss",
            reaction=(
                "Nice try. SQL is not on the menu — WOKbot escaped the input and added "
                "“suspicious” to your order notes. \U0001F6E1️"
            ),
        ),
        BotInput(
            id="near-yesterday",
            label="“Same as yesterday”",
            emoji="\U0001F501",
            kind="near_miss",
            reaction=(
                "WOKbot has the memory of a goldfish. It sent “???” to the kitchen and hopes "
                "nobody noticed."
            ),
        ),
    ),
    win_title="You think like a tester! \U0001F389",
    win_message="Two real flaws found before launch. Team Alpha owes you a bubble tea.",
    lesson_lines=(
        "Happy path: normal input, normal result — easy to test, easy to forget it's only half the story.",
        "Edge cases: empty, huge, negative, weird — the inputs nobody planned for are the ones users find first.",
        "Testing isn't about proving software works. It's about finding where it doesn't — before your users do.",
    ),
    teaser=(
        "Meet WOKbot's cousins in COMP5241 Chapter 5 (Software Testing) and the 23-scene "
        "comedy “Testers & the Bar”."
    ),
)

REFLECTION = Reflection(
    id="reflection",
    prompt=(
        "Last one. In 1–2 sentences: what will you do differently next time you build "
        "something with AI?"
    ),
)

TUTOR_MOMENTS: tuple[TutorMoment, ...] = (
    TutorMoment(
        id="prompt-compare",
        system_prompt=(
            "You are a friendly tutor for a sample mini-course on AI-assisted software "
            "engineering. The student just compared two prompts given to an AI animation tool.\n\n"
            f"Vague prompt: {PROMPT_COMPARE.vague_prompt}\n"
            f"Precise prompt: {PROMPT_COMPARE.precise_prompt}\n\n"
            "The precise prompt is better because it (1) names the roles and relationships - "
            "the person rides the bicycle, not the other way around, (2) specifies the actions, "
            "direction, and which hand does what, and (3) adds constraints that rule out wrong "
            "interpretations.\n\n"
            "Grade the student's short explanation of what the precise prompt did better. "
            "Rules:\n"
            "- Reward any genuine recognition that precision (roles, actions, constraints) "
            "removes ambiguity.\n"
            "- Plain-language answers earn full credit; never require technical jargon.\n"
            "- Do not reward claims unrelated to the two prompts shown.\n"
            "- Keep feedback encouraging, specific, and addressed directly to the student.\n\n"
            "Respond with ONLY a JSON object - no markdown fences, no commentary - exactly in "
            'this shape:\n{"score": <integer 0-100>, "feedback": "<2-3 encouraging sentences>"}'
        ),
        key_points=(
            "It names the roles and relationships: the person rides the bicycle — not the other way around.",
            "It specifies the actions, direction, and which hand does what.",
            "It adds constraints that rule out wrong interpretations.",
        ),
    ),
    TutorMoment(
        id="reflection",
        system_prompt=(
            "You are a friendly tutor for a sample mini-course on AI-assisted software "
            "engineering. The course covered: writing requirements before generating code, "
            "reviewing and testing AI output instead of shipping it unread, prompting with "
            "goals/context/constraints, and hunting edge cases like a tester.\n\n"
            "Grade the student's short reflection on what they will do differently next time "
            "they build something with AI. Rules:\n"
            "- Reward any concrete takeaway aligned with those themes (specifying, reviewing, "
            "testing, iterating, keeping humans accountable).\n"
            "- Personal, plain-language phrasing earns full credit; never require jargon.\n"
            "- Keep feedback encouraging, specific, and addressed directly to the student.\n\n"
            "Respond with ONLY a JSON object - no markdown fences, no commentary - exactly in "
            'this shape:\n{"score": <integer 0-100>, "feedback": "<2-3 encouraging sentences>"}'
        ),
        key_points=(
            "Describe goals, context, and constraints before generating.",
            "Review and test what AI returns — never ship unread.",
            "Treat AI output as a first draft, not a finished product.",
        ),
    ),
)


@dataclass(frozen=True)
class SampleCourse:
    title: str
    tagline: str
    minutes: str
    decisions: tuple[Decision, ...]
    slides: tuple[CourseSlide, ...]
    quiz: tuple[QuizQuestion, ...]
    prompt_compare: PromptCompare
    bot: BotGame
    reflection: Reflection


SAMPLE_COURSE = SampleCourse(
    title=COURSE_TITLE,
    tagline=COURSE_TAGLINE,
    minutes=COURSE_MINUTES,
    decisions=DECISIONS,
    slides=SLIDES,
    quiz=QUIZ,
    prompt_compare=PROMPT_COMPARE,
    bot=BOT_GAME,
    reflection=REFLECTION,
)

AnswerMoment = (
    tuple[Literal["decision"], Decision]
    | tuple[Literal["quiz"], QuizQuestion]
    | tuple[Literal["bot"], BotGame]
)


def find_answer_moment(moment_id: str) -> AnswerMoment | None:
    for decision in SAMPLE_COURSE.decisions:
        if decision.id == moment_id:
            return ("decision", decision)
    for question in SAMPLE_COURSE.quiz:
        if question.id == moment_id:
            return ("quiz", question)
    if moment_id == SAMPLE_COURSE.bot.moment_id:
        return ("bot", SAMPLE_COURSE.bot)
    return None


def find_tutor_moment(moment_id: str) -> TutorMoment | None:
    for moment in TUTOR_MOMENTS:
        if moment.id == moment_id:
            return moment
    return None


def course_player_view() -> dict:
    """Everything the course UI renders — never includes answer keys."""
    return {
        "title": SAMPLE_COURSE.title,
        "tagline": SAMPLE_COURSE.tagline,
        "minutes": SAMPLE_COURSE.minutes,
        "tutor_moments": len(TUTOR_MOMENTS),
        "decisions": [decision.to_player_view() for decision in SAMPLE_COURSE.decisions],
        "slides": [slide.to_player_view() for slide in SAMPLE_COURSE.slides],
        "quiz": [question.to_player_view() for question in SAMPLE_COURSE.quiz],
        "prompt_compare": SAMPLE_COURSE.prompt_compare.to_player_view(),
        "bot": SAMPLE_COURSE.bot.to_player_view(),
        "reflection": SAMPLE_COURSE.reflection.to_player_view(),
    }