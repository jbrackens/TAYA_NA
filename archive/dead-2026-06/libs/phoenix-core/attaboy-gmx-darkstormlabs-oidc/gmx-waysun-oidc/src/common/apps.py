import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CommonConfig(AppConfig):
    name = "common"

    # noinspection PyUnresolvedReferences
    def ready(self):
        logger.info("common - ready")
        from . import signal_handlers  # noqa

        logger.info("common - signals connected")
