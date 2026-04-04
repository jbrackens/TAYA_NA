import logging
from decimal import Decimal
from enum import Enum
from uuid import uuid4

import aiohttp.client_exceptions
import ujson

from gmx_nifi_rest import settings
from gmx_nifi_rest.models import ExternalUserBaseSchema, ExternalUserMappingSchema
from gmx_nifi_rest.services import BaseService
from gmx_nifi_rest.services.redis_service import RedisService

logger = logging.getLogger(__name__)


class BaseHttpService(BaseService):
    _session = aiohttp.ClientSession(
        connector=aiohttp.TCPConnector(limit=50, limit_per_host=30),
        headers={"Content-Type": "application/json"},
        json_serialize=ujson.dumps,
    )

    @classmethod
    async def initialize(cls, *args, **kwargs):
        pass

    @classmethod
    async def deinitialize(cls):
        logger.info("{}: Closing open sessions.".format(cls.__name__))
        await cls._session.close()

    @classmethod
    async def get_id_token(cls, key_name: Enum) -> str:
        token: bytes = await RedisService.get_value("id_token__{}".format(key_name.value))
        if token is None:
            raise ValueError("Unable to fetch Token: {}  Nifi is refreshing it?".format(key_name.value))
        return token.decode()

    @classmethod
    async def get(cls, url: str, token: str):
        uid = "NIFI_REST__{}".format(uuid4().hex)
        logger.info("Preparing GET request with ID: {}".format(uid))
        response = await cls._session.get(
            url=url,
            headers={"Authorization": "Bearer {}".format(token), "FS-Api-Message-Id": uid},
            raise_for_status=True,
        )
        return response

    @classmethod
    async def post(cls, url: str, token: str, data):
        uid = "NIFI_REST__{}".format(uuid4().hex)
        logger.info("Preparing POST request with ID: {}".format(uid))
        response = await cls._session.post(
            url=url,
            headers={"Authorization": "Bearer {}".format(token), "FS-Api-Message-Id": uid},
            raise_for_status=True,
            json=data,
        )
        return response


class OidcHttpService(BaseHttpService):
    class Endpoints(Enum):
        GET_OR_CREATE_EXT_USER = settings.GMX_API_GATEWAY + "/oidc/get_or_create_ext_user"

    class Tokens(Enum):
        GET_OR_CREATE_EXT_USER = "GET_OR_CREATE_EXT_USER"

    @classmethod
    async def get_external_user_mapping(cls, external_user: ExternalUserBaseSchema) -> ExternalUserMappingSchema:
        url = cls.Endpoints.GET_OR_CREATE_EXT_USER.value
        token = await cls.get_id_token(cls.Tokens.GET_OR_CREATE_EXT_USER)
        data = {
            "company_id": external_user.company_id,
            "external_user_id": external_user.external_user_id,
        }
        if external_user.email:
            data["email"] = external_user.email
        response = await cls.post(url=url, token=token, data=data)
        result_data = await response.json()
        user_sub = result_data.get("user_sub")
        originator_id = result_data.get("originator_id")
        result = ExternalUserMappingSchema.from_external_user(
            external_user=external_user, user_sub=user_sub, originator_id=originator_id
        )
        return result


class WalletHttpService(BaseHttpService):
    class Endpoints(Enum):
        USER_BALANCE_FROM_COMPANY = settings.GMX_API_GATEWAY + "/wallet/balance/{user_sub}/{company_id}"

    class Tokens(Enum):
        GET_BALANCE_FROM_COMPANY = "EXT_TOP_UP_USER"  # in future every call will have own token

    @classmethod
    async def get_balance_from_company(cls, user_sub: str, company_id: str) -> Decimal:
        """
        This endpoint must be used if context of asking is not our, i.e. request came from partner.
        This is important because with this request originator of the wallet is being set during first request.
        In next couple of days on Nifi will be implemented auto-creating user in all microservices when user
        registers so this will be obsolete.
        """
        url = cls.Endpoints.USER_BALANCE_FROM_COMPANY.value.format_map({"user_sub": user_sub, "company_id": company_id})
        token = await cls.get_id_token(cls.Tokens.GET_BALANCE_FROM_COMPANY)
        response = await cls.get(url=url, token=token)
        result = await response.json()
        current_balance = Decimal(result.get("current_balance"))
        return current_balance


class VirtualShopHttpService(BaseHttpService):
    class Endpoints(Enum):
        TAGS_WHITELIST = settings.GMX_API_GATEWAY + "/virtual_shop/cs_admin_tags"

    class Tokens(Enum):
        GET_TAGS_WHITELIST = "TAGS_WHITELIST"  # in future every call will have own token

    @classmethod
    async def get_tags_whitelist(cls):
        url = cls.Endpoints.TAGS_WHITELIST.value
        token = await cls.get_id_token(cls.Tokens.GET_TAGS_WHITELIST)
        response = await cls.get(url=url, token=token)
        result = await response.json()

        return result


class JiraHttpService(BaseService):
    BASIC_JIRA_TOKEN = settings.BASIC_JIRA_TOKEN

    class Endpoints(Enum):
        ADD_JIRA_COMMENT = settings.JIRA_API_GATEWAY + "/rest/api/latest/issue/{key}/comment"
        CHANGE_JIRA_TRANSITIONS = settings.JIRA_API_GATEWAY + "/rest/api/latest/issue/{key}/transitions"
        EDIT_JIRA_ISSUE = settings.JIRA_API_GATEWAY + "/rest/api/latest/issue/{key}"
        DELETE_JIRA_ATTACHMENT = settings.JIRA_API_GATEWAY + "/rest/api/latest/attachment/{attachment_id}"

    _session = aiohttp.ClientSession(
        connector=aiohttp.TCPConnector(limit=50, limit_per_host=30),
        headers={"Content-Type": "application/json"},
        json_serialize=ujson.dumps,
    )

    @classmethod
    async def initialize(cls, *args, **kwargs):
        pass

    @classmethod
    async def deinitialize(cls):
        logger.info("{}: Closing open sessions.".format(cls.__name__))
        await cls._session.close()

    @classmethod
    async def get(cls, url: str):
        uid = "NIFI_REST__{}".format(uuid4().hex)
        logger.info("Preparing GET request with ID: {}".format(uid))
        response = await cls._session.get(
            url=url,
            headers={"Authorization": "Basic {}".format(cls.BASIC_JIRA_TOKEN), "FS-Api-Message-Id": uid},
            raise_for_status=True,
        )
        return response

    @classmethod
    async def post(cls, url: str, data):
        uid = "NIFI_REST__{}".format(uuid4().hex)
        logger.info("Preparing POST request with ID: {}\n and URL:{}".format(uid, url))
        response = await cls._session.post(
            url=url,
            headers={"Authorization": "Basic {}".format(cls.BASIC_JIRA_TOKEN), "FS-Api-Message-Id": uid},
            raise_for_status=True,
            json=data,
        )
        logger.info(response)
        return response

    @classmethod
    async def delete(cls, url: str):
        uid = "NIFI_REST__{}".format(uuid4().hex)
        logger.info("Preparing POST request with ID: {}\n and URL:{}".format(uid, url))
        response = await cls._session.delete(
            url=url,
            headers={"Authorization": "Basic {}".format(cls.BASIC_JIRA_TOKEN), "FS-Api-Message-Id": uid},
            raise_for_status=True,
        )
        return response

    @classmethod
    async def put(cls, url: str, data):
        uid = "NIFI_REST__{}".format(uuid4().hex)
        logger.info("Preparing POST request with ID: {}".format(uid))
        response = await cls._session.put(
            url=url,
            headers={"Authorization": "Basic {}".format(cls.BASIC_JIRA_TOKEN), "FS-Api-Message-Id": uid},
            raise_for_status=True,
            json=data,
        )
        return response

    @classmethod
    async def add_jira_comment(cls, key: str, data: str) -> []:
        url = cls.Endpoints.ADD_JIRA_COMMENT.value.format_map({"key": key})
        data = {"body": "{}".format(data)}
        response = await cls.post(url=url, data=data)
        result = await response.json()
        return result

    @classmethod
    async def change_jira_transitions(cls, key: str, data: str) -> []:
        url = cls.Endpoints.CHANGE_JIRA_TRANSITIONS.value.format_map({"key": key})
        data = {"transition": {"id": "{}".format(data)}}
        response = await cls.post(url=url, data=data)
        result = await response.json()
        return result

    @classmethod
    async def delete_jira_attachment(cls, attachment_id: str) -> []:
        url = cls.Endpoints.DELETE_JIRA_ATTACHMENT.value.format_map({"attachment_id": attachment_id})
        response = await cls.delete(url=url,)
        result = await response.json()
        return result

    @classmethod
    async def edit_jira_issue(cls, key: str, data: str) -> []:
        url = cls.Endpoints.EDIT_JIRA_ISSUE.value.format_map({"key": key})
        response = await cls.put(url=url, data=data)
        result = await response.json()
        return result

    @classmethod
    async def get_attachment(cls, url: str):
        """
        This endpoint must be used if context of asking is not our, i.e. request came from partner.
        This is important because with this request originator of the wallet is being set during first request.
        In next couple of days on Nifi will be implemented auto-creating user in all microservices when user
        registers so this will be obsolete.
        """
        response = await cls.get(url=url,)
        result = await response.text()
        return result
