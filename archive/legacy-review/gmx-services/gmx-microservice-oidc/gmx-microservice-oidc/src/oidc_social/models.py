import jsonfield
from django.conf import settings
from django.db import models

from oidc.models import SocialSecret


class SocialUserProfile(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='social_profiles', on_delete=models.PROTECT)
    social_type = models.CharField(max_length=2, choices=SocialSecret.SOCIAL_TYPE_CHOICES.to_choices())
    social_id = models.CharField(max_length=200)

    def __str__(self):
        return '{}@{}'.format(self.social_id, self.social_type)

    class Meta:
        unique_together = (
            ('social_type', 'social_id')
        )


class SocialTokens(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='social_tokens', on_delete=models.PROTECT)
    social_type = models.CharField(max_length=2, choices=SocialSecret.SOCIAL_TYPE_CHOICES.to_choices())
    social_token = jsonfield.JSONField()
    oidc_client = models.ForeignKey('oidc_provider.Client', related_name='+', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now=True, db_index=True)

    def __str__(self):
        return '{}@{}@{}'.format(self.user.sub, self.social_type, self.oidc_client.client_id)

    class Meta:
        unique_together = (
            ('user', 'oidc_client')
        )
        ordering = ('-created_at',)

    def save(self, *args, **kwargs):
        force_create = kwargs.pop('force_create', False)
        if self.id is None and not force_create:
            # looking for instance
            token_instance = self.__class__.objects.filter(user=self.user, oidc_client=self.oidc_client).first()
            if token_instance is None:
                token_instance = self
                force_create = True
                force_update = False
                update_fields = None
            else:
                token_instance.social_token = self.social_token
                force_create = False
                force_update = True
                update_fields = ['social_token']
            token_instance.save(force_create=force_create, force_update=force_update, update_fields=update_fields)
        else:
            super().save(*args, **kwargs)
