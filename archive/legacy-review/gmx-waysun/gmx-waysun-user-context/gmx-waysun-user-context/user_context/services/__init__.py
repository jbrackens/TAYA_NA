import asyncio
import logging

from user_context.schemas.common import HealthCheckStatusRow

logger = logging.getLogger(__name__)


class BaseService:
    _initialization_lock: asyncio.Event = None
    health_check_message: str = None

    @classmethod
    async def wait_until_initialized(cls):
        logger.info("{}: Waiting for initialized flag...".format(cls.__name__))
        await asyncio.wait_for(cls._initialization_lock.wait(), timeout=30)
        logger.info("{} Flag is ON, resuming".format(cls.__name__))

    @classmethod
    async def initialize(cls, *args, **kwargs):
        raise NotImplemented("Initialize must be implemented")

    @classmethod
    async def deinitialize(cls):
        raise NotImplemented("Deinitialize must be implemented")

    @classmethod
    async def health_check(cls):
        return True

    @classmethod
    def set_health_check_details(cls, message: str):
        cls.health_check_message = message

    @classmethod
    async def boot_up(cls, *args, **kwargs):
        cls._initialization_lock = asyncio.Event()
        logger.info("{}: Initializing started.".format(cls.__name__))

        try:
            await cls.initialize(*args, **kwargs)
        except Exception as e:
            logger.exception("{} initialization error: {}".format(cls.__name__, e))
            return
        cls._initialization_lock.set()
        logger.info("{}: Initializing finished.".format(cls.__name__))
        await cls.health_check()

    @classmethod
    async def shutdown(cls):
        await cls.wait_until_initialized()
        logger.info("{}: Shutdown started.".format(cls.__name__))
        try:
            await cls.deinitialize()
        except Exception as e:
            logger.exception("{} shutdown error: {}".format(cls.__name__, e))

        logger.info("{}: Shutdown finished.".format(cls.__name__))

    @classmethod
    async def get_status(cls) -> HealthCheckStatusRow:
        name: str = cls.__name__
        try:
            status: bool = await cls.health_check()
        except Exception as e:
            logger.exception("{} health check problem: {}".format(cls.__name__, e))
            status = False

        details: str = cls.health_check_message

        return HealthCheckStatusRow(**locals())
