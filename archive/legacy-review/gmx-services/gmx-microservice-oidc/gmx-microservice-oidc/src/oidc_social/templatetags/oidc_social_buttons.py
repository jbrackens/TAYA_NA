from time import time

from aws_rest_default.tools import encrypt_b64
from django import template
from django.core.cache import cache
from django.urls.base import reverse

from oidc.models import SocialSecret

register = template.Library()


def oidc_social_url(client_id, next_param, social_type):
    arn = 'oidc:social:redirect_url:{}:{}'.format(client_id, social_type)
    arn_in_cache = (arn in cache)

    if arn_in_cache or SocialSecret.objects.filter(oidc_client_extra__oidc_client__client_id=client_id, social_type=social_type).exists():
        if not arn_in_cache:
            cache.set(arn, True)
        obj = {
            'c': client_id,
            'n': next_param,
            'e': int(time()) + 3600
        }
        obj_hash = encrypt_b64(obj)
        return reverse('oidc_social:{}'.format(social_type), kwargs={'key': obj_hash})
    return None


register.simple_tag(lambda client_id, next_param: oidc_social_url(client_id, next_param, SocialSecret.SOCIAL_TYPE_CHOICES.FACEBOOK), name='oidc_social_fb_url')
register.simple_tag(lambda client_id, next_param: oidc_social_url(client_id, next_param, SocialSecret.SOCIAL_TYPE_CHOICES.GOOGLE_PLUS), name='oidc_social_gp_url')
register.simple_tag(lambda client_id, next_param: oidc_social_url(client_id, next_param, SocialSecret.SOCIAL_TYPE_CHOICES.TWITTER), name='oidc_social_tw_url')
