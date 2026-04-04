from urllib.parse import urlparse, parse_qs

from aws_rest_default.views import DefaultLogAdapterViewMixing
from django.contrib.auth import get_user_model
from django.contrib.auth.views import LoginView
from django.views.generic.base import View
from oidc_provider import settings as oidc_provider_settings
from oidc_provider.lib.endpoints.token import TokenEndpoint
from oidc_provider.lib.errors import TokenError, UserAuthError
from oidc_provider.lib.utils.token import create_id_token, encode_id_token
from oidc_provider.models import Client

from oidc.models import ExternalClientGrantTypeConfiguration


class CustomClientLoginView(DefaultLogAdapterViewMixing, LoginView):
    redirect_authenticated_user = True
    template_name = 'oidc/login/default.html'
    customized_template_name = None
    customized_template_pattern = 'oidc/login/{}.html'

    def _extract_client_id_from_context(self, context):
        client_id = None
        if 'next' in context:
            qs = parse_qs(urlparse(context['next']).query)
            if 'client_id' in qs:
                client_id = qs['client_id']
                if not isinstance(client_id, str):
                    client_id = client_id[0]
                self.logger.info('Found "client_id" in "next" param: ' + client_id)
        return client_id

    def get_context_data(self, **kwargs):
        result = super().get_context_data(**kwargs)
        client_id = self._extract_client_id_from_context(result)
        if client_id:
            self.customized_template_name = self.customized_template_pattern.format(client_id)
            result['client_id'] = client_id
        return result

    def get_template_names(self):
        if self.customized_template_name is None:
            self.logger.info('Using standard template list for login')
            return [self.template_name]
        self.logger.info('Using EXTENDED template list for login: ' + self.customized_template_name)
        return [self.customized_template_name, self.template_name]


class TokenEndpointWithExternalClientGrant(DefaultLogAdapterViewMixing, TokenEndpoint):
    """
    Class extends standard TokenEndpoint from OIDC until source will be rewritten into plugin-enabled version.
    """

    def __init__(self, request):
        """
        Master class does not create `client` for it self. Fixing it here.
        :param request:
        """
        super().__init__(request)
        self.client = None

    def validate_client_and_client_type(self):
        """
        Method check if secret is ok for confidential client.
        """
        self.client = Client.objects.filter(client_id=self.params.get('client_id', 'unknown')).first()
        if self.client is None:
            raise TokenError('invalid_client')

        if self.client.client_type == 'confidential':
            if not (self.client.client_secret == self.params.get('client_secret')):
                raise TokenError('invalid_client')

    def validate_params(self):
        """
        Method verifies client and params needed by grant type.
        """
        self.validate_client_and_client_type()
        if self.params['grant_type'] == 'external_client':
            self._extract_params_external_client()
            self._validate_external_client()
        else:
            super().validate_params()

    def create_response_dic(self):
        """
        Method create dictionary which will be returned as JSON
        :return: return dictionary
        :rtype: dict
        """
        if self.params['grant_type'] == 'external_client':
            return self._create_response_dic_external_client()
        else:
            return super().create_response_dic()

    def _extract_params_external_client(self):
        """
        Adding params needed by `external_client`
        """
        self.params['for_client_id'] = self.request.POST.get('for_client_id', '')
        self.params['user_email'] = self.request.POST.get('user_email', '')
        self.params['user_sub'] = self.request.POST.get('user_sub', '')

    def _validate_external_client(self):
        """
        Method checks if OIDC client can generate token for another partner and if user exists
        """
        self._validate_external_client_for_client()
        self._validate_external_client_permissions()
        self._validate_external_client_user()

    def _validate_external_client_permissions(self):
        """
        Method checks if OIDC client can generate token for another partner
        """
        configuration = ExternalClientGrantTypeConfiguration.objects.filter(
            source_client__client_id=self.params.get('client_id', 'unknown'),
            for_client__client_id=self.params.get('for_client_id', 'unknown'),
        ).first()
        if configuration is None:
            raise TokenError('unsupported_grant_type')
        self.params['external_client_permissions'] = list((x.name for x in configuration.get_permissions()))

        if not self.params['external_client_permissions']:
            raise TokenError('invalid_grant')

    def _validate_external_client_user(self):
        """
        Method checks if user exists in the system by comparing SUB or trying to find email
        """
        user_model = get_user_model()
        user_data = self.params['user_sub'] or self.params['user_email']  # because SUB is more important

        if not user_data:
            raise TokenError('invalid_grant')

        if self.params['user_sub']:
            user = user_model.objects.filter(sub=user_data).first()
        else:
            user = user_model.objects.filter(emails__email=user_data, emails__is_verified=True).first()

        if user is None:
            raise TokenError('invalid_grant')

        self.user = user

    def _validate_external_client_for_client(self):
        """
        Checks if target client exists
        """
        for_client = Client.objects.filter(client_id=self.params.get('for_client_id', 'unknown')).first()
        if for_client is None:
            raise TokenError('invalid_grant')
        self.params['for_client'] = for_client

    def _create_response_dic_external_client(self):
        """
        :return: returns minimalistic id_token with permissions from configuration
        :rtype: dict
        """
        id_token = create_id_token(self.user, self.params['for_client_id'], scope=['openid', 'email'])
        id_token['extra'] = {'forced_permissions': self.params['external_client_permissions']}

        processing_hook = oidc_provider_settings.get('OIDC_IDTOKEN_PROCESSING_HOOK')

        if isinstance(processing_hook, str):
            processing_hook = [processing_hook]
        for hook in processing_hook:
            id_token = oidc_provider_settings.import_from_str(hook)(id_token, user=self.user)
        return {
            'id_token': encode_id_token(id_token, self.params['for_client'])
        }


class TokenView(DefaultLogAdapterViewMixing, View):
    token_endpoint_class = TokenEndpointWithExternalClientGrant

    def get_token_endpoint_class(self):
        return self.token_endpoint_class

    def post(self, request, *args, **kwargs):
        token_class = self.get_token_endpoint_class()
        token = token_class(request)

        try:
            token.validate_params()

            dic = token.create_response_dic()

            return token_class.response(dic)

        except TokenError as error:
            return token_class.response(error.create_dict(), status=400)
        except UserAuthError as error:
            return token_class.response(error.create_dict(), status=403)
