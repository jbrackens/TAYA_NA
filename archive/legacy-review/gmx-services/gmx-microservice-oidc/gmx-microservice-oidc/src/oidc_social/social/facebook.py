import nacl.encoding
import nacl.hash
import requests
from django.conf import settings
from django.core.cache import cache

from oidc.models import SocialSecret
from oidc_social.utils import SocialProfile, HandleErrorException
from oidc_social.views import AbstractSocialLoginRedirectView
from .oauth2 import OAuth2ResponseHandler


class FacebookResponseHandler(OAuth2ResponseHandler):
    access_token_uri = 'https://graph.facebook.com/v2.9/oauth/access_token'
    debug_token_uri = 'https://graph.facebook.com/v2.9/debug_token'
    profile_uri = 'https://graph.facebook.com/v2.9/me'

    social_type = SocialSecret.SOCIAL_TYPE_CHOICES.FACEBOOK
    social_request = requests.Request('GET', access_token_uri)

    def _get_app_access_token(self, force_refresh=False):
        arn = 'oidc:social:fb:app_access_token:{}'.format(self.client_id)
        if force_refresh:
            cache.delete(arn)
            token = None
        else:
            token = cache.get(arn)
        if token is None:
            with cache.lock(arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
                token = cache.get(arn)
                if token is None:
                    token = self._get_new_app_access_token()
                    cache.set(arn, token, timeout=self.cache_timeout)
        return token

    def _get_new_app_access_token(self):
        query_params = {
            'client_id': self.social_credentials.get('social_client_id'),
            'client_secret': self.social_credentials.get('social_client_secret'),
            'grant_type': 'client_credentials'
        }
        response_json = self._prepare_and_validate_response(self.access_token_uri, query_params, 'fb_get_new_app_access_token')
        return response_json.get('access_token')

    def _exchange_code_for_access_token(self):
        query_params = {
            'client_id': self.social_credentials.get('social_client_id'),
            'client_secret': self.social_credentials.get('social_client_secret'),
            'redirect_uri': self.valve.get('request_params', {}).get('redirect_uri'),
            'code': self.code
        }
        resp_json = self._prepare_and_validate_response(self.access_token_uri, query_params, 'fb_exchange_code_for_access_token')
        return resp_json.get('access_token')

    def _verify_access_token(self, access_token):
        prep = self.social_request.prepare()
        force_refresh = False

        while True:
            app_token = self._get_app_access_token(force_refresh)
            query_params = {
                'input_token': access_token,
                'access_token': app_token
            }
            prep.prepare_url(self.debug_token_uri, query_params)
            response = self.social_session.send(prep)
            if 200 <= response.status_code <= 299 or force_refresh:
                break
            force_refresh = True
            self.logger.info('Refreshing APP ACCESS CODE for facebook for client: {}'.format(self.client_id))

        if 200 <= response.status_code <= 299 and response.json().get('data', {}).get('app_id') == self.social_credentials.get('social_client_id'):
            return True
        self.logger.warn('Facebook validation FALSE: {}'.format(response.text))
        return False

    def _get_profile(self, access_token):
        self.social_token = {
            'access_token': access_token
        }
        query_params = {
            'access_token': access_token,
            'fields': 'email,gender,first_name,last_name,name,token_for_business'
        }
        resp_json = self._prepare_and_validate_response(self.profile_uri, query_params, 'fb_get_profile')

        profile = SocialProfile(resp_json, self.social_token)
        profile.social_type = self.social_type
        token_for_business = resp_json.get('token_for_business')
        if token_for_business is None:
            raise HandleErrorException(error='fb_get_profile', error_description='FaceBook response does not have ID')
        token_hash = nacl.hash.sha256(token_for_business.encode(), encoder=nacl.encoding.HexEncoder).decode()
        profile.social_id = token_hash
        profile.email_verified = bool(profile.email)
        # import json
        # raise HandleErrorException(error='fb_get_profile', error_description=json.dumps(resp_json, indent=4))
        return profile


class FaceBookLoginRedirectView(AbstractSocialLoginRedirectView):
    target_url = 'https://www.facebook.com/v2.9/dialog/oauth'
    social_type = SocialSecret.SOCIAL_TYPE_CHOICES.FACEBOOK

    def get_redirect_params(self, client_id, state):
        social_client = self.get_social_client(client_id)
        social_client_id = social_client.get('social_client_id')

        if social_client_id is None:
            return None
        return {
            'client_id': social_client_id,
            'redirect_uri': self.redirect_url,
            'state': state,
            'response_type': 'code',
            'scope': 'email,public_profile,user_friends',
            # 'display': 'popup',
        }
