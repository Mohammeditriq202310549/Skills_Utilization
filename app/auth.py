import datetime
import re
from functools import wraps
import jwt
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

def validate_email(email: str) -> bool:
    """Validates email format using regular expression."""
    if not email:
        return False
    return bool(re.match(EMAIL_REGEX, email.strip()))

def validate_phone(phone: str) -> tuple[bool, str]:
    """
    Validates phone number:
    - Must start with 079, 078, or 077
    - Must be exactly 10 digits long
    """
    if not phone or not str(phone).strip():
        return True, "Phone is optional"
    
    clean_phone = str(phone).strip()
    if not re.match(r"^(077|078|079)\d{7}$", clean_phone):
        return False, "Phone number must start with 077, 078, or 079 and be exactly 10 digits long"
    return True, "Phone is valid"

def validate_age(age) -> tuple[bool, str]:
    """
    Validates age:
    - Must be a positive integer between 1 and 120
    """
    if age is None or str(age).strip() == "":
        return True, "Age is optional"
    
    try:
        age_int = int(age)
        if age_int < 1 or age_int > 120:
            return False, "Age must be a valid positive number between 1 and 120"
    except (ValueError, TypeError):
        return False, "Age must be a valid integer"
    
    return True, "Age is valid"

def validate_password(password: str) -> tuple[bool, str]:
    """
    Validates password strength:
    - Minimum 8 characters long
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one digit (0-9)
    - At least one special symbol
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]", password):
        return False, "Password must contain at least one special symbol (!@#$%^&*...)"
    return True, "Password is valid"


def hash_password(password: str) -> str:
    """Hashes a plain-text password using Werkzeug security."""
    return generate_password_hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a hashed password."""
    return check_password_hash(hashed_password, password)

def generate_jwt_token(user_id: str, email: str) -> str:
    """Generates a signed JWT badge valid for 24 hours."""
    payload = {
        "user_id": str(user_id),

        "email": email,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def token_required(f):
    """Decorator to protect routes using 'Authorization: Bearer <token>' header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            current_user_id = payload["user_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        return f(current_user_id, *args, **kwargs)
    return decorated
