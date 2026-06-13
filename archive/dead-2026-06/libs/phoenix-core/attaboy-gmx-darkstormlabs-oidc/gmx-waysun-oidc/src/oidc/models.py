import re
from typing import Iterable, Set

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils.deconstruct import deconstructible

from common.models import AbstractUuidModel
from oidc.managers import CustomOidcClientExtraManager


@deconstructible
class ASCIIValidator(RegexValidator):
    regex = r"^[a-z:]+\Z"
    message = 'Enter a valid permission. This value may contain only English letters and ":" character.'
    flags = re.ASCII


class OidcPermissions(AbstractUuidModel):
    str_extra_fields = ("name",)
    name = models.CharField(max_length=255, blank=False, unique=True, validators=[ASCIIValidator()])
    description = models.CharField(max_length=1000, blank=True, default="")

    def clean(self):
        self.name = self.name.strip().lower()

    class Meta:
        ordering = [
            "name",
        ]

    def __str__(self):
        return f"Permission({self.name})"


class OidcClientExtra(AbstractUuidModel):
    objects = CustomOidcClientExtraManager()

    str_extra_fields = ("oidc_client",)
    oidc_client = models.OneToOneField(
        "oidc_provider.Client",
        related_name="extra",
        on_delete=models.PROTECT,
    )
    default_permissions_set = models.ManyToManyField(
        OidcPermissions, related_name="oidc_extra_default_permission_set", blank=True
    )
    limited_permissions_set = models.ManyToManyField(
        OidcPermissions, related_name="oidc_extra_limited_permission_set", blank=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        limit_choices_to={"is_company": True},
        related_name="oidc_client_extra",
        on_delete=models.PROTECT,
    )

    def clean(self):
        errors = {}
        if not self.user.is_company:
            errors["user"] = [
                ValidationError("Only Company users can be attached to OIDC Extra Profile.", code="invalid")
            ]
        if errors:
            raise ValidationError(errors)
        return super().clean()

    @property
    def default_permissions(self) -> Set[OidcPermissions]:
        _default_permissions = getattr(self, "_default_permissions", None)
        if _default_permissions is None:
            _default_permissions = set(_ for _ in self.default_permissions_set.all())
            self._default_permissions = _default_permissions
        return _default_permissions

    def get_default_permissions(self) -> Set[OidcPermissions]:
        """
        Function used to return sorted, unified list of permissions
        :return: set of PermissionNode
        """
        return self.default_permissions

    def get_default_permissions_str(self) -> Iterable[str]:
        return list(_.name for _ in self.default_permissions)

    @property
    def limited_permissions(self) -> Set[OidcPermissions]:
        _limited_permissions = getattr(self, "_limited_permissions", None)
        if _limited_permissions is None:
            _limited_permissions = set(_ for _ in self.limited_permissions_set.all())
            self._limited_permissions = _limited_permissions
        return _limited_permissions

    def get_limited_permissions(self) -> Set[OidcPermissions]:
        """
        Function used to return sorted, unified list of permissions
        :return: set of PermissionNode
        """
        return self.limited_permissions

    def get_limited_permissions_str(self) -> Iterable[str]:
        return list(_.name for _ in self.limited_permissions)


class SocialSecret(AbstractUuidModel, models.Model):
    class SocialTypeChoices(models.TextChoices):
        WECHAT = "wc", "WECHAT"
        CHINA_MOBILE = "cm", "CHINA_MOBILE"

    oidc_client_extra = models.ForeignKey(
        OidcClientExtra,
        related_name="social_secrets",
        on_delete=models.PROTECT,
    )
    social_type = models.CharField(max_length=2, choices=SocialTypeChoices.choices, db_index=True)
    client_id = models.CharField(max_length=200)
    client_secret = models.CharField(max_length=200)


class ExternalUserMappingModel(AbstractUuidModel):
    external_user_id = models.CharField(max_length=150, db_index=True)
    originator = models.ForeignKey(
        "profiles.Company", related_name="originator_external_mapping", on_delete=models.PROTECT
    )
    custom_user = models.ForeignKey(
        "profiles.CustomUser", related_name="users_external_mapping", on_delete=models.CASCADE
    )

    @staticmethod
    def get_cache_arn(company_sub, external_user_id):
        return f"arn::oidc::cache::external_user_mapping::{company_sub}::{external_user_id}"
