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

Configure the Supabase Auth email template used for passwordless sign-in to render
`{{ .Token }}`. The login page uses that six-digit token for password recovery.

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
│   ├── identity/
│   │   ├── __init__.py
│   │   ├── auth.py       # Shared Supabase auth-client dependencies
│   │   ├── errors.py     # Identity API errors and upstream auth mapping
│   │   ├── profiles.py   # Profile response models and profile lookup
│   │   └── sessions.py   # Cookie-backed session lifecycle
│   ├── routers/
│   │   ├── auth.py  # Login and logout endpoints
│   │   └── profiles.py # Current-profile endpoint
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
| POST | `/api/auth/password-reset/request` | Sends a six-digit Supabase Auth email code when the account exists |
| POST | `/api/auth/password-reset/verify` | Verifies the code and updates the account password |
| GET | `/api/profiles/me` | Validates/refreshes the session and returns email/profile |
| POST | `/api/auth/logout` | Clears local sessions and revokes Supabase refresh sessions globally |
| POST | `/api/profiles/hallucination-results` | Saves a "Spot the Hallucination" result for the signed-in user |
| GET | `/api/hallucination/challenges` | Challenge bank for the game (answer fields stay server-side) |
| POST | `/api/hallucination/judge` | Grades a critique with the AI tutor (OpenRouter, key in `backend/.env`) |
| POST | `/api/instructor/generate` | Generates or revises slide decks and multiple-choice quizzes for instructors |
| GET | `/api/materials` | Loads the signed-in instructor's saved materials and material-scoped sources |
| POST | `/api/materials` | Creates an instructor material |
| PATCH | `/api/materials/{id}` | Saves material content and chat history |
| DELETE | `/api/materials/{id}` | Deletes a material, its sources, and its stored files |
| POST | `/api/materials/{id}/sources` | Adds pasted text, an imported URL, or a TXT/PDF/PPTX file |
| DELETE | `/api/materials/{id}/sources/{source_id}` | Removes one source and its stored file |

Login accepts `{"email":"user@example.com","password":"..."}`. Logout accepts `{}`.
Mutating JSON endpoints require `Content-Type: application/json`; the material file-upload
endpoint uses `multipart/form-data`. Mutating requests require an `Origin` header matching
`FRONTEND_ORIGINS`. Origins are normalized before comparison, so the local
loopback spellings `localhost`, `127.0.0.1`, and `[::1]` are treated as the same
origin (the browser picks whichever `localhost` resolves to); scheme and port are
still matched strictly. Use the frontend's same-origin `/api` proxy; CORS is not
enabled. Calls from Swagger must satisfy these origin requirements too.
Responses contain no Supabase tokens and use `Cache-Control: no-store`.
Errors return `{"error":{"code":"...","message":"...","signed_out":false}}`.

Profiles contain `id`, `email`, `role`, `cs_qualified`, and `assessment_completed`.
Queries use the verified user's JWT so existing row-level security remains effective.
Each request has its own Supabase client; the shared health client is never signed in.
Course generation requires the `instructor` profile role and accepts `artifact_type`
(`slides` or `quiz`), a `prompt`, optional `source_context`, and optional
`existing_content`/`revision_prompt` for file-scoped revisions. Prompts mentioning a quiz,
MC, or multiple choice are routed to the quiz schema even when the requested artifact type
is slides. Quiz responses contain structured questions with options, a correct answer index,
and an optional explanation. Slide responses include optional per-slide theme colors which
are applied in the instructor preview.
Configure `OPENROUTER_API_KEY` on the backend; optionally set `OPENROUTER_COURSE_MODEL`
to override the shared OpenRouter model. The API key is never sent to the browser. Instructor
materials and extracted source text are stored in Supabase Postgres under the authenticated
account. Uploaded TXT, PDF, and PPTX files are stored in the private `instructor-materials`
bucket and accessed through short-lived signed URLs. URL sources are fetched once and their
extracted text is stored with the material.
Apply all migrations in `../supabase/migrations/`, including the materials migration, before
using these endpoints.

The sample mini-course ("Fundamentals of AI-Assisted Software Engineering") is public.
`GET /api/sample-course/content` returns the player view — answer keys (decision correctness,
quiz answers/explanations, bot input kinds/lessons, tutor rubrics) stay server-side.
`POST /api/sample-course/answer` checks deterministic answers (simulation decisions, quiz
choices, Break-the-Bot inputs) with no LLM call. `POST /api/sample-course/tutor` grades the two
free-response moments with one OpenRouter call each and is quota-limited: anonymous guests are
tracked by a random HttpOnly `sample_tour` cookie (Path=/api, SameSite=Lax) and get 2 total
judgements; signed-in students get 3 judgements per moment; answers must be 20–300 characters;
a coarse per-IP cap (12/hour) guards against guest-id cycling. Quota state is in-memory and
resets on backend restart (same single-worker dev limitation as sessions), and a failed LLM
call refunds the attempt so outages never consume quota.
`POST /api/profiles/sample-course-results` saves a completed run for signed-in students into
`sample_course_results` — apply
`../supabase/migrations/20261018000000_create_sample_course_results.sql` first; guests can play
but never persist anything.
When using the Supabase Dashboard, run
`../supabase/migrations/20261015000000_create_instructor_materials.sql` in the project's
SQL Editor. If the API returns `materials_not_configured`, this migration has not been
applied (or Supabase has not refreshed its schema cache); apply it and retry.
If the tables already exist but file uploads report a missing
`instructor-materials` bucket, run
`../supabase/migrations/20261015164500_configure_instructor_material_storage.sql` in
the SQL Editor. This migration only creates/configures the private bucket and its
owner-scoped storage policy.

## Session Security And Limitations

- The browser receives only a random, host-only `polyu_session` cookie with HttpOnly,
	SameSite=Lax, and Path=/api. Supabase tokens stay in backend memory. Passwords are
	forwarded to Supabase Auth and never stored.
- Sessions expire after 24 hours. Expiring access tokens refresh on `/api/profiles/me` with
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
