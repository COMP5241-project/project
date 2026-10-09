from typing import Annotated
from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from app.database.supabase import get_supabase
from supabase import Client

app = FastAPI()

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