from typing import Annotated
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.database.supabase import get_supabase
from app.identity.errors import ApiError
from app.routers.auth import router as auth_router
from app.routers.hallucination import router as hallucination_router
from app.routers.profiles import router as profiles_router
from app.routers.results import router as results_router
from app.identity.sessions import clear_session_cookie
from supabase import Client

app = FastAPI()
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(results_router)
app.include_router(hallucination_router)


@app.middleware("http")
async def prevent_auth_caching(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(ApiError)
async def handle_api_error(request: Request, error: ApiError):
    response = JSONResponse(status_code=error.status, content={
        "error": {"code": error.code, "message": error.message, "signed_out": error.signed_out},
    })
    if error.clear_cookie:
        clear_session_cookie(response)
    return response


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, error: RequestValidationError):
    return JSONResponse(status_code=422, content={
        "error": {"code": "invalid_request", "message": "Check the submitted fields and try again."},
    })

@app.get("/")
def read_root():
    return JSONResponse(content={"message": "Hello"})

@app.get("/health")
def health_check(db_client:Annotated[Client, Depends(get_supabase)]):
    # Perform any necessary health checks here, such as database connectivity
    try:
        response = db_client.table("profiles").select("*").limit(1).execute()
        print("Successfully connected to Supabase!")
        return JSONResponse(content={"status": "ok"})
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
        return JSONResponse(status_code=503,content={"status": "error", "message": str(e)})