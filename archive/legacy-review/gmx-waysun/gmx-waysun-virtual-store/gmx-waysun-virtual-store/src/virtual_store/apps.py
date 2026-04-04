import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class VirtualStoreConfig(AppConfig):
    name = "virtual_store"

    def ready(self):
        logger.info("virtual_store - starting")
        from . import signals  # noqa

        logger.info("virtual_store - started")
