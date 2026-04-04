from aws_rest_default.handlers import jwt_get_originator_from_payload_handler
from aws_rest_default.permissions import TokenHasScope
from aws_rest_default.views import DefaultJsonRestViewMixing
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from django.http.response import Http404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
import re
from . import serializers, paginators, models


# Create your views here.

class CurrentBalanceView(DefaultJsonRestViewMixing, generics.RetrieveAPIView):
    serializer_class = serializers.CurrentBalanceSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:current_balance:read',)

    def get_object(self):
        return self.request.user.wallets.get(_is_default=True)


class CurrentBalanceForUserView(DefaultJsonRestViewMixing, generics.RetrieveAPIView):
    serializer_class = serializers.CurrentBalanceSerializer
    user_serializer_class = serializers.CreateWalletForUser
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:current_balance:for_user:read',)
    queryset = models.Wallet.objects.all()
    lookup_field = 'user__username'
    lookup_url_kwarg = 'username'

    def get_user_serializer(self, *args, **kwargs):
        serializer_class = self.user_serializer_class
        kwargs['context'] = self.get_serializer_context()
        return serializer_class(*args, **kwargs)

    def get_originator(self):
        payload = self.request.auth
        originator = jwt_get_originator_from_payload_handler(payload)
        return originator

    def get_username(self):
        return self.kwargs.get(self.lookup_url_kwarg)

    def create_user(self):
        serializer = self.get_user_serializer(data={
            'username': self.get_username(),
            'originator': self.get_originator()
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return serializer.instance

    def get_object(self):
        try:
            self.logger.info('Locating user')
            return super().get_object()
        except Http404:
            self.logger.info('Main user not found. Will be created')
        return self.create_user()


class CurrentBalanceForUserFromCompanyView(CurrentBalanceForUserView):
    required_scopes = ('wallet:current_balance:for_user:from_company:read',)
    company_url_kwarg = 'company_id'

    def get_originator(self):
        return self.kwargs.get(self.company_url_kwarg)


class WalletView(DefaultJsonRestViewMixing, generics.RetrieveUpdateAPIView):
    serializer_class = serializers.WalletSerializer
    required_scopes = ('wallet:details',)
    http_method_names = ['get', 'options', 'patch']
    lookup_field = 'pk'
    lookup_url_kwarg = 'wallet'

    def get_queryset(self):
        return models.Wallet.objects.filter(user=self.request.user)


class WalletsListView(DefaultJsonRestViewMixing, generics.ListAPIView):
    serializer_class = serializers.WalletSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:wallets:read',)

    def get_queryset(self):
        return models.Wallet.objects.filter(user=self.request.user)


class WalletLineListView(DefaultJsonRestViewMixing, generics.ListAPIView):
    serializer_class = serializers.WalletLineSerializer
    permission_classes = [TokenHasScope]
    pagination_class = paginators.WalletLinesListPagination
    required_scopes = ('wallet:lines:read',)
    lookup_field = 'wallet'
    lookup_url_kwarg = 'wallet'

    def get_queryset(self):
        return models.WalletLine.objects.filter(wallet__user=self.request.user)

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        return qs.filter(**{self.lookup_field: self.kwargs[self.lookup_url_kwarg]}).order_by('-operation_date')


class IgnoreOnDuplicateMixing(object):
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except serializers.IgnoreTransactionAlreadyExistsException:
            self.logger.warning('Duplication found. Ignoring error for duplication as requested.')
            return Response(data=dict(), status=status.HTTP_200_OK)


class CreateWalletLine(DefaultJsonRestViewMixing, IgnoreOnDuplicateMixing, generics.CreateAPIView):
    """
    Action is being used to add user some points.

        :permissions:  wallet:line:write

    """
    serializer_class = serializers.CreateWalletLineSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:line:write',)
    http_method_names = ('post', 'options')


class CreateWalletLineFromCompany(CreateWalletLine):
    """
    Action is being used to add user some points in a field of company

        :permissions:  wallet:line:write

    """
    serializer_class = serializers.CreateWalletLineFromCompanySerializer
    required_scopes = ('wallet:line:from_company:write',)


class CreateWalletLineFromCompanyWithCommissionCalculation(CreateWalletLine):
    """
    Action is being used to add user some points in a field of company without commission calculation

        :permissions:  wallet:line:write

    """
    serializer_class = serializers.CreateWalletLineFromCompanyWithoutCommissionSerializer
    required_scopes = ('wallet:line:from_company:write',)


class CreateBprWalletLine(DefaultJsonRestViewMixing, IgnoreOnDuplicateMixing, generics.CreateAPIView):
    """
    Action is being used when user buy something.

        :permissions:  wallet:line:bpr:write

    """
    serializer_class = serializers.CreateBprWalletLineSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:line:bpr:write',)
    http_method_names = ('post', 'options')


class CreateBprWalletLineFromCompany(CreateBprWalletLine):
    # serializer_class = serializers.CreateBprWalletLineFromCompanySerializer
    serializer_class = serializers.CreateBprWalletLineFromCompanyWithoutCommissionSerializer


class CreateSilentBprWalletLine(DefaultJsonRestViewMixing, generics.CreateAPIView):
    """
    Action is being used when user buy something.

        :permissions:  wallet:line:bpr:silent:write

    """
    serializer_class = serializers.SilentChargeSerializer
    response_serializer_class = serializers.SilentChargeResponseSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:line:bpr:silent:write',)
    http_method_names = ('post', 'options')

    def get_status_code(self, data):
        if 'error' in data.get('status', 'unknown').lower():
            return status.HTTP_400_BAD_REQUEST
        return status.HTTP_201_CREATED

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid(raise_exception=False):
            data = {
                'status': 'error',
                'errors': serializer.errors
            }
        else:
            data = serializer.save()
        response_serializer = self.response_serializer_class(data=data)
        response_serializer.is_valid(False)

        status_code = self.get_status_code(response_serializer.data)

        return Response(response_serializer.data, status=status_code)


class SilentChargeTokenChanelPaymentsList(DefaultJsonRestViewMixing, generics.ListAPIView):
    created_at_re = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    serializer_class = serializers.SilentChargeTokenChanelPaymentsSerializer
    permission_classes = [TokenHasScope]
    required_scopes = ('wallet:line:bpr:silent:list:read',)
    http_method_names = ('get', 'options')
    queryset = models.SilentChargeTokenChaneyPaymentsModel.objects.values(
        'created_at',
        'wallet_line__wallet__user__username',
        'channel',
        'wallet_line__partner__username',
        'wallet_line__operation_uuid',
        'wallet_line__src_transaction_id',
        'wallet_line__src_title',
        'wallet_line__amount',
        'external_user_id',
    )

    def get_queryset(self):
        ca = self.request.query_params.get('created_at')

        if ca is None or not self.created_at_re.match(ca.strip()):
            ca = datetime.today().date()
        else:
            ca = date(*map(int, ca.strip().split('-')))
        self.logger.info(ca)
        return self.queryset.filter(created_at__gte=ca, created_at__lt=ca+relativedelta(days=1))
