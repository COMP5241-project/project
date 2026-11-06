from fastapi import APIRouter, Depends, HTTPException

from typing import Annotated
from supabase import Client
from app.database.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

@router.get("/me")
def get_profile(
    supabase_client: Annotated[Client, Depends(get_supabase_client)]
):
    # Implementation for fetching user profile
    pass