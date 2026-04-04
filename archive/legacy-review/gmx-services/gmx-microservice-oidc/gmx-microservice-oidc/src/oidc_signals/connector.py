from django.conf import settings
import requests
from oidc_provider.lib.endpoints.token import TokenEndpoint
from requests.adapters import HTTPAdapter
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

__all__ = ['send_signal_to_process_controller']

request_session = requests.Session()
request_session.mount(settings.PROCESS_CONTROLLER_HOST, HTTPAdapter(max_retries=3))
ARN = 'oidc:pc:signal:token'


class _FakeRequest(object):
    """ only to simulate META and POST dicts"""
    def __init__(self, meta=None, post=None, get=None):
        self.META = dict() if meta is None else meta
        self.GET = dict() if get is None else get
        self.POST = dict() if post is None else post


def _get_fake_post_dict():
    logger.info('Creating fake POST dict')
    return {
        'client_id': settings.PROCESS_CONTROLLER_OIDC_CLIENT_ID,
        'client_secret': settings.PROCESS_CONTROLLER_OIDC_CLIENT_SECRET,
        'grant_type': 'password',
        'username': settings.PROCESS_CONTROLLER_OIDC_USER,
        'password': settings.PROCESS_CONTROLLER_OIDC_PASSWORD
    }


def _get_fake_request():
    logger.info('Creating fake REQUEST')
    return _FakeRequest(post=_get_fake_post_dict())


def _generate_token():
    logger.info('Generting token from scrach')
    fake_request = _get_fake_request()
    token_util = TokenEndpoint(fake_request)
    token_util.validate_params()
    result = token_util.create_response_dic()
    token = result.get('id_token')
    return token


def _get_bearer_token():
    token = cache.get(ARN, None)
    if token is None:
        logger.info('Token not found in cache, trying to regenerate it')
        with cache.lock(ARN, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
            logger.info('Lock acquired')
            token = cache.get(ARN, None)
            if token is None:
                token = _generate_token()
                logger.info('Storing token in cache..')
                cache.set(ARN, token)
    return token


def send_signal_to_process_controller(signal_name, kwargs=None):
    if kwargs is None:
        kwargs = dict()

    signal_name = signal_name.upper()
    token = _get_bearer_token()
    logger.info('Sending POST request to PC with signal_name = {}'.format(signal_name))
    response = request_session.post(
        url='{}{}'.format(settings.PROCESS_CONTROLLER_HOST, settings.PROCESS_CONTROLLER_EVENT_ENDPOINT),
        json={
            'signal_name': signal_name,
            'kwargs': kwargs
        },
        headers={
            'Authorization': 'Bearer {}'.format(token)
        }
    )
    response.raise_for_status()
    logger.info('Received response: {}'.format(response.json()))



