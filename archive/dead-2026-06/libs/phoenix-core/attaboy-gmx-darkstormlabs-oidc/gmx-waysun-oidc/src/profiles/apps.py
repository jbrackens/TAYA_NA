import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class ProfilesConfig(AppConfig):
    name = "profiles"

    def ready(self):
        logger.info("profiles - ready")
