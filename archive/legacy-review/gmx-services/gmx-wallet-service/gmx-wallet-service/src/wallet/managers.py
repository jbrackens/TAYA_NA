from django.core.cache import cache
from django.db import models

from django.conf import settings


class CommissionConfigManager(models.Manager):
    ARN_PATTERN = 'arn:wallet:commission_config:{user.username}:{tier}'

    def _get_arn_pattern(self, user, tier):
        return self.ARN_PATTERN.format(user=user, tier=tier)

    def get_config_for_user_and_tier(self, user, tier=1):
        arn = self._get_arn_pattern(user, tier)
        arn_lock = '%s:lock' % arn
        obj = cache.get(arn, None)
        if obj is None:
            with cache.lock(arn_lock, expire=settings.LOCK_TIMEOUT):
                obj = cache.get(arn, None)
                if obj is None:
                    obj = self.get_queryset().filter(user=user, tier=tier).first()
                    cache.set(arn, obj)
                    cache.persist(arn)
        return obj

    def invalidate_cache_for_user_and_tier(self, user, tier):
        arn = self._get_arn_pattern(user, tier)
        cache.delete(arn)
