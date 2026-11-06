from fastapi import APIRouter, Depends, HTTPException

from typing import Annotated
from app.database.supabase import get_supabase_client
from supabase import Client
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="api/v1/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    

@router.post("/login")
def login(login_request: LoginRequest, supabase_client: Annotated[Client, Depends(get_supabase_client)]):
    try:
        # Check if the user exists in the database
        response = supabase_client.table("user").select("*").eq("email", login_request.email).execute()
        if response.data:
            return {"status": "success", "message": "User found", "user": response.data[0]}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RegisterRequest(BaseModel):
    email: EmailStr

@router.post("/register")
def register(register_request: RegisterRequest, supabase_client: Annotated[Client, Depends(get_supabase_client)]):
    try:
        # Check if the user already exists
        response = supabase_client.table("user").select("*").eq("email", register_request.email).execute()
        if response.data:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Insert the new user into the database
        insert_response = supabase_client.table("user").insert({"email": register_request.email}).execute()
        return {"status": "success", "message": "User registered", "user": insert_response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))