import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AntstreamConfig(AppConfig):
    name = "antstream"

    def ready(self):
        logger.info("profiles - ready")
