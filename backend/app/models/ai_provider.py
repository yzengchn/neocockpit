from sqlalchemy import Column, String, Boolean, Integer, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class AIProviderConfig(Base):
    """AI 提供商配置 — 管理端维护，首页下拉框从中读取"""
    __tablename__ = "ai_provider_configs"

    id = Column(String, primary_key=True)
    name = Column(String(64), nullable=False, unique=True, comment="显示名称，如 阿里云")
    value = Column(String(64), nullable=False, unique=True, comment="枚举值，如 dashscope")
    enabled = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
