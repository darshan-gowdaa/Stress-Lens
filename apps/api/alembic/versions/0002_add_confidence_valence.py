"""add confidence and valence columns

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # valence: lexicon-based sentiment score in [-1, 1] stored on each check-in
    op.add_column("raw_checkins", sa.Column("valence", sa.Float, nullable=True))

    # confidence: max-softmax probability from the stress classifier (0–1)
    op.add_column("predictions", sa.Column("confidence", sa.Float, nullable=True))


def downgrade() -> None:
    op.drop_column("predictions", "confidence")
    op.drop_column("raw_checkins", "valence")
