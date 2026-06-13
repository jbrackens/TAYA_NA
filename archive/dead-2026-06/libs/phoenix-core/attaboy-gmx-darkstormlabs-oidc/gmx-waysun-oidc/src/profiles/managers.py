import secrets
import string
from uuid import uuid4

from django.contrib.auth.models import UserManager

from common.models import CommonManager


class CustomUserManager(CommonManager, UserManager):
    def filter_by_username(self, username, *filter_args, **filter_kwargs):
        return self.filter(*filter_args, username=username, **filter_kwargs)

    def filter_by_sub(self, sub, *filter_args, **filter_kwargs):
        return self.filter(*filter_args, sub=sub, **filter_kwargs)

    def filter_by_phone_number(self, phone_number, *filter_args, **filter_kwargs):
        return self.filter(
            *filter_args,
            phone_numbers__phone_number=phone_number,
            phone_numbers__is_deleted=False,
            phone_numbers__is_verified=True,
            **filter_kwargs
        )

    def filter_by_email(self, email, *filter_args, **filter_kwargs):
        return self.filter(
            *filter_args, emails__email=email, emails__is_deleted=False, emails__is_verified=True, **filter_kwargs
        )

    def get_company_user_by_company(self, company):
        return self.filter(is_company=True, company=company).first()

    def get_company_user_by_company_sub(self, company_sub):
        return self.filter(is_company=True, company__sub=company_sub).first()

    def get_by_username(self, username):
        return self.filter_by_username(username=username).get()

    def get_by_sub(self, sub):
        return self.filter_by_sub(sub=sub).get()

    def get_by_phone_number(self, phone_number):
        return self.filter_by_phone_number(phone_number=phone_number).get()

    def get_by_email(self, email):
        return self.filter_by_email(email=email).get()

    def filter(self, *args, **kwargs):
        return (
            super()
            .filter(*args, **kwargs)
            .select_related("company", "originator")
            .prefetch_related("phone_numbers", "emails", "addresses", "oidc_default_permissions_set")
        )

    def all(self):
        return (
            super()
            .all()
            .select_related("company", "originator")
            .prefetch_related("phone_numbers", "emails", "addresses", "oidc_default_permissions_set")
        )

    def _create_user(
        self,
        username,
        password,
        email=None,
        email_is_verified=False,
        phone_number=None,
        phone_number_is_verified=False,
        **extra_fields
    ):
        """
        Creates and saves a User with the given username, email and password.
        """
        if not username:
            raise ValueError("The given username must be set")
        if email:
            email = self.normalize_email(email)
        username = self.model.normalize_username(username)
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        if email:
            user.emails.create(email=email, is_verified=email_is_verified, is_primary=True)
        if phone_number:
            user.phone_numbers.create(phone_number=phone_number, is_verified=phone_number_is_verified, is_primary=True)
        return user

    def create_simple_user(
        self,
        originator,
        username=None,
        password=None,
        is_active=True,
        is_company=False,
        is_limited=True,
        is_temporary=True,
    ):
        if username is None:
            username = uuid4().hex
        if password is None:
            letters = string.ascii_letters + string.digits
            password = "".join(secrets.choice(letters) for _ in range(60))
        user = self.model(
            username=username,
            is_active=is_active,
            is_company=is_company,
            is_limited=is_limited,
            is_temporary=is_temporary,
            originator_id=originator.pk,
        )
        user.set_password(password)
        user.full_clean()
        user.save()
        return user
