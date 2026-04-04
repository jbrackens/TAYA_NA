import asyncio
import logging
from typing import Optional
from uuid import uuid4

import aioredis
import aioredlock
from aioredis import Redis
from aioredlock import Aioredlock

from user_context import settings
from user_context.schemas.common import ARN, ExternalUserBaseSchema, ExternalUserMappingSchema
from user_context.services import BaseService

logger = logging.getLogger(__name__)


class RedisService(BaseService):
    _connection: Redis = None
    _aio_lock_manager: Aioredlock = None
    _blpop_timeout = 300
    _1w_timeout = 60 * 60 * 24 * 7
    _60s_timeout = 60
    pool_min_size: int = settings.REDIS_POOL_SIZE_MIN
    pool_max_size: int = settings.REDIS_POOL_SIZE_MAX
    pool_connection_timeout: int = 5

    @classmethod
    async def initialize(cls):
        if cls._connection is None:
            cls._connection = await aioredis.create_redis_pool(
                settings.REDIS_CONNECTION_URL,
                minsize=cls.pool_min_size,
                maxsize=cls.pool_max_size,
                timeout=cls.pool_connection_timeout,
            )
            logger.info("{}: Initialized Redis connection".format(cls.__name__))
        if cls._aio_lock_manager is None:
            cls._aio_lock_manager = aioredlock.Aioredlock([cls._connection])
            logger.info("{}: Initialized RedLock connection".format(cls.__name__))

    @classmethod
    async def health_check(cls):
        if not cls._initialization_lock.is_set():
            await asyncio.wait_for(cls.boot_up(), timeout=30)
        result = (await cls._health_check_redis()) and (await cls._health_check_redlock())
        if result:
            # noinspection PyTypeChecker
            cls.set_health_check_details(None)
        return result

    @classmethod
    async def _health_check_redlock(cls):
        try:
            correlation = uuid4().hex
            async with await cls.get_lock(correlation) as lock:
                assert lock.valid
        except Exception as e:
            msg = "RedisLock problem - {}".format(e)
            logger.exception(msg)
            cls.set_health_check_details(msg)
            return False
        return True

    @classmethod
    async def _health_check_redis(cls):
        try:
            correlation = uuid4().hex
            if cls._connection is None:
                cls.set_health_check_details("No connection")
                return False

            await cls._connection.set(correlation, correlation, expire=10)
            result: str = (await cls.get_value(correlation)).decode()
            if correlation != result:
                msg = "Redis problem - value does match {} != {}".format(correlation, result)
                logger.error(msg)
                cls.set_health_check_details(msg)
                return False
        except Exception as e:
            msg = "Redis connection problem - {}".format(e)
            logger.exception(msg)
            cls.set_health_check_details(msg)
            return False
        return True

    @classmethod
    async def deinitialize(cls):
        logger.info("{}: Closing RedLock connection".format(cls.__name__))
        await cls._aio_lock_manager.destroy()
        logger.info("{}: Closing Redis connection".format(cls.__name__))
        cls._connection.close()

    @classmethod
    async def get_lock(cls, resource: str):
        return await cls._aio_lock_manager.lock("lock::{}".format(resource))

    @classmethod
    async def get_user_mapping(cls, external_user: ExternalUserBaseSchema) -> Optional[ExternalUserMappingSchema]:
        arn = external_user.get_arn_mapping()
        logger.info("{}: Locating {} in cache".format(cls.__name__, arn))
        sub = await cls._connection.get(arn)
        if sub is None:
            logger.warning("{}: Mapping for {} not found.".format(cls.__name__, arn))
            return None
        originator_arn = ARN.user_originator(sub)
        originator = await cls._connection.get(originator_arn)
        if originator is None:
            logger.warning("{}: Mapping originator for {} not found.".format(cls.__name__, arn))
            return None
        result = ExternalUserMappingSchema.from_external_user(external_user, user_sub=sub, originator_id=originator)
        return result

    @classmethod
    async def set_user_mapping(cls, external_user: ExternalUserMappingSchema):
        arn = ARN.user_mapping(company_id=external_user.company_id, external_id=external_user.external_user_id)
        originator_arn = ARN.user_originator(sub=external_user.user_sub)
        logger.info("{}: Setting {} in cache".format(cls.__name__, arn))
        if external_user.originator_id:
            await asyncio.gather(
                cls._connection.set(arn, external_user.user_sub, expire=cls._1w_timeout),
                cls._connection.set(originator_arn, external_user.originator_id, expire=cls._1w_timeout),
            )
        else:
            await cls._connection.set(arn, external_user.user_sub, expire=cls._1w_timeout)

    @classmethod
    async def get_value(cls, name: str) -> bytes:
        return await cls._connection.get(name)
