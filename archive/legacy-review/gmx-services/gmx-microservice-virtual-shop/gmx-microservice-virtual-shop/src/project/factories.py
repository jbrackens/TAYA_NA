import logging
from uuid import uuid4

import factory
from faker import Faker
from faker.providers import BaseProvider

logger = logging.getLogger(__name__)
fake = Faker("en")


class RmxUsernameProvider(BaseProvider):
    def rmx_username(self):
        result = "rmx_{}".format(str(uuid4()).replace("-", ""))
        logger.info("Creating rmx_username = {}".format(result))
        return result

    def rmx_company_id(self):
        result = str(uuid4())
        logger.info("Creating rmx_company_id = {}".format(result))
        return result


fake.add_provider(RmxUsernameProvider)

# noinspection PyProtectedMember
factory.Faker._FAKER_REGISTRY["en"] = fake  # Hack for new providers for this locale
