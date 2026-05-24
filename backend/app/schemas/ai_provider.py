from pydantic import BaseModel, Field
from typing import Optional


class AIProviderConfigCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    value: str = Field(..., min_length=1, max_length=64)
    enabled: bool = Field(default=True)
    sort_order: int = Field(default=0)


class AIProviderConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=64)
    value: Optional[str] = Field(None, min_length=1, max_length=64)
    enabled: Optional[bool] = None
    sort_order: Optional[int] = None


class AIProviderConfigResponse(BaseModel):
    id: str
    name: str
    value: str
    enabled: bool
    sort_order: int

    class Config:
        from_attributes = True
