from aws_rest_default.logger import RequestLogAdapter
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
import logging

from oidc_social.authentication_backends import SocialLoginBackend
from oidc_social.models import SocialUserProfile
from project.authentication_backends import EmailModelBackend

"""
AUTHENTICATION_BACKENDS = [
    'oidc_social.authentication_backends.SocialLoginBackend',
]
"""


UserModel = get_user_model()


class TreeModelBackend(ModelBackend):
    logger = None

    def __init__(self, *args, **kwargs):
        # noinspection PyArgumentList
        super().__init__(*args, **kwargs)
        self.__simple_logger = logging.getLogger('{}.{}'.format(self.__class__.__module__, self.__class__.__name__))

    def authenticate(self, request, username=None, password=None, **kwargs):
        self.logger = RequestLogAdapter(logger=self.__simple_logger, request=request)
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        try:
            user = UserModel._default_manager.get_by_natural_key(username)
        except UserModel.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a non-existing user (#20760).
            UserModel().set_password(password)
            self.logger.info('(TreeModelBackend) Unable to authenticate "{}". Does not exists?'.format(username))
        else:
            if user.check_password(password):
                root_user = user.user_tree_node.get_ancestors(include_self=True).select_related('user').first().user
                if self.user_can_authenticate(root_user):
                    self.logger.info('(TreeModelBackend) Authenticated user: {}'.format(user))
                    return root_user


class TreeEmailModelBackend(EmailModelBackend):
    logger = None

    def __init__(self, *args, **kwargs):
        # noinspection PyArgumentList
        super().__init__(*args, **kwargs)
        self.__simple_logger = logging.getLogger('{}.{}'.format(self.__class__.__module__, self.__class__.__name__))

    # noinspection PyPep8Naming
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        First we need to look for fully activated users and validated emails.
        When we don't have it we looking for the users with invalidated inactive emails
        """
        self.logger = RequestLogAdapter(logger=self.__simple_logger, request=request)

        user = self.get_user_from_email(username, password)

        if user is not None and user.check_password(password):
            root_user = user.user_tree_node.get_ancestors(include_self=True).select_related('user').first().user
            if self.user_can_authenticate(root_user):
                self.logger.info('(TreeEmailModelBackend) Authenticated user: {}'.format(user))
                return root_user


class TreeSocialLoginBackend(SocialLoginBackend):
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

        social_user = SocialUserProfile.objects.filter(social_type=social_type,
                                                       social_id=social_id).select_related('user', 'user__user_tree_node').first()
        if social_user:
            user = social_user.user.user_tree_node.get_ancestors(include_self=True).select_related('user').first().user
            self.logger.info('(TreeSocialLoginBackend) logging user {} in from {}@{}'.format(user, social_id, social_type))
        return social_user



