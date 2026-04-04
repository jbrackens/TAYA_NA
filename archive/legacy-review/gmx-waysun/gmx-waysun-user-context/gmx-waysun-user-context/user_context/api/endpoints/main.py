import asyncio
import logging
from typing import Tuple

import ujson
from fastapi import APIRouter, HTTPException

from user_context.schemas.common import HealthCheckStatus, HealthCheckStatusRow
from user_context.services.auth_service import RsaKeyRegistryService
from user_context.services.database_service import DatabaseService
from user_context.services.redis_service import RedisService
from user_context.services.secret_box import SecretBoxService

logger = logging.getLogger(__name__)


router = APIRouter()


@router.get("/")
async def root():
    return {"message": "Hello World"}


@router.get("/health_check", response_model=HealthCheckStatus)
async def health_check() -> HealthCheckStatus:
    result: Tuple[HealthCheckStatusRow, ...] = await asyncio.gather(
        DatabaseService.get_status(),
        RsaKeyRegistryService.get_status(),
        RedisService.get_status(),
        SecretBoxService.get_status(),
    )
    status = True
    for item in result:
        status = status and item.status
        if not status:
            break
    response = HealthCheckStatus(details=result)
    if not status:
        logger.info("Health check: ERROR - {}".format(ujson.dumps(response.dict())))
        raise HTTPException(status_code=500, detail=response.dict())
    logger.info("Health check: OK")
    return response
