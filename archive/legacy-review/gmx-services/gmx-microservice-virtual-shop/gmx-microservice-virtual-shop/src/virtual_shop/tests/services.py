import logging

import responses
from django.conf import settings
from django.test import TestCase
from faker import Faker

from project.factories import RmxUsernameProvider
from services.factories import PcServiceResponsesFactory
from services.pc_service import PcService

logger = logging.getLogger(__name__)

fake = Faker("en")
fake.add_provider(RmxUsernameProvider)

FAKE_ID_TOKEN = "FAKE_ID_TOKEN"
FAKE_EXPIRES_IN = 15


class PcServiceTest(TestCase):
    def setUp(self):
        self.fake_user_sub = fake.rmx_username()
        responses.add(
            responses.POST,
            settings.OIDC_AUTHENTICATION_URL,
            json={"id_token": FAKE_ID_TOKEN, "expires_in": FAKE_EXPIRES_IN},
            status=200,
        )
        self.EXAMPLE_RESPONSE = {
            "company_id": fake.rmx_company_id(),
            "external_user_id": fake.numerify("########"),
            "email": fake.email(),
            "first_name": fake.user_name(),
            "user_sub": self.fake_user_sub,
        }

    @classmethod
    def setUpTestData(cls):
        cls.get_ext_user_response = PcServiceResponsesFactory.get_ext_user_response()

    def setUpResponses(self):
        logger.info("Setting PcService")
        PcServiceResponsesFactory.setup_responses(get_ext_user_response=self.get_ext_user_response)

    # noinspection PyUnresolvedReferences
    @responses.activate
    def test_get_ext_user(self):
        """
        Testing responses coverage for get_ext_user
        """
        responses.add(responses.POST, PcService.ENDPOINT_SBTECH_TOKEN_FOR_USER_INFO, json=self.get_ext_user_response)
        self.setUpResponses()
        response = PcService().exchange_sb_token_for_user("a", "b")

        self.assertEqual(response, self.get_ext_user_response)
