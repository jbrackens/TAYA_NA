import json
import time
from uuid import uuid4

from jwkest import JWKESTException
from jwkest.jws import JWS
from jwkest.jwt import JWT

from oidc.models import SocialSecret
from oidc_social.social.oidc import OidcResponseHandler, SocialConfiguration
from oidc_social.utils import SocialProfile
from oidc_social.views import AbstractSocialLoginRedirectView

google_social_configuration = SocialConfiguration('https://accounts.google.com/.well-known/openid-configuration')


class GoogleResponseHandler(OidcResponseHandler):
    token_info_uri = 'https://www.googleapis.com/oauth2/v3/tokeninfo'
    token_iss = 'https://accounts.google.com'
    social_type = SocialSecret.SOCIAL_TYPE_CHOICES.GOOGLE_PLUS
    social_configuration = google_social_configuration
    jwt = None

    def _exchange_code_for_access_token(self, code):
        social_client = self.get_social_client(self.client_id)
        redirect_uri = self.valve.get('request_params', {}).get('redirect_uri', '')
        query_params = {
            'client_id': social_client.get('social_client_id'),
            'client_secret': social_client.get('social_client_secret'),
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri,
            'code': code
        }
        response = self._prepare_and_validate_response(url=self.social_configuration.token_endpoint, query_params=query_params, step='gp_exchange_code_for_access_token', method='POST')
        self.whole_code_response = response
        self.social_token = response
        return response.get('id_token')

    def _verify_token_type(self):
        token_type = self.whole_code_response.get('token_type', '')
        if token_type.lower().strip() != 'bearer':
            return False
        return True

    def _verify_id_token_01(self, id_token):
        return len(id_token.split('.')) == 3

    def _verify_id_token_02(self, id_token):
        try:
            parts = JWT().unpack(id_token).part

            self.token_header = json.loads(parts[0].decode())
            self.token_payload = json.loads(parts[1].decode())

        except Exception as e:
            self.logger.exception(e)
            return False
        return True

    def _verify_id_token_03(self, id_token):
        nonce = self.valve.get('request_params', {}).get('nonce', 'unknown')
        return nonce == self.token_payload.get('nonce')

    def _verify_id_token_04(self, id_token):
        return self.token_iss == self.token_payload.get('iss')

    def _verify_id_token_05(self, id_token):
        aud = self.get_social_client(self.client_id).get('social_client_id')
        return aud == self.token_payload.get('aud')

    def _verify_id_token_06(self, id_token):
        try:
            exp = int(self.token_payload.get('exp'))
        except ValueError:
            exp = 0
        return time.time() < exp

    def _verify_id_token_07(self, id_token):
        try:
            iat = int(self.token_payload.get('iat'))
        except ValueError:
            iat = 0
        return time.time() > iat

    def _verify_id_token_08(self, id_token):
        try:
            JWS().verify_compact(id_token, self.social_configuration.jwks)
        except JWKESTException as e:
            self.logger.error(e)
            return False
        return True

    def _verify_test_generator(self, id_token):
        i = 1
        while True:
            test_name = '_verify_id_token_%02d' % i
            test = getattr(self, test_name, False)
            if test:
                result = test(id_token)
                if not result:
                    self.logger.debug('{} failure. Token data: {}'.format(test_name, self.token_payload))
                yield (result)
                i += 1
            else:
                break

    def _verify_access_token(self, id_token):
        return self._verify_token_type and all(self._verify_test_generator(id_token))

    def _get_profile(self, access_token):
        profile = {
            'email': self.token_payload.get('email'),
            'email_verified': self.token_payload.get('email_verified'),
            'social_id': self.token_payload.get('sub'),
            'social_type': self.social_type
        }
        return SocialProfile(profile, self.social_token)


class GoogleLoginRedirectView(AbstractSocialLoginRedirectView):
    target_url = google_social_configuration.authorization_endpoint
    social_type = SocialSecret.SOCIAL_TYPE_CHOICES.GOOGLE_PLUS

    def get_redirect_params(self, client_id, state):
        social_client = self.get_social_client(client_id)
        social_client_id = social_client.get('social_client_id')

        nonce = uuid4().hex

        if social_client_id is None:
            return None
        return {
            'client_id': social_client_id,
            'redirect_uri': self.redirect_url,
            'state': state,
            'nonce': nonce,
            'response_type': 'code',
            'scope': 'openid email',
        }
