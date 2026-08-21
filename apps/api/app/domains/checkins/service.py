import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.checkins.schemas import CheckinCreate
from app.domains.checkins.repository import RawCheckin
from app.core.anonymity import redact_text, salt_hash
from app.ml.tasks import predict_stress_category


async def create_checkin(db: AsyncSession, checkin: CheckinCreate) -> RawCheckin:
    redacted = redact_text(checkin.text)
    c_hash = salt_hash(checkin.course) if checkin.course else None
    d_hash = checkin.dept if checkin.dept else None
    tags_json = json.dumps(checkin.tags) if checkin.tags else None

    db_checkin = RawCheckin(
        stress_level=checkin.stress_level,
        text_redacted=redacted,
        course_hash=c_hash,
        dept_hash=d_hash,
        tags=tags_json,
        sleep_hours=checkin.sleep_hours,
    )
    db.add(db_checkin)
    try:
        await db.commit()
        await db.refresh(db_checkin)
    except Exception as e:
        await db.rollback()
        raise e

    # fire-and-forget celery task
    predict_stress_category.delay(db_checkin.id, redacted)
    return db_checkin
