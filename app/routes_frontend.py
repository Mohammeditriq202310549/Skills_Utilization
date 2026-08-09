from flask import Blueprint, render_template

frontend_bp = Blueprint("frontend", __name__)

@frontend_bp.route("/")
@frontend_bp.route("/login")
def login():
    return render_template("login.html")

@frontend_bp.route("/register")
def register():
    return render_template("register.html")

@frontend_bp.route("/courses")
def courses():
    return render_template("courses.html")

@frontend_bp.route("/course-details")
def course_details():
    return render_template("course-details.html")

@frontend_bp.route("/recommendations")
def recommendations():
    return render_template("recommendations.html")

@frontend_bp.route("/profile")
def profile():
    return render_template("profile.html")
