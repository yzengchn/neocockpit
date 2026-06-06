import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.config.settings import settings
from app.core.database import SessionLocal, load_models
from app.core.logger import setup_logging, get_logger
from app.services.task_recovery import recover_interrupted_tasks


APP_TITLE = "NeoCockpit API"
APP_DESCRIPTION = "AI内容生成平台"
APP_VERSION = "1.0.0"

# 初始化日志系统
setup_logging(
    log_level=settings.LOG_LEVEL,
    log_dir=Path(settings.LOG_DIR) if settings.LOG_DIR else None,
    backup_count=settings.LOG_RETENTION_DAYS,
)
logger = get_logger(__name__)


def _ensure_output_dir() -> None:
    Path(settings.OUTPUT_DIR).mkdir(parents=True, exist_ok=True)


def _bootstrap_database() -> None:
    load_models()

    db = SessionLocal()
    try:
        recover_interrupted_tasks(db)
    finally:
        db.close()


def _log_background_task_result(task: asyncio.Task) -> None:
    try:
        task.result()
    except asyncio.CancelledError:
        logger.info("Startup queue trigger was cancelled")
    except Exception:
        logger.exception("Startup queue trigger failed")


def _trigger_task_queue() -> asyncio.Task:
    from app.services.task_queue import task_queue

    task = asyncio.create_task(task_queue.process_next_task())
    task.add_done_callback(_log_background_task_result)
    return task


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize runtime resources and resume queued work."""
    logger.info("Application startup initiated")
    _ensure_output_dir()
    _bootstrap_database()
    queue_trigger = _trigger_task_queue()
    app.state.startup_queue_trigger = queue_trigger
    logger.info("Application startup completed")
    try:
        yield
    finally:
        logger.info("Application shutdown initiated")
        if not queue_trigger.done():
            queue_trigger.cancel()
            await asyncio.gather(queue_trigger, return_exceptions=True)
        logger.info("Application shutdown completed")


app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan,
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 注册路由
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": APP_TITLE,
        "version": APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": APP_TITLE,
        "version": APP_VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    # uvicorn 自动使用 Python logging 系统，无需额外配置
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
