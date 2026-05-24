from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import api_router
from app.config.settings import settings
from app.core.database import init_db
import os

# 创建必要的目录
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

# 初始化数据库
init_db()

# Seed default data
from app.core.database import SessionLocal
from app.services.icon_seeder import seed_icon_descriptions
from app.services.ai_provider_seeder import seed_ai_providers
_seed_db = SessionLocal()
try:
    seed_icon_descriptions(_seed_db)
    seed_ai_providers(_seed_db)
finally:
    _seed_db.close()

app = FastAPI(
    title="NeoCockpit API",
    description="AI内容生成平台",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录（用于访问生成的图片）
app.mount("/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")

# 注册路由
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": "NeoCockpit API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
