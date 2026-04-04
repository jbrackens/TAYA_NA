from oidc_social.utils import HandleErrorException
from .common import SocialResponseHandler


class OAuth2ResponseHandler(SocialResponseHandler):
    access_token_uri = None
    profile_uri = None

    def _exchange_code_for_access_token(self):
        raise NotImplementedError()

    def _verify_access_token(self, access_token):
        raise NotImplementedError()

    def _get_profile(self, access_token):
        raise NotImplementedError()

    def handle(self, request, valve):
        super().handle(request, valve)

        access_token = self._exchange_code_for_access_token()

        if not self._verify_access_token(access_token):
            self.logger.error('Unable to validate access token. Problem with {}'.format(self.social_type))
            raise HandleErrorException(error='{}_verify_access_token'.format(self.social_type), error_description='Unable to verify your token.')

        profile = self._get_profile(access_token)

        return profile
