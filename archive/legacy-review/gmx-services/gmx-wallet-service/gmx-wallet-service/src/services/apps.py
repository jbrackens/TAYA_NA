import logging

from decouple import config
from django.apps import AppConfig
from django.db.models.signals import post_save

logger = logging.getLogger(__name__)


class ServicesConfig(AppConfig):
    """
    class UserWalletConfig is used to initialize Singletons: KafkaService
     with proper values.
    """
    name = 'services'

    def _initialize_missing_user(self):
        logger.info('Connecting MISSING USER SIGNAL')
        from aws_rest_default.signals import MISSING_USER_SIGNAL
        from wallet.signal_handlers import handle_missing_user

        MISSING_USER_SIGNAL.connect(
            handle_missing_user,
            weak=False,
            dispatch_uid='handle_missing_user'
        )

    def _initialize_kafka_service(self):
        from services.kafka_service import KafkaService
        from django.conf import settings

        kafka_bootstrap_servers = settings.KAFKA_BOOTSTRAP_SERVERS
        kafka_topic = settings.KAFKA_TOPIC

        allow_post_save_wallet_kafka = settings.ALLOW_POST_SAVE_WALLET_KAFKA

        from wallet.signal_handlers import wallet_line_kafka_post_save
        from wallet.models import WalletLine

        if kafka_bootstrap_servers and kafka_topic:
            logger.info('Initializing KafkaService in ready()')
            KafkaService(
                bootstrap_servers=[kafka_bootstrap_servers, ],
                request_timeout_ms=1_000_000,
                api_version_auto_timeout_ms=1_000_000,
                api_version=(1, 0, 0),
                topic=kafka_topic,
            )
            if allow_post_save_wallet_kafka:
                logger.info('Connecting WalletLine KafkaService post save signal')
                post_save.connect(
                    wallet_line_kafka_post_save,
                    sender=WalletLine,
                    weak=False,
                    dispatch_uid='wallet_line_kafka_post_save',
                )
        else:
            logger.warning('KafkaService not set up')

    def ready(self):
        self._initialize_missing_user()
        if not config('SKIP_KAFKA_CONNECT', cast=bool, default=False):
            self._initialize_kafka_service()

