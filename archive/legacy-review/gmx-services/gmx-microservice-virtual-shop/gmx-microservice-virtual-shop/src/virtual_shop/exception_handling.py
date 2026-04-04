import logging

from _decimal import InvalidOperation
from rest_framework import serializers

logger = logging.getLogger(__name__)


class PaymentExceptionHandlingMixing:
    def payment_handler(self, *args, **kwargs):
        raise NotImplemented("This should be implemented")

    def payment_wrapper(self, *args, **kwargs):
        try:
            return self.payment_handler(*args, *kwargs)

        except InvalidOperation as e:
            msg = "Unable to create OrderLines {}. Contact administrator.".format(e)
            logger.exception(msg)
            raise serializers.ValidationError({"error": msg})
        except serializers.ValidationError as e:
            msg = "Unable to create OrderLines {}. Contact administrator.".format(e)
            logger.exception(msg)
            raise serializers.ValidationError({"error": msg})
