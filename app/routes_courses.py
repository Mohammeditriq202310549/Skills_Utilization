from flask import Blueprint, request, jsonify
from sqlalchemy import select
from app.db import engine
from app.models import courses, skills, user_skills
from app.auth import token_required

courses_bp = Blueprint("courses", __name__)

@courses_bp.route("/api/courses", methods=["GET"])
def get_courses():
    search = request.args.get("search", "").strip()
    with engine.connect() as conn:
        stmt = select(courses)
        if search:
            stmt = stmt.where(courses.c.title.ilike(f"%{search}%"))
        rows = conn.execute(stmt).fetchall()
        
        results = [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "instructor": r.instructor,
                "skill_requirements": r.skill_requirements
            }
            for r in rows
        ]
    return jsonify(results), 200


@courses_bp.route("/api/courses/<int:course_id>", methods=["GET"])
def get_course_details(course_id):
    with engine.connect() as conn:
        stmt = select(courses).where(courses.c.id == course_id)
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


@courses_bp.route("/api/recommendations", methods=["GET"])
@token_required
def get_recommendations(current_user_id):
    with engine.connect() as conn:
        # Get user skills
        user_skills_stmt = (
            select(skills.c.name)
            .select_from(user_skills.join(skills, user_skills.c.skill_id == skills.c.id))
            .where(user_skills.c.user_id == current_user_id)
        )
        user_skill_names = {r.name.lower() for r in conn.execute(user_skills_stmt).fetchall()}

        # Get all courses
        all_courses = conn.execute(select(courses)).fetchall()

        matched_courses = []
        for c in all_courses:
            reqs = (c.skill_requirements or "").lower()
            # Simple matching: check if any user skill is mentioned in course requirements
            matches = [s for s in user_skill_names if s in reqs]
            match_score = len(matches)
            matched_courses.append({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "instructor": c.instructor,
                "matched_skills": matches,
                "match_score": match_score
            })

        # Sort courses by match score (highest match first)
        matched_courses.sort(key=lambda x: x["match_score"], reverse=True)

    return jsonify(matched_courses), 200
