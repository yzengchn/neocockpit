from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    GENERATING_BG = "generating_bg"
    GENERATING_ICONS = "generating_icons"
    GENERATING_AVATAR = "generating_avatar"
    GENERATING_TEXTURES = "generating_textures"
    SLICING = "slicing"
    COMPOSITING = "compositing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, Enum):
    THEME = "theme"
    DIGITAL_HUMAN = "digital_human"


class AIProvider(str, Enum):
    OPENAI = "openai"
    DOUBAO = "doubao"
    DASHSCOPE = "dashscope"


class LogEntry(BaseModel):
    timestamp: str
    level: str  # info, success, error
    message: str


class TaskCreate(BaseModel):
    user_input: str = Field(..., min_length=1, max_length=500, description="主题描述")
    provider: Optional[str] = Field("dashscope", description="AI提供商枚举值，如 dashscope/doubao/openai")
    task_type: TaskType = Field(TaskType.THEME, description="任务类型")
    icon_descriptions: List[str] = Field(
        default_factory=list,
        description="勾选的图标描述名称列表，如 ['天气', '胎压']",
    )


class TaskResponse(BaseModel):
    id: str
    user_input: str
    task_type: str = "theme"
    status: TaskStatus
    ai_provider: Optional[str] = None
    icon_descriptions: List[str] = []
    background_image_url: Optional[str] = None
    icon_image_url: Optional[str] = None
    preview_image_url: Optional[str] = None
    avatar_image_url: Optional[str] = None
    texture_albedo_url: Optional[str] = None
    texture_normal_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskDetail(TaskResponse):
    background_prompt: Optional[str] = None
    icon_prompt: Optional[str] = None
    normal_detail: Optional[str] = None
    logs: List[LogEntry] = []
    output_path: Optional[str] = None

    class Config:
        from_attributes = True
