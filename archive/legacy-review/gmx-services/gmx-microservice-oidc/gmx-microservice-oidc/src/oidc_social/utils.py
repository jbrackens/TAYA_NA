from urllib.parse import parse_qs

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.shortcuts import render
from requests.exceptions import HTTPError
from rest_framework.status import HTTP_400_BAD_REQUEST

from oidc.models import SocialSecret


class SocialProfile(object):
    def __init__(self, data=None, social_token=None):
        self.first_name = None
        self.last_name = None
        self.name = None
        self.social_id = None
        self.social_type = None
        self._email = None
        self.email_verified = False
        self.social_token = social_token

        if data is not None:
            self.update(data=data)

    def update(self, data):
        for key, value in data.items():
            if key.startswith('_'):
                continue
            if hasattr(self, key):
                setattr(self, key, value)
        return self

    @property
    def email(self):
        return self._email

    @email.setter
    def email(self, e):
        try:
            validate_email(e)
        except ValidationError:
            pass
        else:
            self._email = e.strip().lower()

    def to_data_bag(self):
        result = {}
        for k, v in self.__dict__.items():
            if k.startswith('_') or v is None or not v:
                continue
            result[k] = v
        return result

    def __str__(self):
        return '{}@{}'.format(self.social_id, self.social_type)


class HandleErrorException(Exception):
    error = None
    error_description = None

    def __init__(self, error, error_description):
        self.error = error
        self.error_description = error_description
        super().__init__()


class SocialValveMixing(object):
    ARN = 'oidc:social:state:{}'
    social_type = None
    cache_timeout = 15 * 60

    def get_social_client(self, client_id):
        arn = 'oidc:social:client:{}:{}'.format(client_id, self.social_type)
        social_client = cache.get(arn, None)
        if social_client is None:
            with cache.lock(arn, expire=settings.CACHE_LOCK_MAX_TIMEOUT):
                social_client = cache.get(arn, None)
                if social_client is None:
                    temp = SocialSecret.objects.filter(oidc_client_extra__oidc_client__client_id=client_id, social_type=self.social_type).first()
                    if temp:
                        social_client = {
                            'social_client_id': temp.client_id,
                            'social_client_secret': temp.client_secret
                        }
                    else:
                        social_client = {'social_client_id': None, 'social_client_secret': None}
                    cache.set(arn, social_client, timeout=self.cache_timeout)
        return social_client

    def store_social_data(self, client_id, state, request_params, next_param):
        params = {
            'social_type': self.social_type,
            'client_id': client_id,
            'next_param': next_param,
            'request_params': request_params
        }
        arn = self.ARN.format(state)
        cache.set(arn, params, timeout=self.cache_timeout)
        return arn

    def get_social_data(self, state):
        arn = self.ARN.format(state)
        result = cache.get(arn, {})
        return result

    def clear_social_data(self, state):
        arn = self.ARN.format(state)
        cache.delete(arn)


class SimpleResponseHandler(SocialValveMixing):
    @property
    def logger(self):
        return self.view_instance.logger

    def __init__(self, view_instance):
        self.view_instance = view_instance
        self.client_id = None
        self.social_credentials = None
        self.valve = None
        self.request = None

    def _prepare_and_validate_response(self, url, query_params, step, request, session, **kwargs):
        prepared = request.prepare()
        prepared.prepare_url(url, query_params)

        if 'method' in kwargs:
            prepared.prepare_method(kwargs.get('method'))
        if 'auth' in kwargs:
            self.logger.info('Preparing AUTH')
            prepared.prepare_auth(kwargs.get('auth'), url)
        if 'post_data' in kwargs:
            prepared.prepare_body(kwargs.get('post_data'), None)
        try:
            response = session.send(prepared)
            response.raise_for_status()
            if kwargs.get('parse_qs', False):
                temp = parse_qs(response.content)
                response_json = {}
                for k, v in temp.items():
                    if isinstance(k, bytes):
                        k = k.decode()
                    if isinstance(v, (list, tuple)):
                        t = []
                        if len(v) == 1:
                            v = v[0]
                        else:
                            for i in v:
                                if isinstance(i, bytes):
                                    i = i.decode()
                                t.append(i)
                            v = t
                    if isinstance(v, bytes):
                        v = v.decode()
                    response_json[k] = v
            else:
                try:
                    response_json = response.json()
                except ValueError as e:
                    self.logger.error('{}: Unable to parse response - {}: "{}"'.format(step, e.args[0], response.text))
                    raise HandleErrorException(error=step, error_description='Unable to parse response - {}'.format(e.args[0]))
        except HTTPError as e:
            self.logger.exception('{}: {}'.format(step, e))
            raise HandleErrorException(error=step, error_description='Unable to contact with {}'.format(self.social_type))
        return response_json

    def handle_error(self, request, **context):
        self.logger.error('Handling ERROR for social: {}'.format(context))
        return render(request, 'oidc_social/error.html', context=context, status=HTTP_400_BAD_REQUEST)

    def handle(self, request, valve):
        social_type = valve.get('social_type', 'unknown')
        self.logger.warn('Unknown social handler for valve: "{}"'.format(social_type))
        return self.handle_error(request, error='unknown_handler', error_description='Unknown handler for social type: {}'.format(social_type))


def get_social_token_session_key():
    return 'oidc:social:token'
