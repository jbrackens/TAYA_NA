import logging
from collections import namedtuple

import aioredlock
import redis
import ujson
from aioredlock import Aioredlock
from django.conf import settings
from django.core.cache import cache
from redis import Redis

from virtual_shop.tools import ARN

logger = logging.getLogger(__name__)


class RedisService:
    _connection: Redis = None
    _aio_lock_manager: Aioredlock = None
    _blpop_timeout = 300
    _1w_timeout = 60 * 60 * 24 * 7
    _60s_timeout = 60
    pool_min_size: int = 10
    pool_max_size: int = 50
    pool_connection_timeout: int = 5

    def __init__(self):
        if self._connection is None:
            self._connection = redis.Redis(
                settings.REDIS_CONNECTION_URL,
                socket_timeout=self.pool_connection_timeout,
            )
            logger.info("{}: Initialized Redis connection".format(self.__class__.__name__))
        if self._aio_lock_manager is None:
            self._aio_lock_manager = aioredlock.Aioredlock([self._connection])
            logger.info("{}: Initialized RedLock connection".format(self.__class__.__name__))

    def deinitialize(self):
        logger.info(
            "{}: Closing RedLock connection".format(
                self.__class__.__name__,
            )
        )
        cache.destroy()
        logger.info(
            "{}: Closing Redis connection".format(
                self.__class__.__name__,
            )
        )
        cache.shutdown()

    @staticmethod
    def get_lock(resource: str):
        return cache.lock("lock::{}".format(resource), expire=settings.LOCK_TIMEOUT)

    def get_avro_schema(self, subject):
        arn = ARN.avro_schema(subject)
        schema_version = namedtuple(typename="schema_version", field_names=["subject", "schema_id", "version"])
        logger.info("{}: Locating {} in cache".format(self.__class__.__name__, arn))
        result = cache.get(arn)
        if result is None:
            logger.warning("{}: Mapping for {} not found.".format(self.__class__.__name__, arn))
            return None

        result = ujson.loads(result)
        result = schema_version(**result)

        return result

    def set_avro_schema(self, avro_schema, subject):
        arn = ARN.avro_schema(subject)
        logger.info("{}: Setting {} in cache".format(self.__class__.__name__, arn))
        cache.set(arn, avro_schema)

    @staticmethod
    def get_value(name: str) -> bytes:
        return cache.get(name)


RedisService = RedisService()
