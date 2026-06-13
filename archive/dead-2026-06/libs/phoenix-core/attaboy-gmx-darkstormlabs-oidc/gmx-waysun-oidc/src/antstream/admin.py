from django.contrib import admin

from common.admin import CommonModelAdmin

from . import models


@admin.register(models.AntstreamModel)
class AntstreamModelAdmin(CommonModelAdmin):
    fields = (
        "oidc_client_extra",
        "rsa_key",
    )
    list_display = ("oidc_client_extra", "rsa_key")
