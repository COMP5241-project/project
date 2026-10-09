from supabase_auth.errors import AuthApiError


class ApiError(Exception):
    def __init__(
        self, status: int, code: str, message: str,
        *, clear_cookie: bool = False, signed_out: bool = False,
    ):
        self.status = status
        self.code = code
        self.message = message
        self.clear_cookie = clear_cookie
        self.signed_out = signed_out


def upstream_error(error: Exception, *, login: bool = False) -> ApiError:
    if isinstance(error, AuthApiError) and error.status in (400, 401, 403, 404, 422):
        return ApiError(
            401, "invalid_credentials" if login else "unauthenticated",
            "Incorrect email or password." if login else "Your session has expired. Sign in again.",
            clear_cookie=not login,
        )
    return ApiError(503, "service_unavailable", "The sign-in service is unavailable. Try again later.")