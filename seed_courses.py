import json
from app.db import engine
from app.models import courses, skills

def seed_database():
    with open("courses.json", "r") as f:
        courses_data = json.load(f)

    with engine.begin() as conn:
        print("Seeding skills and courses into PostgreSQL...")

        all_skills = set()
        for c in courses_data:
            reqs = [s.strip() for s in c["skill_requirements"].split(",") if s.strip()]
            all_skills.update(reqs)

        for skill_name in sorted(all_skills):
            existing = conn.execute(
                skills.select().where(skills.c.name == skill_name)
            ).fetchone()
            if not existing:
                conn.execute(skills.insert().values(name=skill_name))

        for course_item in courses_data:
            existing_course = conn.execute(
                courses.select().where(courses.c.title == course_item["title"])
            ).fetchone()
            if not existing_course:
                conn.execute(
                    courses.insert().values(
                        title=course_item["title"],
                        description=course_item["description"],
                        instructor=course_item["instructor"],
                        skill_requirements=course_item["skill_requirements"]
                    )
                )
                print(f"  + Added Course: {course_item['title']}")

        print("Successfully seeded all courses and skills!")

if __name__ == "__main__":
    seed_database()
