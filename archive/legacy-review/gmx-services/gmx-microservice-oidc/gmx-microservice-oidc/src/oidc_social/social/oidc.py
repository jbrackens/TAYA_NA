import logging

import nacl.hash
import requests
from django.conf import settings
from django.core.cache import cache
from jwkest.jwk import KEYS
from requests.exceptions import HTTPError

from oidc_social.social.common import SocialResponseHandler
from oidc_social.utils import HandleErrorException

logger = logging.getLogger(__name__)


class SocialConfiguration(object):
    _social_configuration = None
    _jwks = None

    def __init__(self, url):
        self._url = url
        self._url_id = nacl.hash.sha256(url.encode()).decode()
        self._jwks = None
        self._social_configuration = None

    @property
    def social_configuration(self):
        if self._social_configuration is None:
            arn = 'oidc:social:oidc:config:{}'.format(self._url_id)
            config = cache.get(arn)
            if config is None:
                with cache.lock(arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
                    config = cache.get(arn)
                    if config is None:
                        logger.info('Reading wellKnown config for {}'.format(self._url))
                        try:
                            config = requests.get(self._url).json()
                            if config:
                                cache.set(arn, config, timeout=3600)
                        except (ValueError, HTTPError) as e:
                            logger.exception('Unable to read configuration for: "{}": {}'.format(self._url, e))
                            config = None
            self._social_configuration = config
            logger.info(config)
        return self._social_configuration

    @property
    def issuer(self):
        return self.social_configuration.get('issuer')

    @property
    def authorization_endpoint(self):
        return self.social_configuration.get('authorization_endpoint')

    @property
    def token_endpoint(self):
        return self.social_configuration.get('token_endpoint')

    @property
    def userinfo_endpoint(self):
        return self.social_configuration.get('userinfo_endpoint')

    @property
    def jwks(self):
        if self._jwks is None:
            arn = 'oidc:social:jwks:refresh:jwks:{}'.format(self._url_id)
            jwks_data = cache.get(arn)
            if jwks_data is None or not jwks_data:
                with cache.lock(arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
                    jwks_data = cache.get(arn)
                    if jwks_data is None or not jwks_data:
                        logger.info('Refreshing JWKS')
                        try:
                            jwks_data = requests.get(self.social_configuration.get('jwks_uri')).json()
                        except (ValueError, HTTPError) as e:
                            logger.exception(e)
                            return None
                        cache.set(arn, jwks_data)
                        logger.info('Storring google JWKS: {}'.format(jwks_data))
            if jwks_data:
                self._jwks = KEYS()
                self._jwks.load_dict(jwks_data)
        return self._jwks


class OidcResponseHandler(SocialResponseHandler):
    well_known_configuration_url = None

    social_configuration = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.social_request = requests.Request('GET', self.social_configuration.authorization_endpoint)

    def handle(self, request, valve):
        super().handle(request, valve)

        access_token = self._exchange_code_for_access_token(self.code)

        if not self._verify_access_token(access_token):
            self.logger.error('Unable to validate access token. Problem with {}.'.format(self.social_type))
            raise HandleErrorException(error='{}_verify_access_token'.format(self.social_type), error_description='Unable to verify your token.')

        profile = self._get_profile(access_token)

        return profile

    def _exchange_code_for_access_token(self, code):
        raise NotImplementedError()

    def _verify_access_token(self, access_token):
        raise NotImplementedError()

    def _get_profile(self, access_token):
        raise NotImplementedError()
