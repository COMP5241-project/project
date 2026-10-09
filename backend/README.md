# Backend

This folder contains the project's backend, which provides data and functionality to the frontend through an API. The API is built with [FastAPI](https://fastapi.tiangolo.com/), a Python framework.

At the moment, this is a small starter backend with one endpoint. Visiting the root URL returns:

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
│   └── main.py       # Creates the FastAPI app and defines the endpoint
├── pyproject.toml    # Python version, project details, and dependencies
├── uv.lock           # Exact dependency versions selected by uv
└── README.md
```

In `app/main.py`, `app = FastAPI()` creates the web application. The `@app.get("/")` line registers a route: it tells FastAPI to run the `read_root` function when someone sends an HTTP `GET` request to `/`.

## Add an Endpoint

An endpoint is a URL and HTTP method that your application responds to. For example, add this to `app/main.py` to create a second endpoint:

```python
@app.get("/hello")
def say_hello():
	return {"message": "Hello from the backend"}
```

With the server running, visit <http://127.0.0.1:8000/hello>. FastAPI converts the returned Python dictionary into a JSON response. The development server watches for code changes and reloads the application.

## Current Scope

This backend currently provides only a greeting endpoint. Database access, authentication, and AI features have not been added yet.
