from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer
from sqlalchemy.sql import func
from app.core.database import Base


class IconDescription(Base):
    """可配置的图标描述列表 — 管理端维护，任务创建时从中勾选"""
    __tablename__ = "icon_descriptions"

    id = Column(String, primary_key=True)
    name = Column(String(64), nullable=False, unique=True, comment="短名称，如 天气/胎压")
    directory_name = Column(String(64), nullable=False, unique=True, comment="目录名称，如 weather/tire_pressure")
    description = Column(Text, nullable=False, comment="图标描述，供 LLM 优化提示词")
    enabled = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
