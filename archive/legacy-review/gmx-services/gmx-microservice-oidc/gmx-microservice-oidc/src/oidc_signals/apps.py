import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class OidcSignalsConfig(AppConfig):
    name = 'oidc_signals'

    # noinspection PyUnresolvedReferences
    def ready(self):
        logger.info('Loading signals...')
        from . import signals
        logger.info('Loading handlers...')
        from . import handlers
