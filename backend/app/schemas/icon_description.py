from pydantic import BaseModel, Field
from typing import Optional


class IconDescriptionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    directory_name: str = Field(..., min_length=1, max_length=64)
    description: str = Field(..., min_length=1)
    enabled: bool = Field(default=True)
    sort_order: int = Field(default=0)


class IconDescriptionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=64)
    directory_name: Optional[str] = Field(None, min_length=1, max_length=64)
    description: Optional[str] = Field(None, min_length=1)
    enabled: Optional[bool] = None
    sort_order: Optional[int] = None


class IconDescriptionResponse(BaseModel):
    id: str
    name: str
    directory_name: str
    description: str
    enabled: bool
    sort_order: int

    class Config:
        from_attributes = True
