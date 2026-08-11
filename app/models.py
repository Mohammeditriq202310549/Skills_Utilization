import uuid
from sqlalchemy import (
    MetaData,
    Table,
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    UniqueConstraint,
)

metadata = MetaData()

def generate_uuid():
    return str(uuid.uuid4())

# Table 1: users
users = Table(
    "users",
    metadata,
    Column("id", String(36), primary_key=True, default=generate_uuid),
    Column("username", String(100), nullable=False),
    Column("email", String(120), nullable=False, unique=True),
    Column("password", String(255), nullable=False),  # Hashed password
    Column("phone", String(20), nullable=True),
    Column("age", Integer, nullable=True),
    Column("major", String(100), nullable=True),
    Column("avatar_url", String(255), nullable=True),
)


# Table 2: courses
courses = Table(
    "courses",
    metadata,
    Column("id", String(36), primary_key=True, default=generate_uuid),
    Column("title", String(150), nullable=False),
    Column("description", Text, nullable=True),
    Column("instructor", String(100), nullable=False),
    Column("skill_requirements", Text, nullable=True),  # Requirements list/text
)

# Table 3: skills
skills = Table(
    "skills",
    metadata,
    Column("id", String(36), primary_key=True, default=generate_uuid),
    Column("name", String(100), nullable=False, unique=True),
    Column("description", Text, nullable=True),
)

# Table 4: user_skills
user_skills = Table(
    "user_skills",
    metadata,
    Column("id", String(36), primary_key=True, default=generate_uuid),
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("skill_id", String(36), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
    Column("proficiency_level", String(50), nullable=False),
    UniqueConstraint("user_id", "skill_id", name="uq_user_skill"),
)

# Table 5: course_vectors
course_vectors = Table(
    "course_vectors",
    metadata,
    Column("id", String(36), primary_key=True, default=generate_uuid),
    Column("course_id", String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, unique=True),
    Column("embedding_vector", Text, nullable=False),
)

# Table 6: user_courses (enrollments)
user_courses = Table(
    "user_courses",
    metadata,
    Column("id", String(36), primary_key=True, default=generate_uuid),
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("course_id", String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
    Column("enrolled_at", String(50), nullable=True),
    UniqueConstraint("user_id", "course_id", name="uq_user_course"),
)

# Table 7: user_favorites
user_favorites = Table(
    "user_favorites",
    metadata,
    Column("id", String(36), primary_key=True, default=generate_uuid),
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("course_id", String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
    Column("created_at", String(50), nullable=True),
    UniqueConstraint("user_id", "course_id", name="uq_user_favorite"),
)


