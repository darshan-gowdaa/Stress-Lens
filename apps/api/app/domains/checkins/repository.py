import json
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class RawCheckin(Base):
    __tablename__ = "raw_checkins"

    id = Column(Integer, primary_key=True, index=True)
    stress_level = Column(Integer, nullable=False, index=True)
    text_redacted = Column(Text, nullable=False)
    course_hash = Column(String, nullable=True)
    dept_hash = Column(String, nullable=True, index=True)
    tags = Column(Text, nullable=True)  # JSON-encoded list e.g. '["anxious","tired"]'
    sleep_hours = Column(Integer, nullable=True)
    embedding = Column(Text, nullable=True)
    # valence: sentiment score in [-1, 1], negative = more distressed
    valence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    checkin_id = Column(Integer, ForeignKey("raw_checkins.id"), unique=True, nullable=False)
    category = Column(String(50), nullable=False, index=True)  # Low / Medium / High
    # confidence: max-softmax probability from classifier (0–1)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
