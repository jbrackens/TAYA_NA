import asyncio
import logging
from uuid import uuid4

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.requests import Request
from starlette.responses import StreamingResponse
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from gmx_nifi_rest import settings
from gmx_nifi_rest.http_exceptions import (
    DirectHttpException,
    all_exception_logger,
    direct_http_exception_handler,
    request_validation_exception_handler,
)
from gmx_nifi_rest.services.auth_service import RsaKeyRegistryService
from gmx_nifi_rest.services.avro_schema import AvroService
from gmx_nifi_rest.services.http_service import JiraHttpService, OidcHttpService, WalletHttpService
from gmx_nifi_rest.services.kafka_service import KafkaService
from gmx_nifi_rest.services.redis_service import RedisService
from gmx_nifi_rest.services.sbtech_service import SbTokenExchangeService
from gmx_nifi_rest.services.schema_registry import SchemaRegistry
from gmx_nifi_rest.services.secret_box import SecretBoxService

logger = logging.getLogger(__name__)

app = FastAPI(
    version="0.0.1",
    title="GMX Nifi REST {} [{}]".format("[DEBUG]" if settings.DEBUG else "", settings.ENVIRONMENT_TYPE),
    redoc_url="/pc/docs",
)


@app.middleware("http")
async def log_middleware(request: Request, call_next):
    headers = request.headers
    msg_id = headers.get("fs-message-api-id", "")
    if msg_id is None or not msg_id:
        msg_id = "new_nifi_rest_{}".format(uuid4().hex)
    logger.info("Received FS-Message-ID {}".format(msg_id))
    result: StreamingResponse = await call_next(request)
    logger.info("Finished processing: {}".format(msg_id))
    return result


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This is used for Direct exceptions to prevent encapsulating in "details" keyword
app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(DirectHttpException, direct_http_exception_handler)
app.add_exception_handler(Exception, all_exception_logger)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(ProxyHeadersMiddleware)


@app.on_event("startup")
async def init_app():
    try:
        await asyncio.gather(
            RedisService.boot_up(),
            SbTokenExchangeService.boot_up(),
            SchemaRegistry.boot_up(),
            KafkaService.boot_up(),
            RsaKeyRegistryService.boot_up(),
            SecretBoxService.boot_up(),
            AvroService.boot_up(),
            WalletHttpService.boot_up(),
            OidcHttpService.boot_up(),
            JiraHttpService.boot_up(),
        )
    except Exception:
        logger.exception("ERROR during statup")
        raise


@app.on_event("shutdown")
async def shutdown_app():
    await asyncio.gather(
        KafkaService.shutdown(),
        SbTokenExchangeService.shutdown(),
        RedisService.shutdown(),
        SchemaRegistry.shutdown(),
        SecretBoxService.shutdown(),
        RsaKeyRegistryService.shutdown(),
        AvroService.shutdown(),
        WalletHttpService.shutdown(),
        OidcHttpService.shutdown(),
        JiraHttpService.shutdown(),
    )
