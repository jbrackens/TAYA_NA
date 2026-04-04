from django.core.cache import caches
from django.db import models

from profiles import models as profile_models

cache = caches['default']


class ExternalUserMappingModel(models.Model):
    ARN = 'oidc:temp_user:mapping:{}:{}'
    company = models.ForeignKey(profile_models.Company, on_delete=models.PROTECT)
    external_user_id = models.CharField(max_length=120)
    user = models.ForeignKey(profile_models.CustomUser, related_name='external_user_mapping_set', on_delete=models.PROTECT)

    def __str__(self):
        return 'ExternalUserMappingModel({}, {}) is {}'.format(self.company_id, self.external_user_id, self.user.sub)

    class Meta:
        unique_together = (
            ('company', 'external_user_id'),
        )
        index_together = (
            ('company', 'external_user_id', 'user'),
        )

    @classmethod
    def get_arn(cls, company, external_user_id):
        return cls.ARN.format(company, external_user_id)

    @property
    def arn(self):
        return self.get_arn(self.company_id, self.external_user_id)

    def clear_cache(self):
        cache.delete(self.arn)

    def delete(self, *args, **kwargs):
        self.clear_cache()
        return super().delete(*args, **kwargs)

    def save(self, *args, **kwargs):
        if self.id:
            self.clear_cache()
        return super().save(*args, **kwargs)
