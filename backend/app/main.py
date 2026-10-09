from fastapi import FastAPI
from fastapi.responses import JSONResponse
from app.database.supabase import supabase

app = FastAPI()

@app.get("/")
def read_root():
    return JSONResponse(content={"message": "Hello"})

@app.get("/health")
def health_check():
    # Perform any necessary health checks here, such as database connectivity
    try:
        response = supabase.table("profiles").select("*").limit(1).execute()
        print("Successfully connected to Supabase!")
        return JSONResponse(content={"status": "ok"})
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
        return JSONResponse(status_code=503,content={"status": "error", "message": str(e)})