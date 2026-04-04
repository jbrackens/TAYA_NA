import logging

from aws_rest_default.authentication import JSONWebTokenAuthentication, BaseSignatureAuthentication
from aws_rest_default.handlers import jwt_get_user_id_from_payload_handler
from aws_rest_default.logger import RequestLogAdapter
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Q
from rest_framework import exceptions


class EmailModelBackend(ModelBackend):
    logger = None

    def __init__(self, *args, **kwargs):
        # noinspection PyArgumentList
        super().__init__(*args, **kwargs)
        self.__simple_logger = logging.getLogger('{}.{}'.format(self.__class__.__module__, self.__class__.__name__))

    # noinspection PyPep8Naming
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        First we need to look for fully activated users and validated emails. When we don't have it we looking for the users with invalidated inactive emails
        """
        self.logger = RequestLogAdapter(logger=self.__simple_logger, request=request)

        user = self.get_user_from_email(username, password)

        if user is not None and user.check_password(password) and self.user_can_authenticate(user):
            self.logger.info('({}) Authenticated user: {}'.format(self.__class__.__name__, user))
            return user

    def get_user_from_email(self, username, password):
        if username is None:
            return
        email = username.strip().lower()
        if not email:
            return
        try:
            validate_email(email)
        except ValidationError:
            self.logger.info('({}) Unable to authenticate "{}" - invalid email'.format(self.__class__.__name__, email))
            return

        user = get_user_model().objects.filter(
            Q(is_active=True, emails__email=email) &
            (
                Q(is_limited=False, emails__is_verified=True)
                |
                Q(is_limited=True, emails__is_verified=False)
            )
        ).first()

        if user is None:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a non-existing user (#20760).
            get_user_model()().set_password(password)
            self.logger.info('({}) Unable to authenticate "{}". Does not exists?'.format(self.__class__.__name__, email))
            return

        return user


class OidcJsonTokenAuth(JSONWebTokenAuthentication):
    # noinspection PyMethodMayBeStatic
    def authenticate_credentials(self, payload):
        username = jwt_get_user_id_from_payload_handler(payload)

        if not username:
            msg = 'Invalid payload.'
            self.logger.warn(msg)
            raise exceptions.AuthenticationFailed(msg)

        try:
            user = get_user_model().objects.get(sub=username)
        except get_user_model().DoesNotExist:
            msg = 'Invalid signature.'
            self.logger.warn(msg + ' - User not found! "{}"'.format(username))
            raise exceptions.AuthenticationFailed(msg)

        if user.user_tree_node.get_family().filter(under_migration=True).exists():
            msg = 'User account is under migration - unable to log you in.'
            self.logger.warn(msg)
            raise exceptions.AuthenticationFailed(msg)

        user = user.user_tree_node.get_root().user

        if not user.is_active:
            msg = 'User account is disabled.'
            self.logger.warn(msg)
            raise exceptions.AuthenticationFailed(msg)
        return user


class ApiKeyAuthentication(BaseSignatureAuthentication):
    def authenticate_credentials(self, public_key): pass

    # api_key = RestApiKey.objects.filter(public_key=public_key).first()
    # if api_key is None:
    #     msg = 'Invalid signature - Profile not found!'
    #     self.logger.warn(msg)
    #     raise exceptions.AuthenticationFailed(msg)
    # user = api_key.user
    #
    # if not user.is_active:
    #     msg = 'User account is disabled.'
    #     self.logger.warn(msg)
    #     raise exceptions.AuthenticationFailed(msg)
    #
    # return user
