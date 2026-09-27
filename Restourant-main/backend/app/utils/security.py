import datetime
import bcrypt
import jwt
from typing import Dict, Any, Optional
from ..config import settings

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    if not hashed_password:
        return False
    # If the stored password was plaintext (legacy demo), compare directly
    if not (hashed_password.startswith('$2a$') or hashed_password.startswith('$2b$') or hashed_password.startswith('$2y$')):
        return plain_password == hashed_password
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def generate_access_token(payload: Dict[str, Any]) -> str:
    """Generate short-lived JWT access token."""
    to_encode = payload.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "type": "access"
    })
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def generate_refresh_token(payload: Dict[str, Any]) -> str:
    """Generate long-lived JWT refresh token."""
    to_encode = payload.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "type": "refresh"
    })
    return jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)

def verify_access_token(token: str) -> Dict[str, Any]:
    """Verify JWT access token."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Verify JWT refresh token."""
    return jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=[settings.JWT_ALGORITHM])
