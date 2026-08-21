import asyncio
import json
import random
from app.core.database import SessionLocal, engine, Base
from app.domains.checkins.repository import RawCheckin, Prediction
from app.ml.tasks import predict_stress_category
from app.core.anonymity import salt_hash, redact_text

DEPTS = [
    "School of Architecture",
    "School of Business and Management",
    "School of Commerce, Finance and Accountancy",
    "School of Education",
    "School of Engineering and Technology",
    "School of Humanities and Performing Arts",
    "School of Law",
    "School of Sciences",
    "School of Social Sciences"
]

COURSES = ["BTech", "BBA", "BCom", "BA", "BSc", "LLB", "MBA", "MSc", "PhD"]
TAGS_POOL = ['#anxious', '#overwhelmed', '#tired', '#hopeful', '#calm', '#frustrated', '#focused', '#lonely', '#motivated', '#confused', '#excited', '#burnt-out']

INDIAN_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Karan", "Anjali", "Rohan", "Neha", "Vikram", "Pooja", "Arjun", "Kavya", "Siddharth", "Aisha", "Aditya"]

SCENARIOS = [
    # Negative / Stressed
    "My name is {name} and I'm super stressed about the upcoming mid-sem exams. The syllabus is just too vast.",
    "Hey, this is {name}. The traffic in Koramangala while commuting to campus is draining all my energy.",
    "I'm {name}. Placements are starting next week and I feel completely unprepared and anxious.",
    "This is {name}. The continuous internal assessments (CIAs) are piling up. Need a break.",
    "I'm {name}. Hostel curfew at 9 PM is really frustrating when we have group projects.",
    "My name is {name}. I'm burnt out from juggling societies, fest duties, and academics.",
    "This is {name}. I feel so anxious about my grades this semester. I don't know how to catch up.",
    "Hello, I am {name}. The library is my second home now. Too much reading for {course}.",
    "{name} here. I have to commute 1.5 hours one way, it's exhausting and leaves no time for study.",
    # Positive / Calm
    "{name} here. Just had a great presentation today in the {dept}. Feeling very motivated!",
    "I'm {name}. I'm really enjoying the campus life, feeling calm and relaxed.",
    "Hey it's {name}. I'm finding the curriculum in {course} very interesting and I feel hopeful about my future.",
    "My name is {name}. Had a good day with friends at the canteen. Life is fine.",
    "This is {name}. Excited about the upcoming tech fest! Everything is going good.",
]

import datetime

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        now = datetime.datetime.now(datetime.timezone.utc)
        for i in range(1000):
            name = random.choice(INDIAN_NAMES)
            dept = random.choice(DEPTS)
            course = random.choice(COURSES)
            scenario = random.choice(SCENARIOS)
            text = scenario.format(name=name, dept=dept, course=course)
            
            # Additional context to make it longer
            if "stressed" in text or "anxious" in text or "burnt out" in text or "exhausting" in text:
                text += " " + random.choice([
                    "I hope things get better soon.",
                    "It's just one of those days.",
                    "I need to manage my time better.",
                    "Christ University has been great, but it's overwhelming sometimes."
                ])
                stress_level = random.randint(7, 10)
                sleep_hours = random.randint(3, 6)
            else:
                text += " " + random.choice([
                    "Feeling really good today.",
                    "Productive day overall.",
                    "Can't wait for tomorrow.",
                    "Glad I have a supportive group."
                ])
                stress_level = random.randint(1, 4)
                sleep_hours = random.randint(6, 9)
                
            num_tags = random.randint(1, 3)
            tags = random.sample(TAGS_POOL, num_tags)
            
            c_hash = salt_hash(course)
            d_hash = dept # PLAIN TEXT FOR DEMO
            
            # scatter dates over last 7 to 90 days (1 week to 3 months old)
            days_ago = random.randint(7, 90)
            created_at = now - datetime.timedelta(days=days_ago)
            
            checkin = RawCheckin(
                stress_level=stress_level,
                text_redacted=redact_text(text),
                course_hash=c_hash,
                dept_hash=d_hash,
                tags=json.dumps(tags),
                sleep_hours=sleep_hours,
                created_at=created_at
            )
            db.add(checkin)
            await db.commit()
            await db.refresh(checkin)
            
            # Since celery tasks are eager, this runs synchronously
            predict_stress_category.delay(checkin.id, checkin.text_redacted)
            
            if i % 10 == 0:
                print(f"Inserted {i} checkins...")
        
        print("Done seeding data!")

if __name__ == "__main__":
    asyncio.run(seed())
