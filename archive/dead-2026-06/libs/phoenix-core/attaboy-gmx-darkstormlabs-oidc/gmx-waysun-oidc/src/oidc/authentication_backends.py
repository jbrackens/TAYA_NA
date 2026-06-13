from aws_rest_default.authentication import JSONWebTokenAuthentication
from aws_rest_default.handlers import jwt_get_user_id_from_payload_handler
from rest_framework.exceptions import AuthenticationFailed

from profiles.models import CustomUser


class OidcJsonTokenAuth(JSONWebTokenAuthentication):
    keyword = "bearer"

    # noinspection PyMethodMayBeStatic
    def authenticate_credentials(self, payload):
        username = jwt_get_user_id_from_payload_handler(payload)

        if not username:
            msg = "Invalid payload."
            self.logger.warn(msg)
            raise AuthenticationFailed(msg)

        try:
            user = CustomUser.objects.get_by_sub(sub=username)
        except CustomUser.DoesNotExist:
            msg = "Invalid signature."
            self.logger.warn(msg + ' - User not found! "{}"'.format(username))
            raise AuthenticationFailed(msg)

        if not user.is_active:
            msg = "User account is disabled."
            self.logger.warn(msg)
            raise AuthenticationFailed(msg)
        return user
