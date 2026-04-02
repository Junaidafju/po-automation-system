from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import secrets

security = HTTPBearer()

# Simple token-based authentication
VALID_TOKENS = {
    "admin": "secret-admin-token-2024",
    "user": "secret-user-token-2024"
}

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify authentication token"""
    token = credentials.credentials
    
    for user, valid_token in VALID_TOKENS.items():
        if token == valid_token:
            return {"user": user, "authenticated": True}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

def get_current_user(auth_data: dict = Depends(verify_token)):
    """Get current authenticated user"""
    return auth_data