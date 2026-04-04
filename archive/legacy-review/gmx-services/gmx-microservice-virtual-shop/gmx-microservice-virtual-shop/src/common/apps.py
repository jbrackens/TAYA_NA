import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CommonConfig(AppConfig):
    name = "common"

    # noinspection PyUnresolvedReferences
    def ready(self):
        logger.info("Connecting signals")

        logger.info("Connecting signals - DONE")
