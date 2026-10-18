"""Guest quota bookkeeping for the sample course's AI tutor moments.

Anonymous learners are identified by a random ``sample_tour`` cookie
(HttpOnly, Path=/api, SameSite=Lax — same shape as the session cookie) and
get a small total budget of tutor judgements; signed-in students get a
larger per-moment budget keyed by user id. A coarse per-IP window caps
throughput as a last-resort guard against guest-id cycling.

All state is in-memory: restarting the backend resets quotas. This matches
the documented single-worker dev limitation that already applies to
sessions.
"""
import os
import secrets
import time
from collections import deque
from dataclasses import dataclass, field
from threading import RLock
from typing import Annotated

from fastapi import Depends, Request, Response

from app.identity.errors import ApiError

GUEST_COOKIE = "sample_tour"
GUEST_COOKIE_SECONDS = 30 * 24 * 60 * 60
GUEST_MAX_USES = 2
STUDENT_MAX_USES_PER_MOMENT = 3
IP_WINDOW_SECONDS = 60 * 60
IP_MAX_USES = 12

GUEST_QUOTA_MESSAGE = (
    "You've used all your AI tutor moments on this sample course. Sign in to keep "
    "practising with fresh feedback on every try."
)
STUDENT_QUOTA_MESSAGE = (
    "You've used all your tries on this moment. Continue the course — or replay it "
    "later to improve this score."
)
IP_QUOTA_MESSAGE = "The AI tutor is very popular right now. Please try again in a bit."


@dataclass
class GuestRecord:
    uses: int = 0
    created_at: float = field(default_factory=time.time)


class SampleQuotaStore:
    def __init__(self) -> None:
        self.guests: dict[str, GuestRecord] = {}
        self.student_uses: dict[tuple[str, str], int] = {}
        self.ip_hits: dict[str, deque[float]] = {}
        self.lock = RLock()

    def _prune(self) -> None:
        now = time.time()
        for guest_id in [key for key, record in self.guests.items()
                         if now - record.created_at > GUEST_COOKIE_SECONDS]:
            del self.guests[guest_id]
        for ip in [key for key, hits in self.ip_hits.items()
                   if not hits or now - hits[-1] > IP_WINDOW_SECONDS]:
            del self.ip_hits[ip]

    def guest_uses(self, guest_id: str) -> int:
        with self.lock:
            self._prune()
            record = self.guests.get(guest_id)
            return record.uses if record else 0

    def register_guest_hit(self, guest_id: str) -> None:
        with self.lock:
            self._prune()
            record = self.guests.setdefault(guest_id, GuestRecord())
            record.uses += 1

    def unregister_guest_hit(self, guest_id: str) -> None:
        with self.lock:
            record = self.guests.get(guest_id)
            if record and record.uses > 0:
                record.uses -= 1

    def student_moment_uses(self, user_id: str, moment_id: str) -> int:
        with self.lock:
            return self.student_uses.get((user_id, moment_id), 0)

    def register_student_hit(self, user_id: str, moment_id: str) -> None:
        with self.lock:
            key = (user_id, moment_id)
            self.student_uses[key] = self.student_uses.get(key, 0) + 1

    def unregister_student_hit(self, user_id: str, moment_id: str) -> None:
        with self.lock:
            key = (user_id, moment_id)
            if self.student_uses.get(key, 0) > 0:
                self.student_uses[key] -= 1

    def recent_ip_hits(self, ip: str) -> int:
        with self.lock:
            self._prune()
            hits = self.ip_hits.get(ip)
            return len(hits) if hits else 0

    def register_ip_hit(self, ip: str) -> None:
        with self.lock:
            now = time.time()
            hits = self.ip_hits.setdefault(ip, deque())
            hits.append(now)
            while hits and now - hits[0] > IP_WINDOW_SECONDS:
                hits.popleft()

    def unregister_ip_hit(self, ip: str) -> None:
        with self.lock:
            hits = self.ip_hits.get(ip)
            if hits:
                hits.pop()


sample_quota_store = SampleQuotaStore()


def get_sample_quota_store() -> SampleQuotaStore:
    return sample_quota_store


SampleQuotaDependency = Annotated[SampleQuotaStore, Depends(get_sample_quota_store)]


def ensure_guest_cookie(request: Request, response: Response) -> str:
    """Return the caller's guest id, issuing a fresh cookie when absent."""
    guest_id = request.cookies.get(GUEST_COOKIE)
    if not guest_id:
        guest_id = secrets.token_urlsafe(24)
        response.set_cookie(
            GUEST_COOKIE, guest_id, max_age=GUEST_COOKIE_SECONDS, path="/api",
            httponly=True, samesite="lax",
            secure=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
        )
    return guest_id


def check_quota(
    store: SampleQuotaStore,
    *,
    user_id: str | None,
    guest_id: str | None,
    moment_id: str,
    ip: str,
) -> None:
    """Raise 429 when the caller has no tutor budget left. Call this before
    the LLM call; register the hit only after the call succeeds."""
    if store.recent_ip_hits(ip) >= IP_MAX_USES:
        raise ApiError(429, "tutor_quota_exceeded", IP_QUOTA_MESSAGE)
    if user_id is not None:
        if store.student_moment_uses(user_id, moment_id) >= STUDENT_MAX_USES_PER_MOMENT:
            raise ApiError(429, "tutor_quota_exceeded", STUDENT_QUOTA_MESSAGE)
    elif guest_id is not None and store.guest_uses(guest_id) >= GUEST_MAX_USES:
        raise ApiError(429, "tutor_quota_exceeded", GUEST_QUOTA_MESSAGE)


def register_hit(
    store: SampleQuotaStore, *, user_id: str | None, guest_id: str | None,
    moment_id: str, ip: str,
) -> None:
    store.register_ip_hit(ip)
    if user_id is not None:
        store.register_student_hit(user_id, moment_id)
    elif guest_id is not None:
        store.register_guest_hit(guest_id)


def refund_hit(
    store: SampleQuotaStore, *, user_id: str | None, guest_id: str | None,
    moment_id: str, ip: str,
) -> None:
    """Give the budget back when the LLM call failed, so learners never pay
    a quota point for a service outage."""
    store.unregister_ip_hit(ip)
    if user_id is not None:
        store.unregister_student_hit(user_id, moment_id)
    elif guest_id is not None:
        store.unregister_guest_hit(guest_id)


def remaining_uses(
    store: SampleQuotaStore, *, user_id: str | None, guest_id: str | None, moment_id: str,
) -> int:
    if user_id is not None:
        return max(0, STUDENT_MAX_USES_PER_MOMENT - store.student_moment_uses(user_id, moment_id))
    if guest_id is not None:
        return max(0, GUEST_MAX_USES - store.guest_uses(guest_id))
    return 0