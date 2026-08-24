import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.domains.checkins import schemas, service
from app.ml.genai import generate_checkin_nudge
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


@router.post("/", response_model=schemas.CheckinResponse)
@router.post("", response_model=schemas.CheckinResponse, include_in_schema=False)
async def submit_checkin(checkin: schemas.CheckinCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_checkin(db, checkin)



class NudgeRequest(BaseModel):
    stress_level: int
    tags: list[str] = []
    category: Optional[str] = "Medium"


class NudgeResponse(BaseModel):
    nudge: str


@router.post("/nudge", response_model=NudgeResponse)
async def get_ai_nudge(req: NudgeRequest):
    """Return a personalized AI encouragement based on stress level + tags.

    Only uses anonymized metadata, never raw text. Safe to call post-submission.
    """
    nudge = generate_checkin_nudge(req.stress_level, req.tags, req.category or "Medium")
    return {"nudge": nudge}
