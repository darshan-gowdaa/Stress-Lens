from pydantic import BaseModel, Field
from typing import Optional, List


class CheckinCreate(BaseModel):
    stress_level: int = Field(..., ge=1, le=10)
    text: str = Field(..., min_length=1, max_length=2000)
    tags: List[str] = []
    course: Optional[str] = None
    dept: Optional[str] = None
    sleep_hours: Optional[int] = Field(None, ge=0, le=24)


class CheckinResponse(BaseModel):
    id: int
    stress_level: int
    text_redacted: str
    course_hash: Optional[str]
    dept_hash: Optional[str]

    class Config:
        from_attributes = True


class PredictionResponse(BaseModel):
    checkin_id: int
    category: str


class DashboardAggregateResponse(BaseModel):
    dept_hash: Optional[str]
    avg_stress: Optional[float]
    count: int
