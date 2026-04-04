import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class PaymentGatewayConfig(AppConfig):
    name = "payment_gateway"

    def ready(self):
        logger.info("payment_gateway - ready")
