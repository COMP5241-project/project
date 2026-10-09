from fastapi import FastAPI
from fastapi.responses import JSONResponse
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(supabase_url, supabase_key)

@app.get("/")
def read_root():
    return JSONResponse(content={"message": "Hello"})

@app.get("/health")
def health_check():
    # Perform any necessary health checks here, such as database connectivity
    try:
        supabase.auth.get_session()
        print("Supabase session retrieved successfully")
    except Exception as e:
        print(f"Error retrieving Supabase session: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)})
    return JSONResponse(content={"status": "ok"})