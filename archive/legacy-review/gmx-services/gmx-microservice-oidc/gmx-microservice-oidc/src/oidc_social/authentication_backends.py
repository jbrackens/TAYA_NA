import logging

from aws_rest_default.logger import RequestLogAdapter
from django.contrib.auth.backends import ModelBackend

from oidc_social.models import SocialUserProfile


class SocialLoginBackend(ModelBackend):
    logger = None

    def __init__(self, *args, **kwargs):
        # noinspection PyArgumentList
        super().__init__(*args, **kwargs)
        self.__simple_logger = logging.getLogger('{}.{}'.format(self.__class__.__module__, self.__class__.__name__))

    # noinspection PyPep8Naming
    def authenticate(self, request, social_type=None, social_id=None, **kwargs):
        self.logger = RequestLogAdapter(logger=self.__simple_logger, request=request)
        if social_type is None or social_id is None or not social_type or not social_id:
            return

        user = SocialUserProfile.objects.filter(social_type=social_type, social_id=social_id).first()
        if user:
            user = user.user
            self.logger.info('logging user {} in from {}@{}'.format(user, social_id, social_type))
        return user
