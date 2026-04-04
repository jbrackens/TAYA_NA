from urllib.parse import parse_qs

import requests
from django.shortcuts import render
from requests_oauthlib import OAuth1
from rest_framework.status import HTTP_400_BAD_REQUEST

from oidc.models import SocialSecret
from oidc_social.social.oauth1 import OAuth1ResponseHandler
from oidc_social.utils import SocialProfile
from oidc_social.views import AbstractSocialLoginRedirectView


class TwitterUrls(object):
    request_token_url = 'https://api.twitter.com/oauth/request_token'

    base_authorization_url = 'https://api.twitter.com/oauth/authorize'

    access_token_url = 'https://api.twitter.com/oauth/access_token'

    profile_url = 'https://api.twitter.com/1.1/account/verify_credentials.json'


class TwitterResponseHandler(OAuth1ResponseHandler):
    social_request = requests.Request('GET', TwitterUrls.access_token_url)
    social_type = SocialSecret.SOCIAL_TYPE_CHOICES.TWITTER

    def _exchange_code_for_access_token(self, verifier):
        client_key = self.social_credentials.get('social_client_id')
        client_secret = self.social_credentials.get('social_client_secret')
        oauth = OAuth1(
            client_key=client_key,
            client_secret=client_secret,
            resource_owner_key=self.resource_owner_key,
            resource_owner_secret=self.resource_owner_secret,
        )
        request = self.social_request.prepare()
        request.prepare_auth(oauth, TwitterUrls.access_token_url)
        response = self._prepare_and_validate_response(TwitterUrls.access_token_url, {}, 'tw_exchange_code_for_access_token', auth=oauth, parse_qs=True, method='POST', post_data={'oauth_verifier': verifier})
        self.resource_owner_key = response.get('oauth_token')
        self.resource_owner_secret = response.get('oauth_token_secret')
        oauth = OAuth1(
            client_key=client_key,
            client_secret=client_secret,
            resource_owner_key=self.resource_owner_key,
            resource_owner_secret=self.resource_owner_secret,
        )
        self.social_token = {
            'resource_owner_key': self.resource_owner_key,
            'resource_owner_secret': self.resource_owner_secret
        }
        return oauth

    def _get_profile(self, access_token):
        request = self.social_request.prepare()
        request.prepare_auth(access_token, TwitterUrls.profile_url)
        response = self._prepare_and_validate_response(TwitterUrls.profile_url, {'skip_status': True, 'include_email': True, }, step='tw_get_profile', auth=access_token)
        profile = SocialProfile(response, self.social_token)
        profile.social_type = SocialSecret.SOCIAL_TYPE_CHOICES.TWITTER
        profile.social_id = response.get('id')
        return profile


class TwitterLoginRedirectView(AbstractSocialLoginRedirectView):
    social_type = SocialSecret.SOCIAL_TYPE_CHOICES.TWITTER
    connection_session = requests.Session()
    connection_request = requests.Request('POST', TwitterUrls.request_token_url)
    target_url = TwitterUrls.base_authorization_url

    def get_oauth_token_and_secret(self, client_id, client_secret):
        oauth = OAuth1(client_key=client_id, client_secret=client_secret)
        r = self.connection_request.prepare()
        r.prepare_auth(oauth)
        try:
            response = self.connection_session.send(r)
            response.raise_for_status()
            credentials = parse_qs(response.content)
            self.logger.debug(credentials)
            resource_owner_key = credentials.get(b'oauth_token')[0].decode()
            resource_owner_secret = credentials.get(b'oauth_token_secret')[0].decode()
            if credentials.get(b'oauth_callback_confirmed')[0] != b'true':
                self.logger.warn('Twitter oauth_callback_confirmed is not TRUE! it is: {}'.format(credentials.get('oauth_callback_confirmed')[0]))
                return None, None
        except Exception as e:
            self.logger.exception('Twitter first step exception: {}'.format(e))
            return None, None
        return resource_owner_key, resource_owner_secret

    def get_redirect_params(self, client_id, state):
        social_client = self.get_social_client(client_id)
        social_client_id = social_client.get('social_client_id')
        social_client_secret = social_client.get('social_client_secret')

        resource_owner_key, resource_owner_secret = self.get_oauth_token_and_secret(social_client_id, social_client_secret)

        if resource_owner_secret is None or resource_owner_key is None:
            return render(self.request, 'oidc_social/error.html', context={'error': 'tw_redirect_params', 'error_description': 'Twitter connection problems'}, status=HTTP_400_BAD_REQUEST)

        return {
            'oauth_token': resource_owner_key,
            'oauth_token_secret': resource_owner_secret
        }

    def store_social_data(self, client_id, state, request_params, next_param):
        state = request_params.get('oauth_token')
        result = super().store_social_data(client_id, state, request_params, next_param)
        return result

    def _format_url(self, params):
        return super()._format_url({'oauth_token': params.get('oauth_token')})
