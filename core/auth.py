import jwt
import os
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, timedelta
from fastapi import HTTPException, Request, Depends

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
def get_session_timeout() -> int:
    try:
        from core.database import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT jwt_session_timeout FROM system_settings LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            return int(row[0])
    except Exception:
        pass
    return 45  # fallback to 45 minutes

REFRESH_TOKEN_EXPIRE_DAYS = 14

def create_token(user_id: int, username: str, role: str, is_refresh: bool = False) -> str:
    """Creates a JWT token (access token or refresh token based on is_refresh flag)."""
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "iat": datetime.utcnow()
    }
    
    if is_refresh:
        payload["exp"] = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        payload["token_type"] = "refresh"
    else:
        timeout = get_session_timeout()
        payload["exp"] = datetime.utcnow() + timedelta(minutes=timeout)
        payload["token_type"] = "access"
        
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(request: Request) -> dict:
    """FastAPI dependency to retrieve the current user from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    
    if payload.get("token_type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type. Access token expected.")
        
    return payload

def require_role(*allowed_roles):
    """FastAPI dependency check to enforce role-based access control (RBAC)."""
    def dependency(user: dict = Depends(get_current_user)):
        role = user.get("role")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions to perform this action")
        return user
    return dependency
