from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


# email and password in request
@router.post("/register")
def register(request: RegisterRequest):
    try:
        # Here you would add logic to register the user, e.g., insert into the database
        return {"message": "Register OK", "email": request.email}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
