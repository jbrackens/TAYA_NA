import logging

import responses
from aws_rest_default import settings as aws_settings
from django.conf import settings
from faker import Faker

from project.factories import RmxUsernameProvider
from project.settings.services import PROCESS_CONTROLLER_HOST

logger = logging.getLogger(__name__)
fake = Faker("en")
ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO = "{}/pc/token_exchange/for_user_info/sb_tech".format(PROCESS_CONTROLLER_HOST)
fake.add_provider(RmxUsernameProvider)
ENDPOINT_FOR_CREATE_OR_GET_USER = "{}/oidc/get_or_create_ext_user".format(settings.OIDC_HOST)


class FakeRequest(object):
    def __init__(self):
        self.auth = {"id_token": "random token"}
        self.META = {aws_settings.get("META_MESSAGE_HEADER_NAME"): "testing"}
        self.user = {"random_user"}


# noinspection PyUnresolvedReferences
class PcServiceResponsesFactory(object):
    @classmethod
    def setup_responses(cls, get_ext_user_response=None):
        if get_ext_user_response is None:
            get_ext_user_response = cls.get_ext_user_response()
        responses.add(responses.POST, ENDPOINT_FOR_CREATE_OR_GET_USER, json=get_ext_user_response)

    @staticmethod
    def get_ext_user_response(user_sub=None):
        if user_sub is None:
            user_sub = fake.rmx_username()
        return {"user_sub": user_sub}
