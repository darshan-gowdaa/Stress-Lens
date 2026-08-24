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
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if insp.has_table("raw_checkins"):
        cols = [c["name"] for c in insp.get_columns("raw_checkins")]
        if "valence" not in cols:
            op.add_column("raw_checkins", sa.Column("valence", sa.Float, nullable=True))

    if insp.has_table("predictions"):
        cols = [c["name"] for c in insp.get_columns("predictions")]
        if "confidence" not in cols:
            op.add_column("predictions", sa.Column("confidence", sa.Float, nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("predictions"):
        cols = [c["name"] for c in insp.get_columns("predictions")]
        if "confidence" in cols:
            op.drop_column("predictions", "confidence")
    if insp.has_table("raw_checkins"):
        cols = [c["name"] for c in insp.get_columns("raw_checkins")]
        if "valence" in cols:
            op.drop_column("raw_checkins", "valence")

