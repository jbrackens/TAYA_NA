import logging

from django.db.models.signals import post_init, post_save
from django.dispatch import receiver
from oidc_provider import models

logger = logging.getLogger(__name__)
from oidc.models import OidcPermissions


@receiver(post_init, sender=models.RSAKey)
def prepare_rsa_kid(sender, instance, **kwargs):  # noqa: F841
    instance._kid = instance.kid


@receiver(post_save, sender=models.RSAKey)
def create_rsa_permission(sender, instance, **kwargs):  # noqa: F841
    if instance._kid == instance.kid:
        return None

    if not OidcPermissions.objects.filter(name=f"oidc:sign:{instance.kid}").exists():
        logger.info(f"Creating permission for RSA kid: {instance.kid}")
        OidcPermissions.objects.create(
            name=f"oidc:sign:{instance.kid}", description="Dynamically created permission based on RSA key KID"
        )
