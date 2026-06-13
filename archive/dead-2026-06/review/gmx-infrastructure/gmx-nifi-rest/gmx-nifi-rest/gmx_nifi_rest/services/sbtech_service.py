import logging
from uuid import uuid4

import aiohttp
import aiohttp.client_exceptions
import ujson

from gmx_nifi_rest.exception import SbTokenRefreshError
from gmx_nifi_rest.models import ExternalUserBaseSchema, SbTechTokenExchangeResponse
from gmx_nifi_rest.services import BaseService
from gmx_nifi_rest.settings import SB_TECH_CONFIGURATION

logger = logging.getLogger(__name__)


class SbTokenExchangeService(BaseService):
    _sessions = dict()
    connection_limit: int = 100
    connection_limit_per_host: int = 30
    DEFAULT_HEADERS = {
        "RequestTarget": "AJAXService",
        "Accept-Encoding": "identity",
        "Content-Type": "application/json",
    }

    @classmethod
    async def initialize(cls):
        for srv, url in SB_TECH_CONFIGURATION.items():
            cls._sessions[srv] = {
                "session": aiohttp.ClientSession(
                    connector=aiohttp.TCPConnector(
                        limit=cls.connection_limit, limit_per_host=cls.connection_limit_per_host
                    ),
                    headers=cls.DEFAULT_HEADERS,
                    json_serialize=ujson.dumps,
                ),
                "url": url,
            }
            logger.info("{}: Initialized {}".format(cls.__name__, srv))

    @classmethod
    async def deinitialize(cls):
        for key, item in cls._sessions.items():
            logger.info("{}: Closing session for {}".format(cls.__name__, key))
            session: aiohttp.ClientSession = item.get("session")
            await session.close()

    @classmethod
    def is_valid(cls, company_name):
        return company_name in cls._sessions

    @classmethod
    async def exchange(cls, company: str, sb_token: str) -> ExternalUserBaseSchema:
        corid = uuid4().hex
        if company not in SB_TECH_CONFIGURATION:
            raise ValueError("{} company unknown. Companies known: {}".format(company, SB_TECH_CONFIGURATION.keys()))
        session: aiohttp.ClientSession = cls._sessions.get(company).get("session")
        url: str = cls._sessions.get(company).get("url")
        logger.info("{} Checking Token {} at Endpoint {}".format(corid, sb_token, url))
        async with session.post(url, json={"token": sb_token}, headers=cls.DEFAULT_HEADERS) as resp:
            result = await resp.text()

        if result.startswith("(") and result.endswith(")"):
            result = result[1:-1]

        result = ujson.loads(result)
        logger.info("{} Result {}".format(corid, result))

        if result.get("status") != "success":
            raise SbTokenRefreshError(result.get("message"))
        result = SbTechTokenExchangeResponse(**result)
        return ExternalUserBaseSchema.from_sbtech_token_response(result, company_name=company)
