from django.db import models

from common.models import AbstractUuidModel
from oidc.models import OidcClientExtra


class AntstreamModel(AbstractUuidModel):
    oidc_client_extra = models.ForeignKey(
        OidcClientExtra,
        related_name="antstream_client",
        on_delete=models.PROTECT,
    )
    rsa_key = models.ForeignKey(
        "oidc_provider.RSAKey",
        related_name="antstream_key",
        on_delete=models.PROTECT,
    )
