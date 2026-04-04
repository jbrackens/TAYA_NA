from django.contrib.auth import get_user_model
from django.test import TestCase

from oidc.tests.factory import OidcClientExtraFactory
from oidc_temp_user.models import ExternalUserMappingModel
from oidc_temp_user.serializers import ExternalUserMappingModelBulkSerializer
from profiles.tests.factory import CustomUserCompanyFactory, CustomUserFactory
import faker
import logging

logger = logging.getLogger(__name__)
fake = faker.Faker('en_GB')


def generate_external_user_mapping_data(company_id=None, external_user_id=None, email=None):
    if company_id is None:
        company = CustomUserCompanyFactory()
        company_id = company.company.id
    if external_user_id is None:
        external_user_id = 'fake_{}'.format(fake.user_name())
    if email is None:
        del email
    return dict(locals())


class ExternalUserMappingModelBulkSerializerTestCase(TestCase):
    user_company = None
    user = None
    external_user_id = None
    oidc_client = None

    @classmethod
    def setUpTestData(cls):
        cls.oidc_client = OidcClientExtraFactory()
        cls.user_company = cls.oidc_client.user
        cls.user_company_id = str(cls.user_company.company.id)
        cls.user = CustomUserFactory()

    def setUp(self):
        self.external_user_id = 'fake_{}'.format(fake.user_name())

    def generate_data(self, company=None, ext_user_id=None, email=None):
        if company is None:
            company = self.user_company_id
        if ext_user_id is None:
            ext_user_id = self.external_user_id
        return generate_external_user_mapping_data(company_id=company, external_user_id=ext_user_id, email=email)

    def test_new_user(self):
        email = fake.email()
        data = [self.generate_data(email=email)]
        logger.info(data)
        e = ExternalUserMappingModelBulkSerializer(data={'data': data})

        e.is_valid(raise_exception=True)
        result = e.save()
        logger.info(result)
        self.assertEqual(len(result.get('processed')), 1)
        result_row = result.get('processed').pop()
        self.assertTrue(result_row.get('created'))
        self.assertEqual(result_row.get('company_id'), self.user_company_id)
        self.assertEqual(result_row.get('email'), email)
        self.assertEqual(result_row.get('external_user_id'), self.external_user_id)
        self.assertTrue(
            ExternalUserMappingModel.objects.filter(company_id=self.user_company_id, external_user_id=self.external_user_id).exists()
        )
        self.assertTrue(get_user_model().objects.filter(sub=result_row.get('user_sub')).exists())
        self.assertTrue(get_user_model().objects.filter(sub=result_row.get('user_sub'), is_temporary=True).exists())
        self.assertTrue(get_user_model().objects.filter(sub=result_row.get('user_sub'), is_limited=True).exists())

    def test_no_user_in_system_and_no_email_provided(self):
        data = [self.generate_data()]
        logger.info(data)
        e = ExternalUserMappingModelBulkSerializer(data={'data': data})

        e.is_valid(raise_exception=True)
        result = e.save()
        logger.info(result)
        self.assertEqual(len(result.get('rejected')), 1)
        result_row = result.get('rejected').pop()
        errors = result_row.get('errors')
        self.assertEqual(len(errors), 1)
        error = errors.pop()
        self.assertIsNotNone(error.get('email'))

    def test_user_in_system_no_mapping(self):
        new_user = CustomUserFactory()

        data = [self.generate_data(email=new_user.email)]
        logger.info(data)
        e = ExternalUserMappingModelBulkSerializer(data={'data': data})

        e.is_valid(raise_exception=True)
        result = e.save()
        logger.info(result)

        self.assertEqual(len(result.get('processed')), 1)
        result_row = result.get('processed').pop()
        self.assertFalse(result_row.get('created'))
        self.assertEqual(result_row.get('company_id'), self.user_company_id)
        self.assertEqual(result_row.get('email'), new_user.email)
        self.assertEqual(result_row.get('user_sub'), new_user.sub)
        self.assertEqual(result_row.get('external_user_id'), self.external_user_id)
        self.assertTrue(
            ExternalUserMappingModel.objects.filter(company_id=self.user_company_id, external_user_id=self.external_user_id).exists()
        )

    def test_user_and_mapping_in_system_duplication_check(self):
        new_user = CustomUserFactory()
        data = [self.generate_data(email=new_user.email)]  # creating mapping
        e = ExternalUserMappingModelBulkSerializer(data={'data': data})
        e.is_valid(raise_exception=True)
        e.save()

        data = [self.generate_data(email=new_user.email)]  # creating mapping
        e = ExternalUserMappingModelBulkSerializer(data={'data': data})
        e.is_valid(raise_exception=True)
        result = e.save()

        logger.info(result)

        self.assertEqual(len(result.get('skipped')), 1)
        result_row = result.get('skipped').pop()
        self.assertFalse(result_row.get('created'))
        self.assertEqual(result_row.get('company_id'), self.user_company_id)
        self.assertEqual(result_row.get('email'), new_user.email)
        self.assertEqual(result_row.get('user_sub'), new_user.sub)
        self.assertEqual(result_row.get('external_user_id'), self.external_user_id)
        self.assertTrue(
            ExternalUserMappingModel.objects.filter(company_id=self.user_company_id, external_user_id=self.external_user_id).exists()
        )
