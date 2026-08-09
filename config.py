import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:123456@localhost:5432/course_recommendation_db"
    )
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-course-platform-2026-secure")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-super-secret-key-32-chars-long-secure-token")
