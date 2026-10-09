# Backend

This folder contains the project's backend, which provides data and functionality to the frontend through an API. The API is built with [FastAPI](https://fastapi.tiangolo.com/), a Python framework.

The backend owns Supabase authentication, sessions, and profile queries. Visiting the root URL returns:

```json
{"message":"Hello"}
```

## What You Need

- Python 3.14 (the project is configured for this version in `.python-version`)
- [uv](https://docs.astral.sh/uv/), a tool for managing Python project dependencies and commands

Check that the tools are available in a terminal:

```powershell
python --version
uv --version
```

## Set Up the Project

In your terminal, change to this `backend` folder. For example, from the repository's root folder:

```powershell
cd backend
```

Install the dependencies declared by this project:

```powershell
uv sync
```

`uv` creates a local virtual environment and installs the project's dependencies there. A virtual environment keeps this project's packages separate from other Python projects on your computer. You do not need to activate it manually when using the `uv run` commands below.

Create `backend/.env` with these settings (the root `.env.example` includes placeholders):

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-public-anon-or-publishable-key
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SESSION_COOKIE_SECURE=false
```

Use a public anon/publishable key; no service-role key is required. Never commit real
credentials. Apply the SQL migrations in `../supabase/migrations/` and provision
accounts through Supabase Auth. Sign-in does not create accounts. Roles come from
`profiles.role`, not email domains; new profiles default to student, and instructor
roles must be assigned administratively.

## Start the Development Server

Run this command from the `backend` folder:

```powershell
uv run fastapi dev app/main.py
```

The server runs on your computer. While it is running, open these URLs in a browser:

- <http://127.0.0.1:8000/> - the API's root endpoint
- <http://127.0.0.1:8000/docs> - interactive API documentation, where you can try endpoints

To stop the server, focus the terminal and press `Ctrl+C`.

## Try the API

You can also request the root endpoint from a second terminal:

```powershell
curl http://127.0.0.1:8000/
```

The response should be:

```json
{"message":"Hello"}
```

## How the Code Is Organized

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py       # FastAPI app, health endpoints, and API error handling
│   ├── auth.py       # Authentication, cookie sessions, and profile API
│   └── database/
│       └── supabase.py  # Separate health and request-scoped user clients
├── pyproject.toml    # Python version, project details, and dependencies
├── uv.lock           # Exact dependency versions selected by uv
└── README.md
```

In `app/main.py`, `app = FastAPI()` creates the web application. The `@app.get("/")` line registers a route: it tells FastAPI to run the `read_root` function when someone sends an HTTP `GET` request to `/`.

## Add an Endpoint

An endpoint is a URL and HTTP method that your application responds to. For example, add this to `app/main.py` to create another endpoint:

```python
@app.get("/hello")
def say_hello():
	return {"message": "Hello from the backend"}
```

With the server running, visit <http://127.0.0.1:8000/hello>. FastAPI converts the returned Python dictionary into a JSON response. The development server watches for code changes and reloads the application.

## Current Scope

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Greeting |
| GET | `/health` | Supabase database connectivity |
| POST | `/api/auth/login` | Supabase password sign-in; returns email/profile and sets a cookie |
| GET | `/api/me` | Validates/refreshes the session and returns email/profile |
| POST | `/api/auth/logout` | Clears local sessions and revokes Supabase refresh sessions globally |

Login accepts `{"email":"user@example.com","password":"..."}`. Logout accepts `{}`.
Both POST endpoints require `Content-Type: application/json` and an `Origin` header
matching `FRONTEND_ORIGINS`. Use the frontend's same-origin `/api` proxy; CORS is not
enabled. Calls from Swagger must satisfy these origin requirements too.
Responses contain no Supabase tokens and use `Cache-Control: no-store`.
Errors return `{"error":{"code":"...","message":"...","signed_out":false}}`.

Profiles contain `id`, `email`, `role`, `cs_qualified`, and `assessment_completed`.
Queries use the verified user's JWT so existing row-level security remains effective.
Each request has its own Supabase client; the shared health client is never signed in.

## Session Security And Limitations

- The browser receives only a random, host-only `polyu_session` cookie with HttpOnly,
	SameSite=Lax, and Path=/api. Supabase tokens stay in backend memory. Passwords are
	forwarded to Supabase Auth and never stored.
- Sessions expire after 24 hours. Expiring access tokens refresh on `/api/me` with
	per-session locking. Invalid sessions return 401; temporary upstream failures return 503.
- Logout invalidates this user's local sessions even if Supabase revocation fails.
	A 503 with `signed_out: true` means local sign-out succeeded but global revocation
	could not be confirmed. Supabase access JWTs remain valid until their own expiry.
- Use one backend worker only. Restarting or auto-reloading the backend clears every
	session. Previous frontend-SDK sessions require a fresh sign-in.
- Before production, replace the in-memory store with shared persistent storage,
	use HTTPS with `SESSION_COOKIE_SECURE=true`, configure exact allowed origins, and
	deploy a same-origin `/api` reverse proxy. Do not use this store across workers.
- Moving frontend calls does not disable Supabase's public API or change existing RLS
	grants. Signup, password reset, assessment submission, and AI endpoints are not added.

## Tests

```powershell
uv run pytest
```

Tests mock Supabase and cover authentication, refresh, logout, session isolation,
Origin checks, cookies, and existing health/greeting behavior. Check real accounts
and deployed RLS through the running app as well.
