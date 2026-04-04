import logging

from django.conf import settings
from django.core.cache import cache
from django.db import models
from django.http.response import HttpResponseRedirect

from .settings import LOCK_TIMEOUT

FRONTEND_SITE_URL_ERR = settings.FRONTEND_SITE_URL_ERR

logger = logging.getLogger(__name__)


class PartnerTransactionApiKeysManager(models.Manager):
    ARN = 'arn:wallet:external_orders:key:{}:private'

    def get_private_for_key(self, public_key, cancel_url):
        logger.info('Received public key: %s' % public_key)
        arn = self.ARN.format(public_key)
        result = cache.get(arn)
        if result is None:
            with cache.lock(arn, expire=LOCK_TIMEOUT):
                result = cache.get(arn)
                if result is None:
                    model = self.get_queryset().filter(public_key=public_key).first()
                    if model is None:
                        return HttpResponseRedirect(
                            redirect_to=FRONTEND_SITE_URL_ERR.format(
                                'GE_101',
                                cancel_url
                            )
                        )
                    result = model.private_key
                    cache.set(arn, result)
                    cache.persist(arn)
        return result

    def invalidate_cache(self, public_key):
        arn = self.ARN.format(public_key)
        cache.delete(arn)
