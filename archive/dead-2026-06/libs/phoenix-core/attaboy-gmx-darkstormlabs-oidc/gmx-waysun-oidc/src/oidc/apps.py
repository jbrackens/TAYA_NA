import logging

from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)


class OidcConfig(AppConfig):
    name = "oidc"

    def ready(self):
        logger.info("oidc - starting")

        if not settings.TESTS_IN_PROGRESS and not settings.MIGRATIONS_IN_PROGRESS:
            from oidc_provider import models as oidc_models  # noqa

            from oidc.models import OidcPermissions  # noqa

            def filter_existing_kid_permissions(kid):
                return not OidcPermissions.objects.filter(name=f"oidc:sign:{kid.kid}").exists()

            def create_dynamic_kid_permissions(kid):
                logger.info(f"Creating permission for RSA kid: {kid}")
                return OidcPermissions.objects.create(
                    name=f"oidc:sign:{kid}", description="Dynamically created permission based on RSA key KID"
                )

            list(
                map(
                    create_dynamic_kid_permissions,
                    filter(filter_existing_kid_permissions, oidc_models.RSAKey.objects.all()),
                )
            )

        logger.info("oidc - ready")
