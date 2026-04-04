from typing import Set
from uuid import uuid4

import pytz
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.validators import ASCIIUsernameValidator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField

from common.models import AbstractUuidModel
from oidc.models import OidcPermissions

from . import utils
from .managers import CustomUserManager


class IsPrimaryMixing(models.Model):
    is_primary = models.BooleanField(default=False)

    IS_PRIMARY_GROUPED_BY_FIELD = None

    def set_as_primary(self, **kwargs):
        """
        Set's model as Primary.
        """
        with cache.lock(self.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            if not self.is_primary:
                self.is_primary = True
                try:
                    self.full_clean()
                except ValidationError as e:
                    self.is_primary = False
                    raise e
                self.__class__.objects.filter(
                    **{
                        self.IS_PRIMARY_GROUPED_BY_FIELD: getattr(self, self.IS_PRIMARY_GROUPED_BY_FIELD),
                        "is_primary": True,
                    }
                ).update(is_primary=False)
                self.save(update_fields=["is_primary"], legal_update=True, **kwargs)

    def save(self, *args, **kwargs):
        """
        Method protects against edit for verified entity
        """
        if kwargs.pop("legal_update", False):
            return models.Model.save(self, *args, **kwargs)
        #  TODO
        # if getattr(self, "is_verified", False):
        #     raise ValidationError("Unable to edit verified entity")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.is_primary and not kwargs.get("legal_update", False):
            raise ValidationError("You can NOT remove primary object")
        return super().delete(*args, **kwargs)

    class Meta:
        abstract = True


class IsVerifiedMixing(models.Model):
    is_verified = models.BooleanField(default=False)

    def set_verified(self):
        """
        Method used to set Model as verified.
        """
        with cache.lock(self.arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            if not self.is_verified:
                self.is_verified = True
                try:
                    self.full_clean()
                except ValidationError as e:
                    self.is_verified = False
                    raise e
                self.save(update_fields=["is_verified"], legal_update=True)

    def save(self, *args, **kwargs):
        """
        Method protects against edit for verified entity
        """
        if kwargs.pop("legal_update", False):
            return models.Model.save(self, *args, **kwargs)
        #  TODO
        # if self.is_verified:
        #     raise ValidationError("Unable to edit verified entity")
        return super().save(*args, **kwargs)

    class Meta:
        abstract = True


class Email(IsPrimaryMixing, IsVerifiedMixing, AbstractUuidModel):
    str_extra_fields = ("email",)
    user = models.ForeignKey("CustomUser", related_name="emails", on_delete=models.PROTECT, db_index=True)
    email = models.EmailField(unique=True, db_index=True)

    IS_PRIMARY_GROUPED_BY_FIELD = "user"

    def clean(self):
        """
        Perform Model cross-field validation
        :raise ValidationError if something is wrong
        """
        errors = {}
        if not self.is_verified and self.is_primary:
            errors["is_primary"] = ValidationError(
                "Can NOT set primary flag to unverified Email({})".format(self.email), code="invalid"
            )

        if errors:
            raise ValidationError(errors)


class Phone(IsPrimaryMixing, IsVerifiedMixing, AbstractUuidModel):
    str_extra_fields = ("phone_number",)
    user = models.ForeignKey("CustomUser", related_name="phone_numbers", on_delete=models.PROTECT, db_index=True)
    phone_number = PhoneNumberField(db_index=True, unique=True)

    IS_PRIMARY_GROUPED_BY_FIELD = "user"

    def clean(self):
        """
        Perform Model cross-field validation
        :raise ValidationError if something is wrong
        """
        errors = {}
        if not self.is_verified and self.is_primary:
            errors["is_primary"] = ValidationError(
                "Can NOT set primary flag to unverified Phone({})".format(self.phone_number), code="invalid"
            )

        if errors:
            raise ValidationError(errors)


class AddressMixing(models.Model):
    str_extra_fields = ("country", "city", "line_1")
    COUNTRY_CHOICES = (
        ("uk", "United Kingdom"),
        ("cn", "People's Republic of China"),
    )

    country = models.CharField(max_length=2, choices=COUNTRY_CHOICES, default="uk")
    line_1 = models.CharField(max_length=100)
    line_2 = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=50)
    post_code = models.CharField(max_length=10)
    region = models.CharField(max_length=100, blank=True)

    class Meta:
        abstract = True


class Address(AddressMixing, IsPrimaryMixing, IsVerifiedMixing, AbstractUuidModel):
    user = models.ForeignKey("CustomUser", related_name="addresses", on_delete=models.CASCADE)

    IS_PRIMARY_GROUPED_BY_FIELD = "user"

    def clean(self):
        """
        Perform Model cross-field validation
        :raise ValidationError if something is wrong
        """
        errors = {}
        if not self.is_verified and self.is_primary:
            errors["is_primary"] = ValidationError(
                "Can NOT set primary flag to unverified {}".format(self), code="invalid"
            )

        if errors:
            raise ValidationError(errors)


class Company(AddressMixing, AbstractUuidModel):
    sub = models.UUIDField(db_index=True, default=uuid4)
    name1 = models.CharField(max_length=100)
    name2 = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)

    max_phone_numbers = models.PositiveSmallIntegerField(default=1)
    max_emails = models.PositiveSmallIntegerField(default=1)
    max_addresses = models.PositiveSmallIntegerField(default=1)

    str_extra_fields = ("name1",)

    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return f"Company({self.name1}, {self.sub})"


class SocialAccountDetails(AbstractUuidModel):
    # noinspection PyPep8Naming
    class SocialTypeChoices:
        WECHAT = "wc"
        CHINA_MOBILE = "cm"

        @classmethod
        def to_choices(cls):
            return (
                (cls.WECHAT, "WECHAT"),
                (cls.CHINA_MOBILE, "CHINA_MOBILE"),
            )

    user = models.ForeignKey("CustomUser", related_name="social_accounts_set", on_delete=models.CASCADE)
    social_account_type = models.CharField(max_length=2, choices=SocialTypeChoices.to_choices(), db_index=True)
    social_account_id = models.CharField(max_length=200, blank=False)
    social_account_extra = models.JSONField(default=dict, blank=True)


class CustomUser(AbstractUuidModel, AbstractBaseUser, PermissionsMixin):
    """
    GMX user model.

    Username and password are required. Other fields are optional.
    """

    GENDER_CHOICES = (("U", "Unknown"), ("M", "Male"), ("F", "Female"))
    TIMEZONE_CHOICES = tuple(zip(pytz.common_timezones, pytz.common_timezones))

    str_extra_fields = ("username", "sub", "is_company")

    username = models.CharField(
        max_length=150,
        unique=True,
        default=utils.get_random_display_name,
        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
        validators=[ASCIIUsernameValidator()],
        error_messages={
            "unique": "A user with that username already exists.",
        },
    )

    display_name = models.CharField(
        max_length=100,
        default=utils.get_random_display_name,
        unique=True,
        validators=[ASCIIUsernameValidator()],
    )
    sub = models.CharField(max_length=36, default=utils.generate_user_sub, unique=True, editable=False)

    first_name = models.CharField(max_length=30, blank=True)
    middle_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)

    @property
    def email(self):
        return self.emails.filter(is_primary=True).values_list("email", flat=True).first()

    @property
    def phone_number(self):
        return self.phone_numbers.filter(is_primary=True).values_list("phone_number", flat=True).first()

    date_of_birth = models.DateField(null=True, blank=True)
    date_of_birth_verified = models.BooleanField(default=False)

    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default="U")
    timezone = models.CharField(max_length=100, choices=TIMEZONE_CHOICES, default="GMT")

    originator = models.ForeignKey(
        "CustomUser",
        null=True,
        blank=True,
        limit_choices_to={"is_company": True},
        on_delete=models.PROTECT,
        related_name="introduced_users",
    )
    is_company = models.BooleanField(default=False)
    company = models.ForeignKey(Company, null=True, blank=True, related_name="+", on_delete=models.PROTECT)

    is_staff = models.BooleanField(default=False, help_text="Designates whether the user can log into this admin site.")
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.",
    )
    is_limited = models.BooleanField(default=True, help_text="User must confirm email or phone to become not limited")
    is_test_user = models.BooleanField(default=False, help_text="User test flag")

    is_temporary = models.BooleanField(
        default=False,
        help_text="User created as temporary user. If user is temporary, it can NOT login and is limited!",
    )

    date_joined = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    is_superuser = models.BooleanField(
        default=False, help_text="Designates that this user has all permissions without explicitly assigning them."
    )

    oidc_default_permissions_set = models.ManyToManyField(OidcPermissions, related_name="+", blank=True)

    @property
    def oidc_permissions(self) -> Set[str]:
        _oidc_permissions = getattr(self, "_oidc_permissions", None)
        if _oidc_permissions is None:
            _oidc_permissions = set(_ for _ in self.oidc_default_permissions_set.all())
            self._oidc_permissions = _oidc_permissions
        return _oidc_permissions

    def get_oidc_permissions(self) -> Set[str]:
        return self.oidc_permissions

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"

    def get_full_name(self):
        """
        Returns the first_name plus the last_name, with a space in between.
        """
        full_name = "%s %s" % (self.first_name, self.last_name)
        return full_name.strip()

    def get_short_name(self):
        """Returns the short name for the user."""
        return self.sub

    def email_user(self, subject, message, from_email=None, **kwargs):
        """
        Sends an email to this User.
        """
        send_mail(subject, message, from_email, [self.email], **kwargs)

    def activate_user(self, auto_save=True):
        """
        Method used to mark user as active
        """
        self.is_limited = False
        self.is_active = True
        self.is_temporary = False
        if auto_save:
            self.save(update_fields=["is_limited", "is_active", "is_temporary"])

    def deactivate_user(self, auto_save=True):
        """
        Method used to mark user as not active
        """
        self.is_active = False
        if auto_save:
            self.save(update_fields=["is_active"])

    def change_email(self, new_email):
        """
        Method used to change User's email
        :param new_email: new email to set
        :type new_email: Email, str
        """
        if isinstance(new_email, str):
            new_email_obj = self.emails.filter(email=new_email).first()
        else:
            new_email_obj = self.emails.filter(email=new_email.email).first()

        if new_email_obj is None:
            raise ValidationError(
                {"email": ValidationError("Unable to find email associated with user.", code="invalid")}
            )

        new_email_obj.set_as_primary()

    def clean(self):
        """
        Method used to validate user instance. Yields Validation error on fields that not match cross-validation
        :raise ValidationError: on fields that not-match cross validation
        """
        errors = {}
        if self.is_company and self.company is None:
            errors["is_company"] = [
                ValidationError('Can not set "is_company" when no Company is attached', code="invalid")
            ]
        if not self.is_company and self.company is not None:
            errors["is_company"] = [
                ValidationError('Can not set "company" when "is_company" flag is not set', code="invalid")
            ]

        if self.originator is None and not self.is_company:
            errors["originator"] = [ValidationError("User must have originator if is not a Company!")]

        if self.is_temporary and (not self.is_active or not self.is_limited):
            errors["is_temporary"] = [ValidationError("User flagged as temporary can NOT have Active flag on!")]

        if errors:
            raise ValidationError(errors)

    def get_originator_company(self):
        return getattr(getattr(self, "originator", None), "company", None)
