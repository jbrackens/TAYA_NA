from .common import SocialResponseHandler


class OAuth1ResponseHandler(SocialResponseHandler):
    access_token_uri = None
    profile_uri = None

    def _exchange_code_for_access_token(self, verifier):
        raise NotImplementedError()

    def _get_profile(self, access_token):
        raise NotImplementedError()

    def handle(self, request, valve):
        super().handle(request, valve)

        access_token = self._exchange_code_for_access_token(self.code)
        profile = self._get_profile(access_token)

        return profile

    def _extract_parameters(self, request, valve):
        self.code = request.GET.get('oauth_verifier')
        self.client_id = valve.get('client_id')
        self.social_credentials = self.get_social_client(self.client_id)
        self.valve = valve
        self.request = request
        self.resource_owner_key = valve.get('request_params', {}).get('oauth_token')
        self.resource_owner_secret = valve.get('request_params', {}).get('oauth_token_secret')
