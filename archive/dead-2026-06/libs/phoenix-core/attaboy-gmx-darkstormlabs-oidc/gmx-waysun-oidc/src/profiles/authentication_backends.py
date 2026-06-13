import logging
from abc import ABC, abstractmethod

from aws_rest_default.logger import RequestLogAdapter
from django.contrib.auth.backends import ModelBackend

from .models import CustomUser


class BaseModelBacked(ModelBackend, ABC):
    logger = None

    @abstractmethod
    def get_authenticating_user(self, param, password):
        pass

    def __init__(self, *args, **kwargs):
        # noinspection PyArgumentList
        super().__init__(*args, **kwargs)
        self.__simple_logger = logging.getLogger("{}.{}".format(self.__class__.__module__, self.__class__.__name__))

    def authenticate(self, request, username=None, password=None, **kwargs):
        self.logger = RequestLogAdapter(logger=self.__simple_logger, request=request)
        if username is None or password is None:
            return
        user = self.get_authenticating_user(username, password)
        if not user:
            return
        self.logger.info(f"Found user {user}")
        check_password = user.check_password(password)
        authenticate = self.user_can_authenticate(user)
        if check_password and authenticate:
            return user
        self.logger.error(
            f"Unable to authenticated {user} because check_password={check_password} and authenticate={authenticate}"
        )


class ProfileUsernameModelBackend(BaseModelBacked):
    def get_authenticating_user(self, param, password):
        try:
            return CustomUser.objects.get_by_username(param)
        except CustomUser.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user (#20760).
            CustomUser().set_password(password)
            self.logger.error(f"Unable to find username={param}")


class ProfilePhoneNumberModelBackend(BaseModelBacked):
    def get_authenticating_user(self, param, password):
        try:
            return CustomUser.objects.get_by_phone_number(param)
        except CustomUser.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user (#20760).
            CustomUser().set_password(password)
            self.logger.error(f"Unable to find user by phone_number={param}")


class ProfileEmailModelBackend(BaseModelBacked):
    def get_authenticating_user(self, param, password):
        try:
            return CustomUser.objects.get_by_email(param)
        except CustomUser.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user (#20760).
            CustomUser().set_password(password)
            self.logger.error(f"Unable to find user by email={param}")
