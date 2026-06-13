from django.contrib import admin
from django.utils.safestring import mark_safe
from html_sanitizer.django import get_sanitizer

from common.admin import CommonModelAdmin, CommonModeStackedAdmin
from profiles.models import CustomUser

from . import models


@admin.register(models.OidcPermissions)
class OidcPermissionsAdmin(CommonModelAdmin):
    fields = ("name", "description")
    list_display = ("better_name", "description")

    def better_name(self, obj):
        return mark_safe(f"<code>{get_sanitizer('strict').sanitize(obj.name)}</code>")  # nosec

    better_name.short_description = "Name"


class SocialSecretInLine(CommonModeStackedAdmin):
    model = models.SocialSecret
    fields = ("social_type", "client_id", "client_secret")


@admin.register(models.OidcClientExtra)
class OidcClientExtraAdmin(CommonModelAdmin):
    inlines = [SocialSecretInLine]
    list_select_related = ("oidc_client", "user")
    fields = (
        "oidc_client",
        "default_permissions_set",
        "limited_permissions_set",
        "user",
    )
    raw_id_fields = (
        "oidc_client",
        "user",
    )
    list_display = (
        "oidc_client",
        "user__sub",
    )
    filter_horizontal = (
        "default_permissions_set",
        "limited_permissions_set",
    )

    def user__sub(self, obj: CustomUser):
        return obj.user.sub


@admin.register(models.ExternalUserMappingModel)
class ExternalUserMappingAdmin(CommonModelAdmin):
    fields = ("external_user_id", "originator", "custom_user")
    list_display = ("external_user_id", "originator", "custom_user")
