import logging

from common.tests.common import AbstractCommonTest
from profiles.serializers.admin_profile import AdminProfileSerializer, CreateAdminProfileSerializer
from profiles.serializers.profile import CompanySerializer, ProfileSerializer, SignSerializer

logger = logging.getLogger(__name__)


class TestSerializersNotImplementedMethods(AbstractCommonTest):
    target_url_name = "profiles:profile_rud"
    # target_view_class = ProfileRetrieveUpdateAPIView

    def test_company_serializer_create(self):
        with self.assertRaises(NotImplementedError, msg="Please use administration panel!"):
            CompanySerializer.create(self, self.target_url_name)  # noqa

    def test_company_serializer_update(self):
        with self.assertRaises(NotImplementedError, msg="Please use administration panel!"):
            CompanySerializer.update(self, self.target_url_name, self.target_url_name)  # noqa

    def test_profile_serializer_create(self):
        with self.assertRaises(NotImplementedError, msg="Please use registration form!") as e:
            ProfileSerializer.create(self, self.target_url_name)  # noqa

    def test_admin_profile_serializer_create(self):
        with self.assertRaises(NotImplementedError, msg="Please use registration form!") as e:
            AdminProfileSerializer.create(self, self.target_url_name)  # noqa

    def test_admin_profile_serializer_update(self):
        with self.assertRaises(NotImplementedError, msg="Please use registration form!") as e:
            CreateAdminProfileSerializer.update(self, self.target_url_name, self.target_url_name)  # noqa

    def test_sign_serializer_update(self):
        with self.assertRaises(NotImplementedError, msg="Please use administration panel!"):
            SignSerializer.update(self, self.target_url_name, self.target_url_name)  # noqa
