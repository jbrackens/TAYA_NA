import requests
import os
import time
import base64


class RmxAPI:
    def __init__(self, *args, **kwargs):
        self.url = os.environ.get('RMX_URL')
        self.client_id = os.environ.get('RMX_CLIENT_ID')
        self.client_password = os.environ.get('RMX_CLIENT_PASSWORD')
        self.oidc_username = os.environ.get('RMX_OIDC_USERNAME')
        self.oidc_password = os.environ.get('RMX_OIDC_PASSWORD')
        self.auth_token = b'Basic ' + base64.b64encode(
            '{}:{}'.format(os.environ.get('RMX_CLIENT_ID'), os.environ.get('RMX_CLIENT_PASSWORD')).encode("utf-8")
        )

    def __auth(self, *args, **kwargs):
        response = requests.post(
            self.url + '/openid/token',
            headers={
                'Authorization': self.auth_token,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data={
                'grant_type': 'password',
                'username': self.oidc_username,
                'password': self.oidc_password
            }
        )

        if response.status_code != 200:
            raise Exception('ERROR: Failed to reach RMX server')

        self.auth_response = response.json()

    def topup(self, payload, *args, **kwargs):
        self.__auth()

        return requests.post(
            self.url + '/pc/user_activity_top_up/bundle',
            headers={
                'Authorization': '{} {}'.format(self.auth_response.get('token_type'), self.auth_response.get('id_token')),
                'Content-Type': 'application/json; charset=utf-8'
            },
            json={'data': payload} if isinstance(payload, list) else payload
        )

    def get_or_create_users(self, payload, *args, **kwargs):
        self.__auth()

        return requests.post(
            self.url + '/oidc/get_or_create_ext_user/bulk/',
            headers={
                'Authorization': '{} {}'.format(self.auth_response.get('token_type'), self.auth_response.get('id_token')),
                'Content-Type': 'application/json; charset=utf-8',
            },
            json={'data': payload} if isinstance(payload, list) else payload,
        )

    def get_or_create_user(self, payload, *args, **kwargs):
        self.__auth()

        return requests.post(
            self.url + '/oidc/get_or_create_ext_user/',
            headers={
                'Authorization': '{} {}'.format(self.auth_response.get('token_type'), self.auth_response.get('id_token')),
                'Content-Type': 'application/json; charset=utf-8',
            },
            json={'data': payload} if isinstance(payload, list) else payload,
        )

    def buy_product(self, payload, *args, **kwargs):
        self.__auth()

        return requests.post(
            self.url + '/wallet/bpr/create/',
            headers={
                'Authorization': '{} {}'.format(self.auth_response.get('token_type'), self.auth_response.get('id_token')),
                'Content-Type': 'application/json; charset=utf-8',
            },
            json={'data': payload} if isinstance(payload, list) else payload,
        )

    def send(self, *args, **kwargs):
        tries = 3
        func = getattr(self, kwargs.get('api_method'))
        retry = kwargs.get('retry', True)

        while True:
            response = func(payload=kwargs.get('payload'))

            if retry is False or response.status_code == kwargs.get('expected_status_code'):
                return response.json()
            elif tries <= 0:
                raise RuntimeError('ERROR: Tried maximum number of times. Hard exit.')
            else:
                print('Endpoint responded with status code: {}. Retries left: {}'.format(response.status_code, tries))
                print('ERROR: Failed executing function {}. {}'.format(kwargs.get('api_method'), response.text))
                tries -= 1
                time.sleep(30)
