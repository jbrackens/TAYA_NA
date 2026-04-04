import asyncio
import logging.config
from uuid import uuid4

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.requests import Request
from starlette.responses import StreamingResponse
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from user_context import settings
from user_context.api.api import api_router
from user_context.http_exceptions import (
    DirectHttpException,
    all_exception_logger,
    direct_http_exception_handler,
    request_validation_exception_handler,
)
from user_context.services.auth_service import RsaKeyRegistryService
from user_context.services.database_service import DatabaseService
from user_context.services.redis_service import RedisService
from user_context.services.secret_box import SecretBoxService

logger = logging.getLogger(__name__)


app = FastAPI(
    version="0.0.1",
    title="GMX WAYSUN USER CONTEXT {} [{}]".format("[DEBUG]" if settings.DEBUG else "", settings.ENVIRONMENT_TYPE),
    redoc_url=f"{settings.API_ENDPOINT_PATH_PREFIX}/docs",
)


@app.middleware("http")
async def log_middleware(request: Request, call_next):
    headers = request.headers
    msg_id = headers.get(settings.API_MESSAGE_HEADER_NAME.lower(), "")
    if msg_id is None or not msg_id:
        msg_id = "user_context:{}".format(uuid4().hex)
    logger.info("Received {}: {}".format(settings.API_MESSAGE_HEADER_NAME, msg_id))
    result: StreamingResponse = await call_next(request)
    logger.info("Finished processing: {}".format(msg_id))
    return result


app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This is used for Direct exceptions to prevent encapsulating in "details" keyword
app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(DirectHttpException, direct_http_exception_handler)
app.add_exception_handler(Exception, all_exception_logger)
#
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(ProxyHeadersMiddleware)


@app.on_event("startup")
async def startup():
    try:
        await asyncio.gather(
            DatabaseService.boot_up(),
            RedisService.boot_up(),
            RsaKeyRegistryService.boot_up(),
            SecretBoxService.boot_up(),
        )
    except Exception:
        logger.exception("ERROR during startup")
        raise


@app.on_event("shutdown")
async def shutdown():
    await asyncio.gather(
        DatabaseService.shutdown(),
        RedisService.shutdown(),
        SecretBoxService.shutdown(),
        RsaKeyRegistryService.shutdown(),
    )


@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    request.state.db = ...
    try:
        response = await call_next(request)
    finally:
        if request.state.db is not ...:
            request.state.db.rollback()
            request.state.db.close()
            request.state.db = ...
    return response


app.include_router(api_router, prefix=settings.API_ENDPOINT_PATH_PREFIX)
