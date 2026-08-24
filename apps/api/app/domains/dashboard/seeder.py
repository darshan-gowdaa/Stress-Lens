import datetime
import json
import random
import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.checkins.repository import RawCheckin, Prediction
from app.core.anonymity import salt_hash, redact_text
from app.ml.tasks import embedder

# Configuration for 12 academic departments with target stress and course tracks
DEPTS_CONFIG = [
    {
        "dept": "Life Sciences",
        "target_mean": 2.2,
        "base_levels": [1, 2, 2, 2, 3, 3, 2, 1, 2, 3],
        "courses": ["BSc Biotechnology", "MSc Botany", "BSc Zoology"],
        "low_templates": [
            "Botany field trip today was peaceful and refreshing. Enjoying biology experiments with friends in the calm gardens.",
            "Studying genetics in the quiet library with friends, feeling calm and relaxed. Life sciences curriculum is engaging.",
            "Campus canteen break with classmates after microbiology practicals. Peaceful day and feeling hopeful about research.",
            "Attended an inspiring guest lecture on biodiversity. Relaxed atmosphere and motivated for our semester project.",
        ],
        "high_templates": [
            "Microbiology lab record submissions deadline tomorrow and viva exam preparation is causing severe burnout.",
            "Backlog in biochemistry practicals and attendance shortage warning before the semester exam. Lab records due.",
            "Heavy laboratory practical exam schedule and continuous submissions causing exhaustion and anxiety.",
        ],
    },
    {
        "dept": "Humanities",
        "target_mean": 3.2,
        "base_levels": [2, 3, 3, 3, 4, 4, 3, 2, 3, 4],
        "courses": ["BA English", "MA History", "BA Philosophy", "PhD Humanities"],
        "low_templates": [
            "Engaging literature seminar today, had a great discussion with peers. Feeling calm, motivated and relaxed.",
            "Writing my philosophy paper peacefully at the campus canteen with coffee. Love the relaxed campus vibe.",
            "Cultural fest art exhibition was inspiring. Enjoying creative writing sessions and feeling peaceful.",
            "History museum visit was very insightful. Spending a calm weekend reading novels with friends.",
        ],
        "high_templates": [
            "Humanities research paper deadline and presentation viva tomorrow. Piled up submissions causing burnout.",
            "Struggling to finish sociology syllabus before final exam. Attendance requirements and backlog pressure.",
            "Term paper submissions deadline tonight. Overwhelmed by readings and viva prep.",
        ],
    },
    {
        "dept": "Psychology",
        "target_mean": 4.1,
        "base_levels": [3, 4, 4, 4, 5, 4, 3, 5, 4, 4],
        "courses": ["BSc Psychology", "MSc Clinical Psychology", "BA Psychology"],
        "low_templates": [
            "Conducting behavioral observation in psychology lab, calm session with supportive classmates.",
            "Counseling skills roleplay went smoothly today. Feeling relaxed and positive about semester progress.",
            "Attended a peaceful mindfulness seminar at the campus auditorium. Feeling hopeful and motivated.",
            "Collaborative study session for cognitive psychology at the library. Good friends and relaxed evening.",
        ],
        "high_templates": [
            "Psychology clinical case study submissions deadline and lab viva tomorrow. Sleep deprived and burnout.",
            "Heavy psychological statistics exam preparation. Worried about backlog and strict attendance criteria.",
            "Neuropsychology lab assessment and research submissions due together, feeling burnout and stress.",
        ],
    },
    {
        "dept": "Media Studies",
        "target_mean": 4.8,
        "base_levels": [4, 5, 5, 5, 5, 6, 4, 5, 4, 6],
        "courses": ["BA Journalism", "MA Media Studies", "BA Communication"],
        "low_templates": [
            "Campus radio podcast recording session was fun and creative. Feeling calm and excited about media project.",
            "Filmed a short documentary on campus grounds with friends. Relaxed afternoon and good teamwork.",
            "Media ethics discussion was lively and thought provoking. Peaceful canteen break with classmates.",
            "Photography workshop in central campus was relaxing. Enjoying the creative assignments this week.",
        ],
        "high_templates": [
            "Studio video editing deadline tonight. Continuous rendering crashes and pending submissions causing burnout.",
            "Broadcast journalism viva and newsroom assignment submissions piled up before mid-sem exam.",
            "Media production lab submission deadline and studio viva causing sleepless nights and burnout.",
        ],
    },
    {
        "dept": "Commerce",
        "target_mean": 5.6,
        "base_levels": [5, 5, 6, 6, 6, 7, 5, 6, 5, 6],
        "courses": ["BCom Finance", "BCom Honours", "MCom Accounting"],
        "low_templates": [
            "Accounting tutorial was clear today, solved financial problems smoothly. Feeling calm and relaxed.",
            "Good discussion on taxation policies with study group at canteen. Enjoying the weekend sports match.",
            "Participated in commerce association event, well organized and motivated for upcoming week.",
            "Campus library study session on corporate auditing went peacefully with classmates.",
        ],
        "high_templates": [
            "Commerce financial accounting exam and corporate law viva preparation is overwhelming. Heavy burnout.",
            "Attendance shortage notice before tax audit project deadline. Multiple submissions due this week.",
            "Financial modeling lab exam and placement interview tests creating immense pressure and burnout.",
        ],
    },
    {
        "dept": "Data Science",
        "target_mean": 6.5,
        "base_levels": [5, 6, 6, 7, 7, 8, 6, 7, 6, 7],
        "courses": ["BSc Data Science", "MSc Data Science", "BTech Data Analytics"],
        "low_templates": [
            "Machine learning model training completed with good accuracy. Calm day coding algorithms with peers.",
            "Data visualization dashboard finished early. Feeling motivated and enjoying campus canteen coffee.",
            "Productive Kaggle dataset exploration session in computer lab with supportive teammates.",
            "Relaxed weekend brushing up Python data science libraries. Feeling hopeful about tech projects.",
        ],
        "high_templates": [
            "Deep learning lab model training failed hours before the deadline. Placement viva and backlog exam panic.",
            "Data science project submissions due midnight alongside placement interview coding rounds. Extreme burnout.",
            "Big data analytics lab exam and pending pipeline submissions creating severe backlog stress.",
        ],
    },
    {
        "dept": "Civil Engineering",
        "target_mean": 7.0,
        "base_levels": [6, 7, 7, 7, 8, 8, 6, 8, 7, 7],
        "courses": ["BTech Civil Engineering", "MTech Structural Engineering"],
        "low_templates": [
            "Surveying fieldwork on campus grounds went well today. Feeling calm after completing field measurements.",
            "Structural design CAD drafting finished early. Relaxed evening hanging out with friends.",
            "Hydraulics lab demonstration was informative and engaging. Good teamwork on bridge model.",
        ],
        "high_templates": [
            "Civil engineering CAD blueprint submissions deadline and structural lab viva tomorrow. Severe burnout.",
            "Fluid mechanics semester exam preparation with difficult backlog topics. Strict attendance rules.",
            "Geotechnical engineering lab exam and project submissions deadline collision. Overwhelmed and exhausted.",
        ],
    },
    {
        "dept": "Computer Science",
        "target_mean": 7.6,
        "base_levels": [7, 7, 7, 8, 8, 9, 7, 8, 8, 8],
        "courses": ["BTech Computer Science", "MCA", "BSc Computer Science"],
        "low_templates": [
            "Solved dynamic programming problem efficiently in algorithm lab. Feeling calm and motivated.",
            "Open source hackathon project submission went smoothly. Relaxed afternoon with team at cafeteria.",
            "Web development backend deployed cleanly. Good progress on semester capstone project.",
        ],
        "high_templates": [
            "Computer Science placement drive coding rounds collided with lab viva and exam deadline. Severe burnout.",
            "Operating systems kernel lab submissions due tomorrow. Backlog exam pressure and zero sleep.",
            "Compiler design project deadline and tier-1 placement interview viva causing intense burnout.",
        ],
    },
    {
        "dept": "School of Business",
        "target_mean": 7.8,
        "base_levels": [7, 8, 8, 8, 8, 9, 7, 8, 8, 9],
        "courses": ["BBA Finance", "MBA Marketing", "BBA International Business"],
        "low_templates": [
            "Marketing pitch deck presented successfully in business seminar. Team is motivated and energized.",
            "Strategic management case discussion went smoothly. Relaxed evening coffee with classmates.",
            "Enjoyed guest lecture by industry CEO on campus. Calm study session on business analytics.",
        ],
        "high_templates": [
            "School of Business Harvard case analysis submissions deadline at midnight. Summer placement burnout.",
            "Financial modeling exam and marketing viva back to back. Attendance penalty warning and extreme stress.",
            "Consulting placement case competition deadline and managerial exam preparation causing heavy burnout.",
        ],
    },
    {
        "dept": "Mechanical Engineering",
        "target_mean": 8.2,
        "base_levels": [7, 8, 8, 8, 9, 9, 8, 9, 8, 9],
        "courses": ["BTech Mechanical Engineering", "MTech Thermal Engineering"],
        "low_templates": [
            "Thermodynamics experiment ran smoothly in workshop. Feeling calm after completing machining task.",
            "Robotics club project assembly was productive. Relaxed evening chatting with workshop batchmates.",
            "Machine design calculations verified with professor. Feeling good about team project.",
        ],
        "high_templates": [
            "Mechanical engineering thermal lab viva and manufacturing CAD deadline overload. Exhausted burnout.",
            "Backlog exam in finite element analysis while managing strict 85% attendance requirement.",
            "Automobile engineering workshop project submissions deadline tomorrow morning. Extreme lab burnout.",
        ],
    },
    {
        "dept": "Architecture",
        "target_mean": 9.1,
        "base_levels": [8, 9, 9, 9, 10, 10, 9, 10, 9, 9],
        "courses": ["BArch", "MArch Urban Design"],
        "low_templates": [
            "Studio jury critique was helpful and constructive today. Finishing drafts calmly.",
            "Architectural scale model finished on time with study partner. Feeling okay.",
        ],
        "high_templates": [
            "Architecture studio jury deadline tomorrow at 8 AM. 48 hours without sleep, submissions panic, burnout.",
            "Design thesis 3D model broke right before submissions and viva jury. Complete exhaustion and burnout.",
            "Continuous architectural drafting submissions and semester exam pressure is overwhelming. Zero sleep.",
        ],
    },
    {
        "dept": "Law",
        "target_mean": 9.2,
        "base_levels": [8, 9, 9, 9, 10, 10, 9, 10, 9, 10],
        "courses": ["BA LLB Honours", "BBA LLB Honours", "LLM Corporate Law"],
        "low_templates": [
            "Constitutional law moot court research was stimulating. Feeling focused and calm.",
            "Legal aid clinic community consultation was meaningful. Peaceful library afternoon.",
        ],
        "high_templates": [
            "Law national moot court memorial submissions deadline and semester exam collision. Severe burnout.",
            "Exhausted from reading 60 landmark case law briefs for tomorrow viva exam. Overwhelmed and sleep deprived.",
            "Strict 85% attendance rule and intense corporate law submissions deadline tonight. Complete burnout.",
        ],
    },
]

INDIAN_NAMES = [
    "Rahul", "Priya", "Amit", "Sneha", "Karan", "Anjali", "Rohan", "Neha",
    "Vikram", "Pooja", "Arjun", "Kavya", "Siddharth", "Aisha", "Aditya",
    "Divya", "Varun", "Meera", "Nikhil", "Tanvi"
]


async def populate_rich_records(db: AsyncSession) -> dict:
    """Populates 300+ diverse dev and prod records across 90 days with predictions and embeddings."""
    # Reset existing records for a fresh sync
    await db.execute(text("DELETE FROM predictions"))
    await db.execute(text("DELETE FROM raw_checkins"))
    await db.commit()

    random.seed(42)
    np.random.seed(42)

    now = datetime.datetime.now(datetime.timezone.utc)
    records_to_insert = []

    # Generate records evenly distributed across 90 days
    record_idx = 0
    for day_idx in range(90):
        date_day = now - datetime.timedelta(days=day_idx)
        weekday = date_day.weekday()

        # Realistic academic calendar fluctuations
        time_modifier = 0
        if weekday in (5, 6):
            # Weekend relaxation dip
            time_modifier -= 1
        if day_idx in range(0, 5):
            # Recent final exams & viva week spike
            time_modifier += 1
        elif day_idx in range(14, 20):
            # Mid-term CIA project deadlines spike
            time_modifier += 1
        elif day_idx in range(30, 38):
            # Cultural fest & mid-semester break dip
            time_modifier -= 1
        elif day_idx in range(48, 56):
            # Mid-sem examination spike
            time_modifier += 1
        elif day_idx in range(70, 76):
            # Placement season & lab internals spike
            time_modifier += 1
        elif day_idx in range(82, 90):
            # Semester orientation dip
            time_modifier -= 1

        # 3 to 4 check-ins each day guarantees full continuous coverage
        daily_count = random.choice([3, 4, 4])
        for _ in range(daily_count):
            dept_cfg = DEPTS_CONFIG[record_idx % len(DEPTS_CONFIG)]
            record_idx += 1

            dept_name = dept_cfg["dept"]
            course = random.choice(dept_cfg["courses"])
            name = random.choice(INDIAN_NAMES)

            # Base stress calculation with bounds clamping
            base_val = random.choice(dept_cfg["base_levels"])
            stress_level = max(1, min(10, base_val + time_modifier + random.choice([-1, 0, 0, 1])))

            # Calibrate affect, sleep, and keywords based on stress score
            if stress_level >= 7:
                template = random.choice(dept_cfg["high_templates"])
                sleep_hours = random.randint(3, 5 if stress_level >= 9 else 6)
                valence = round(random.uniform(-0.85, -0.30 if stress_level >= 9 else -0.20), 3)
                category = "High"
                confidence = round(random.uniform(0.84, 0.98), 4)
                tags = random.sample(
                    ["#anxious", "#overwhelmed", "#burnt-out", "#tired", "#frustrated", "#panic"],
                    random.randint(1, 3),
                )
            elif stress_level <= 4:
                template = random.choice(dept_cfg["low_templates"])
                sleep_hours = random.randint(7, 9)
                valence = round(random.uniform(0.30, 0.75), 3)
                category = "Low"
                confidence = round(random.uniform(0.80, 0.98), 4)
                tags = random.sample(
                    ["#calm", "#hopeful", "#motivated", "#excited", "#focused"],
                    random.randint(1, 3),
                )
            else:
                template = random.choice([
                    f"Managing routine coursework in {dept_name}. Keeping up with the study schedule and assignments.",
                    f"A bit tired from group presentation preparation for {course}, but making steady progress.",
                    f"Attended full day lectures in {dept_name}, preparing for upcoming tests in the library.",
                ])
                sleep_hours = random.randint(5, 7)
                valence = round(random.uniform(-0.15, 0.20), 3)
                category = "Medium"
                confidence = round(random.uniform(0.75, 0.92), 4)
                tags = random.sample(
                    ["#tired", "#focused", "#confused", "#motivated"],
                    random.randint(1, 3),
                )

            raw_text = f"{name} ({course}, {dept_name}): {template}"
            redacted = redact_text(raw_text)

            # Pre-compute 384-dimensional normalized sentence embedding
            raw_emb = embedder.encode(redacted, normalize_embeddings=True)
            emb_list = raw_emb.tolist() if hasattr(raw_emb, "tolist") else list(raw_emb)

            created_at = date_day.replace(
                hour=random.randint(8, 22),
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
            )

            records_to_insert.append({
                "stress_level": stress_level,
                "text_redacted": redacted,
                "course_hash": salt_hash(course),
                "dept_hash": dept_name,
                "tags": json.dumps(tags),
                "sleep_hours": sleep_hours,
                "valence": valence,
                "embedding": json.dumps(emb_list),
                "created_at": created_at,
                "category": category,
                "confidence": confidence,
            })

    # Insert RawCheckin records
    checkins_added = []
    for item in records_to_insert:
        checkin = RawCheckin(
            stress_level=item["stress_level"],
            text_redacted=item["text_redacted"],
            course_hash=item["course_hash"],
            dept_hash=item["dept_hash"],
            tags=item["tags"],
            sleep_hours=item["sleep_hours"],
            valence=item["valence"],
            embedding=item["embedding"],
            created_at=item["created_at"],
        )
        db.add(checkin)
        checkins_added.append((checkin, item["category"], item["confidence"]))

    await db.flush()

    # Insert corresponding Prediction records for ML analytics
    for checkin, category, confidence in checkins_added:
        pred = Prediction(
            checkin_id=checkin.id,
            category=category,
            confidence=confidence,
            created_at=checkin.created_at,
        )
        db.add(pred)

    await db.commit()

    return {
        "status": "success",
        "total_checkins_seeded": len(checkins_added),
        "total_predictions_seeded": len(checkins_added),
        "departments_count": len(DEPTS_CONFIG),
        "date_range_days": 90,
    }
