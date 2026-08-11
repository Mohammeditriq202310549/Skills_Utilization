from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import select, or_, insert, delete
from app.db import engine
from app.models import courses, skills, user_skills, user_courses, user_favorites
from app.auth import token_required

courses_bp = Blueprint("courses", __name__)

SKILL_CATEGORY_MAP = {
    "frontend": ["html", "css", "javascript", "figma", "ui/ux", "web", "design"],
    "backend": ["python", "node.js", "sql", "postgresql", "database", "api"],
    "hacking": ["cybersecurity", "networking", "ethical hacking", "linux", "security"],
    "cybersecurity": ["cybersecurity", "networking", "ethical hacking", "linux", "security"],
    "ai": ["python", "machine learning", "tensorflow", "deep learning", "ai", "pandas"],
    "design": ["ui/ux", "figma", "prototyping", "design systems", "design"],
    "devops": ["git", "docker", "kubernetes", "ci/cd", "aws", "cloud computing"],
    "mobile": ["mobile dev", "flutter", "dart", "mobile architecture"],
    "database": ["sql", "postgresql", "database design", "database"]
}

@courses_bp.route("/api/courses", methods=["GET"])
def get_courses():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip().lower()

    with engine.connect() as conn:
        stmt = select(courses)
        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    courses.c.title.ilike(search_pattern),
                    courses.c.description.ilike(search_pattern),
                    courses.c.instructor.ilike(search_pattern),
                    courses.c.skill_requirements.ilike(search_pattern)
                )
            )

        rows = conn.execute(stmt).fetchall()
        results = []

        for r in rows:
            reqs = (r.skill_requirements or "").lower()

            # Category filter check if requested
            if category and category != "all":
                category_keywords = SKILL_CATEGORY_MAP.get(category, [category])
                if not any(kw in reqs or kw in r.title.lower() for kw in category_keywords):
                    continue

            results.append({
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "instructor": r.instructor,
                "skill_requirements": r.skill_requirements
            })

    return jsonify(results), 200


@courses_bp.route("/api/courses/<course_id>", methods=["GET"])
def get_course_details(course_id):
    with engine.connect() as conn:
        stmt = select(courses).where(courses.c.id == str(course_id))
        r = conn.execute(stmt).fetchone()
        if not r:
            return jsonify({"error": "Course not found"}), 404

        course_info = {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "instructor": r.instructor,
            "skill_requirements": r.skill_requirements
        }
    return jsonify(course_info), 200


@courses_bp.route("/api/courses/<course_id>/enroll", methods=["POST"])
@token_required
def enroll_course(current_user_id, course_id):
    with engine.connect() as conn:
        # Check course exists
        c_row = conn.execute(select(courses).where(courses.c.id == str(course_id))).fetchone()
        if not c_row:
            return jsonify({"error": "Course not found"}), 404

        # Check existing enrollment
        existing = conn.execute(
            select(user_courses).where(
                (user_courses.c.user_id == str(current_user_id)) & (user_courses.c.course_id == str(course_id))
            )
        ).fetchone()

        if existing:
            return jsonify({"message": "Already enrolled in this course", "enrolled": True}), 200

        enrolled_time = datetime.now().strftime("%Y-%m-%d %H:%M")
        conn.execute(
            insert(user_courses).values(
                user_id=str(current_user_id),
                course_id=str(course_id),
                enrolled_at=enrolled_time
            )
        )
        conn.commit()

    return jsonify({"message": "Successfully enrolled in course!", "enrolled": True}), 200


@courses_bp.route("/api/courses/<course_id>/unenroll", methods=["DELETE"])
@token_required
def unenroll_course(current_user_id, course_id):
    with engine.connect() as conn:
        conn.execute(
            delete(user_courses).where(
                (user_courses.c.user_id == str(current_user_id)) & (user_courses.c.course_id == str(course_id))
            )
        )
        conn.commit()
    return jsonify({"message": "Successfully unenrolled from course", "enrolled": False}), 200


@courses_bp.route("/api/recommendations", methods=["GET"])
@token_required
def get_recommendations(current_user_id):
    with engine.connect() as conn:
        # Get user's selected skills
        user_skills_stmt = (
            select(skills.c.name)
            .select_from(user_skills.join(skills, user_skills.c.skill_id == skills.c.id))
            .where(user_skills.c.user_id == str(current_user_id))
        )
        user_skill_rows = conn.execute(user_skills_stmt).fetchall()
        user_skills_set = {r.name.strip().lower() for r in user_skill_rows}

        # Expand user skills using synonym map
        expanded_user_terms = set(user_skills_set)
        for user_sk in user_skills_set:
            if user_sk in SKILL_CATEGORY_MAP:
                expanded_user_terms.update(SKILL_CATEGORY_MAP[user_sk])

        all_courses = conn.execute(select(courses)).fetchall()
        recommended = []

        for c in all_courses:
            course_text = f"{c.title} {c.description or ''} {c.skill_requirements or ''}".lower()
            
            # Find matching terms
            matched_terms = [t for t in expanded_user_terms if t in course_text]
            match_score = len(matched_terms)

            # If user has skills specified, only include courses with >0 match score
            if user_skills_set and match_score == 0:
                continue

            recommended.append({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "instructor": c.instructor,
                "skill_requirements": c.skill_requirements,
                "matched_skills": matched_terms,
                "match_score": match_score
            })

        # Sort recommendations by highest match score first
        recommended.sort(key=lambda x: x["match_score"], reverse=True)

    return jsonify(recommended), 200


@courses_bp.route("/api/courses/<course_id>/favorite", methods=["POST"])
@token_required
def toggle_favorite_course(current_user_id, course_id):
    with engine.connect() as conn:
        # Check course exists
        c_row = conn.execute(select(courses).where(courses.c.id == str(course_id))).fetchone()
        if not c_row:
            return jsonify({"error": "Course not found"}), 404

        # Check existing favorite
        fav_stmt = select(user_favorites).where(
            (user_favorites.c.user_id == str(current_user_id)) & (user_favorites.c.course_id == str(course_id))
        )
        existing = conn.execute(fav_stmt).fetchone()

        if existing:
            # Unfavorite
            del_stmt = delete(user_favorites).where(
                (user_favorites.c.user_id == str(current_user_id)) & (user_favorites.c.course_id == str(course_id))
            )
            conn.execute(del_stmt)
            conn.commit()
            return jsonify({"message": "Removed from favorites", "favorited": False}), 200
        else:
            # Favorite
            created_time = datetime.now().strftime("%Y-%m-%d %H:%M")
            ins_stmt = insert(user_favorites).values(
                user_id=str(current_user_id),
                course_id=str(course_id),
                created_at=created_time
            )
            conn.execute(ins_stmt)
            conn.commit()
            return jsonify({"message": "Added to favorites", "favorited": True}), 200


@courses_bp.route("/api/favorites", methods=["GET"])
@token_required
def get_user_favorites(current_user_id):
    with engine.connect() as conn:
        stmt = (
            select(
                courses.c.id,
                courses.c.title,
                courses.c.description,
                courses.c.instructor,
                courses.c.skill_requirements,
                user_favorites.c.created_at
            )
            .select_from(user_favorites.join(courses, user_favorites.c.course_id == courses.c.id))
            .where(user_favorites.c.user_id == str(current_user_id))
        )
        rows = conn.execute(stmt).fetchall()
        favorites_list = [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "instructor": r.instructor,
                "skill_requirements": r.skill_requirements,
                "created_at": r.created_at
            }
            for r in rows
        ]

    return jsonify(favorites_list), 200


