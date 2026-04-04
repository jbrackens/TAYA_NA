import faker
from django.test import TestCase

from .factory import CustomUserFactory

fake = faker.Faker('en')


class EmailModelBackendTestCase(TestCase):
    def setUp(self):
        self.email = fake.email()
        self.password = fake.password()

        self.user = CustomUserFactory(email=self.email, password=self.password)

    def test_simple_login(self):
        self.assertTrue(self.client.login(username=self.email, password=self.password))

    def test_simple_wrong_pass(self):
        self.assertFalse(self.client.login(username=self.email, password=fake.password()))

    def test_simple_wrong_username(self):
        self.assertFalse(self.client.login(username=fake.email(), password=self.password))

    def test_login_inactive_user(self):
        self.user.deactivate_user()
        self.assertFalse(self.client.login(username=self.email, password=self.password))

    def test_login_active_user(self):
        self.user.activate_user()
        self.user.emails.first().set_verified()
        self.assertTrue(self.client.login(username=self.email, password=self.password))
