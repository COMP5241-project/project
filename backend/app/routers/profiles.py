from fastapi import APIRouter, Request

from app.identity.auth import OptionalClientDependency
from app.identity.profiles import CurrentProfile, load_profile
from app.identity.sessions import StoreDependency, verified_session

router = APIRouter(prefix="/api/profiles")


@router.get("/me", response_model=CurrentProfile)
def current_profile(request: Request, client: OptionalClientDependency,
                    store: StoreDependency) -> CurrentProfile:
    with verified_session(request, client, store) as (session, user):
        assert client is not None
        return load_profile(client, user.id, user.email, session.access_token)