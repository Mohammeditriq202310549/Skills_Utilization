from flask import Blueprint, request, jsonify
from sqlalchemy import select, insert
from app.db import engine
from app.models import users, skills, user_skills
from app.auth import (
    hash_password,
    verify_password,
    generate_jwt_token,
    token_required,
    validate_email,
    validate_password,
)

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone")
    age = data.get("age")
    major = data.get("major")
    selected_skills = data.get("skills", [])  # List of skill_ids or skill names

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400

    if not validate_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    is_valid_pw, pw_msg = validate_password(password)
    if not is_valid_pw:
        return jsonify({"error": pw_msg}), 400


    hashed_pw = hash_password(password)

    with engine.connect() as conn:
        # Check if email already exists
        stmt = select(users).where(users.c.email == email)
        existing_user = conn.execute(stmt).fetchone()
        if existing_user:
            return jsonify({"error": "User with this email already exists"}), 400

        # Insert user
        ins_user = insert(users).values(
            username=username,
            email=email,
            password=hashed_pw,
            phone=phone,
            age=age,
            major=major
        ).returning(users.c.id)
        
        result = conn.execute(ins_user)
        user_id = result.scalar()

        # Insert selected user skills if provided
        for skill_item in selected_skills:
            skill_id = skill_item.get("skill_id")
            proficiency = skill_item.get("proficiency", "Beginner")
            if skill_id:
                conn.execute(
                    insert(user_skills).values(
                        user_id=user_id,
                        skill_id=skill_id,
                        proficiency_level=proficiency
                    )
                )

        conn.commit()

    token = generate_jwt_token(user_id, email)
    return jsonify({
        "message": "User registered successfully",
        "user_id": user_id,
        "token": token
    }), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    with engine.connect() as conn:
        stmt = select(users).where(users.c.email == email)
        user = conn.execute(stmt).fetchone()

        if not user or not verify_password(password, user.password):
            return jsonify({"error": "Invalid email or password"}), 401

        token = generate_jwt_token(user.id, user.email)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }), 200


@auth_bp.route("/api/users/me", methods=["GET"])
@token_required
def get_current_user_profile(current_user_id):
    with engine.connect() as conn:
        # Fetch user
        stmt_user = select(users).where(users.c.id == current_user_id)
        user = conn.execute(stmt_user).fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Fetch user skills
        stmt_skills = (
            select(skills.c.id, skills.c.name, user_skills.c.proficiency_level)
            .select_from(user_skills.join(skills, user_skills.c.skill_id == skills.c.id))
            .where(user_skills.c.user_id == current_user_id)
        )
        skills_rows = conn.execute(stmt_skills).fetchall()

        user_skills_list = [
            {"skill_id": r.id, "skill_name": r.name, "proficiency": r.proficiency_level}
            for r in skills_rows
        ]

    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "age": user.age,
        "major": user.major,
        "skills": user_skills_list
    }), 200
