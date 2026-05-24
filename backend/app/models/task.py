from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class ThemeTask(Base):
    __tablename__ = "theme_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # 任务类型: theme / digital_human
    task_type = Column(String, default="theme", nullable=False)

    # 用户输入
    user_input = Column(Text, nullable=False)

    # AI生成的提示词
    background_prompt = Column(Text, nullable=True)
    icon_prompt = Column(Text, nullable=True)
    normal_detail = Column(Text, nullable=True)

    # 勾选的图标描述名称列表，如 ["天气", "胎压"]
    icon_descriptions = Column(JSON, default=list, nullable=True)

    # 使用的AI提供商
    ai_provider = Column(String, nullable=True)

    # 任务状态: queued, processing, slicing, completed, failed
    # digital_human 额外: generating_avatar, generating_textures
    status = Column(String, default="queued", nullable=False)

    # 执行日志 [{timestamp, level, message}]
    logs = Column(JSON, default=list, nullable=False)

    # 生成的原始图片URL
    background_image_url = Column(String, nullable=True)
    icon_image_url = Column(String, nullable=True)
    preview_image_url = Column(String, nullable=True)

    # 数字人资源URL
    avatar_image_url = Column(String, nullable=True)
    texture_albedo_url = Column(String, nullable=True)
    texture_normal_url = Column(String, nullable=True)

    # 输出路径
    output_path = Column(String, nullable=True)

    # 构建树结构
    build_tree = Column(JSON, nullable=True)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def add_log(self, level: str, message: str):
        """添加日志"""
        from datetime import datetime
        logs = list(self.logs or [])
        logs.append({
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        })
        self.logs = logs
