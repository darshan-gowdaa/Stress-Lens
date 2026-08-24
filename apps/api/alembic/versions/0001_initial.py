"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if bind.dialect.name == "postgresql":
        try:
            op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        except Exception:
            pass

    if not insp.has_table("raw_checkins"):
        op.create_table(
            "raw_checkins",
            sa.Column("id", sa.Integer, primary_key=True, index=True),
            sa.Column("stress_level", sa.Integer, nullable=False),
            sa.Column("text_redacted", sa.Text, nullable=False),
            sa.Column("course_hash", sa.String, nullable=True),
            sa.Column("dept_hash", sa.String, nullable=True),
            sa.Column("tags", sa.Text, nullable=True),
            sa.Column("sleep_hours", sa.Integer, nullable=True),
            sa.Column("embedding", sa.Text, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if not insp.has_table("predictions"):
        op.create_table(
            "predictions",
            sa.Column("id", sa.Integer, primary_key=True, index=True),
            sa.Column("checkin_id", sa.Integer, sa.ForeignKey("raw_checkins.id"), unique=True, nullable=False),
            sa.Column("category", sa.String(50), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("predictions"):
        op.drop_table("predictions")
    if insp.has_table("raw_checkins"):
        op.drop_table("raw_checkins")


