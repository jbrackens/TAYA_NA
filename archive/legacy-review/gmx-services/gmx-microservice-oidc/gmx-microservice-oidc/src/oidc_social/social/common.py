import requests

from oidc_social.utils import HandleErrorException, SimpleResponseHandler


class SocialResponseHandler(SimpleResponseHandler):
    social_request = None
    social_session = requests.Session()
    social_token = None

    def _prepare_and_validate_response(self, url, query_params, step, **kwargs):
        return super()._prepare_and_validate_response(url, query_params, step, self.social_request, self.social_session, **kwargs)

    def _extract_parameters(self, request, valve):
        code = request.GET.get('code')
        if code is None or not code:
            self.logger.warn('Missing CODE in response for valve: {}'.format(valve))
            raise HandleErrorException(error='missing_code', error_description='Missing CODE parameter')

        self.client_id = valve.get('client_id')
        self.social_credentials = self.get_social_client(self.client_id)
        self.valve = valve
        self.request = request
        self.code = code

    def handle(self, request, valve):
        self._extract_parameters(request, valve)
        return None
